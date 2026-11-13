// Simula /api/inventory de Backend 2 (existencias, kardex, movimientos, conteos y ajustes) con datos en memoria.
// Responde EXACTO como el servidor (inglés, snake_case, { ok, ... }); los errores se lanzan con
// errorHttp(estado, mensaje). La traducción al español está en ../traductores.js.
import { errorHttp } from '../cliente.js'
import { esperar } from './esperar.js'
import { productos } from './productos.js'
import { tienePermiso, usuarioActual } from './sesion.js'

// ---------- Datos iniciales ----------

const INICIO = '2026-11-01T12:00:00.000Z'

// warehouse_stock: una fila por bodega + producto + lote ('' = sin lote)
const existencias = []
// kardex_movements: cada cambio de existencias, con el saldo antes y después
const kardex = []
// inventory_operations: cada movimiento registrado (receive, issue, transfer, return)
const operaciones = []
// stock_counts y stock_adjustments
const conteos = []
const ajustes = []

const ids = { existencia: 1, kardex: 1, operacion: 1, conteo: 1, partida: 1, ajuste: 1 }

function agregarExistencia(datos) {
  const fila = {
    id: ids.existencia++,
    business_id: 1,
    branch_id: datos.warehouse_id === 1 ? 1 : 2,
    warehouse_id: datos.warehouse_id,
    product_id: datos.product_id,
    lot_number: datos.lot_number ?? '',
    physical_qty: 0,
    reserved_qty: 0,
    quarantine_qty: 0,
    min_stock: 0,
    max_stock: 0,
    aisle: null,
    rack: null,
    bin_location: null,
    average_cost: 0,
    created_at: INICIO,
    updated_at: INICIO,
    ...datos,
  }
  existencias.push(fila)
  return fila
}

function agregarKardex(datos) {
  const fila = {
    id: ids.kardex++,
    business_id: 1,
    lot_number: '',
    operation_id: null,
    unit_cost: 0,
    average_cost: 0,
    reference_doc: null,
    user_id: 1,
    created_at: new Date().toISOString(),
    ...datos,
  }
  kardex.push(fila)
  return fila
}

// Almacén principal (1): todos los productos. Bodega norte (2): los primeros 8.
productos.forEach((p, i) => {
  const fisico = (i * 17) % 60
  agregarExistencia({
    warehouse_id: 1,
    product_id: p.id,
    physical_qty: fisico,
    reserved_qty: i % 5 === 0 ? Math.min(2, fisico) : 0,
    min_stock: 10,
    max_stock: 80,
    aisle: String((i % 4) + 1),
    rack: 'ABCD'[i % 4],
    bin_location: String((i % 6) + 1),
    average_cost: p.cost_price,
  })
  if (i < 8) {
    agregarExistencia({
      warehouse_id: 2,
      product_id: p.id,
      physical_qty: (i * 5) % 20,
      min_stock: 5,
      max_stock: 30,
      aisle: '1',
      rack: 'A',
      bin_location: String(i + 1),
      average_cost: p.cost_price,
    })
  }
})

// Saldo inicial en el kardex de cada fila con existencias
for (const fila of existencias) {
  if (fila.physical_qty > 0) {
    agregarKardex({
      warehouse_id: fila.warehouse_id,
      product_id: fila.product_id,
      movement_type: 'receive',
      qty: fila.physical_qty,
      initial_qty: 0,
      resulting_qty: fila.physical_qty,
      unit_cost: fila.average_cost,
      average_cost: fila.average_cost,
      reference_doc: 'Inventario inicial',
      created_at: INICIO,
    })
  }
}

// ---------- Ayudas ----------

function exigirPermiso(permiso) {
  if (!tienePermiso(permiso)) throw errorHttp(403, `Acceso denegado: Se requiere el permiso '${permiso}'.`)
}

function puedeVerCostos() {
  return tienePermiso('costs.read')
}

// Quita los campos de costo si no se tiene costs.read (como protectMovementCosts del servidor)
function sinCostos(fila) {
  const copia = { ...fila }
  delete copia.request_hash
  if (!puedeVerCostos()) {
    delete copia.unit_cost
    delete copia.average_cost
  }
  return copia
}

function paginar(lista, page, limit) {
  const pagina = Number(page)
  const porPagina = Number(limit)
  if (!(pagina >= 1) || !(porPagina >= 1 && porPagina <= 100)) throw errorHttp(400, 'Parametros de consulta invalidos')
  const inicio = (pagina - 1) * porPagina
  return {
    data: lista.slice(inicio, inicio + porPagina),
    pagination: {
      page: pagina,
      limit: porPagina,
      total: lista.length,
      totalPages: Math.ceil(lista.length / porPagina),
    },
  }
}

// Cantidad positiva (o cero si se permite) con máximo dos decimales, como decimalAmount del servidor
function esCantidad(valor, { permitirCero = false } = {}) {
  const n = Number(valor)
  if (!Number.isFinite(n)) return false
  if (Math.abs(n * 100 - Math.round(n * 100)) > 1e-8) return false
  return permitirCero ? n >= 0 : n > 0
}

function esIdValido(valor) {
  return Number.isInteger(Number(valor)) && Number(valor) > 0
}

function filaDeExistencia(bodegaId, productoId, lote) {
  return existencias.find(
    (e) => e.warehouse_id === bodegaId && e.product_id === productoId && e.lot_number === (lote || ''),
  )
}

// Estado calculado igual que calculateStockState del servidor
function estadoDeStock(fila) {
  const fisico = Number(fila.physical_qty)
  if (fisico <= 0) return { state: 'Agotado', alert: 'roja' }
  if (fisico <= Number(fila.min_stock)) return { state: 'Stock Bajo', alert: 'amarilla' }
  return { state: 'Optimo', alert: 'verde' }
}

// ---------- Existencias ----------

// GET /api/inventory/stock?warehouse_id=&product_id=&state=optimo|bajo|agotado|todos&search=&page=&limit=
export async function listarExistencias({
  warehouse_id,
  product_id,
  state = 'todos',
  search,
  page = 1,
  limit = 20,
} = {}) {
  exigirPermiso('stock.read')
  const texto = (search ?? '').trim().toLowerCase()
  const estadoBuscado = { optimo: 'Optimo', bajo: 'Stock Bajo', agotado: 'Agotado' }[state]

  const filas = existencias
    .filter((e) => !warehouse_id || e.warehouse_id === Number(warehouse_id))
    .filter((e) => !product_id || e.product_id === Number(product_id))
    .map((e) => {
      const producto = productos.find((p) => p.id === e.product_id)
      const { state: estado, alert } = estadoDeStock(e)
      return {
        ...e,
        product_name: producto.name,
        product_sku: producto.sku,
        product_barcode: producto.barcode,
        product_unit: producto.unit,
        available_qty: Number(e.physical_qty) - Number(e.reserved_qty),
        stock_state: estado,
        alert_level: alert,
      }
    })
    .filter(
      (e) =>
        !texto ||
        e.product_name.toLowerCase().includes(texto) ||
        e.product_sku.toLowerCase().includes(texto) ||
        (e.product_barcode ?? '').toLowerCase().includes(texto),
    )
    .filter((e) => !estadoBuscado || e.stock_state === estadoBuscado)
    .sort((a, b) => b.id - a.id)

  const resultado = paginar(filas, page, limit)
  if (!puedeVerCostos()) {
    resultado.data = resultado.data.map((fila) => {
      const copia = { ...fila }
      delete copia.average_cost
      return copia
    })
  }
  return esperar({ ok: true, ...resultado })
}

// POST /api/inventory/levels  { product_id, warehouse_id, min_stock, max_stock, aisle, rack, bin_location }
// Backend 2 pide stock.read para esto; la UI pide products.update (R7 es solo lectura). Pendiente alinear.
export async function guardarNiveles(cuerpo) {
  exigirPermiso('stock.read')
  const { product_id, warehouse_id = 1, min_stock, max_stock, aisle, rack, bin_location } = cuerpo
  if (!esIdValido(product_id)) throw errorHttp(400, 'Datos invalidos para niveles de stock')
  for (const valor of [min_stock, max_stock]) {
    if (valor !== undefined && !esCantidad(valor, { permitirCero: true })) {
      throw errorHttp(400, 'Datos invalidos para niveles de stock')
    }
  }
  if (!productos.some((p) => p.id === Number(product_id))) {
    throw errorHttp(404, 'El producto no existe o no pertenece a este negocio')
  }

  const fila =
    filaDeExistencia(Number(warehouse_id), Number(product_id), '') ??
    agregarExistencia({ warehouse_id: Number(warehouse_id), product_id: Number(product_id) })
  const minimo = min_stock !== undefined ? Number(min_stock) : fila.min_stock
  const maximo = max_stock !== undefined ? Number(max_stock) : fila.max_stock
  if (maximo > 0 && maximo < minimo) throw errorHttp(400, 'El stock máximo debe ser mayor o igual al stock mínimo')

  Object.assign(fila, {
    min_stock: minimo,
    max_stock: maximo,
    aisle: aisle !== undefined ? aisle : fila.aisle,
    rack: rack !== undefined ? rack : fila.rack,
    bin_location: bin_location !== undefined ? bin_location : fila.bin_location,
    updated_at: new Date().toISOString(),
  })
  const data = { ...fila }
  if (!puedeVerCostos()) delete data.average_cost
  return esperar({ ok: true, message: 'Niveles de stock y ubicacion configurados con exito', data })
}

// ---------- Kardex ----------

// GET /api/inventory/kardex/:productId?warehouse_id=  (sin paginar, del más viejo al más nuevo)
export async function verKardex(productId, { warehouse_id } = {}) {
  exigirPermiso('stock.read')
  if (!esIdValido(productId)) throw errorHttp(400, 'El ID de producto debe ser un entero positivo')
  const movimientos = kardex
    .filter((k) => k.product_id === Number(productId))
    .filter((k) => !warehouse_id || k.warehouse_id === Number(warehouse_id))
    .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id - b.id)
    .map((k) => {
      const operacion = operaciones.find((o) => o.id === k.operation_id)
      return sinCostos({
        ...k,
        operation_status: operacion?.status ?? null,
        source_warehouse_id: operacion?.source_warehouse_id ?? null,
        destination_warehouse_id: operacion?.destination_warehouse_id ?? null,
        return_direction: operacion?.return_direction ?? null,
        disposition: operacion?.disposition ?? null,
      })
    })
  return esperar({
    ok: true,
    product_id: Number(productId),
    total_movements: movimientos.length,
    movements: movimientos,
  })
}

// ---------- Movimientos ----------

// Mueve las existencias de una bodega y deja el renglón en el kardex (como record() del servidor)
function aplicar(operacion, bodegaId, tipoKardex, usuarioId) {
  const fila =
    filaDeExistencia(bodegaId, operacion.product_id, operacion.lot_number) ??
    agregarExistencia({ warehouse_id: bodegaId, product_id: operacion.product_id, lot_number: operacion.lot_number })
  const antes = Number(fila.physical_qty)
  const cantidad = Number(operacion.qty)
  const entra = ['receive', 'return_in', 'transfer_in'].includes(tipoKardex)
  const despues = antes + (entra ? cantidad : -cantidad)

  if (despues < 0) throw errorHttp(409, 'No hay existencias disponibles suficientes para realizar este movimiento')
  if (!entra && antes - Number(fila.reserved_qty) < cantidad) {
    throw errorHttp(409, 'La cantidad solicitada supera el stock disponible')
  }

  const costo = tipoKardex === 'transfer_out' ? Number(fila.average_cost) : Number(operacion.unit_cost)
  if (tipoKardex === 'transfer_out') operacion.unit_cost = costo
  const promedio =
    entra && despues > 0 ? (antes * Number(fila.average_cost) + cantidad * costo) / despues : Number(fila.average_cost)
  const aCuarentena = tipoKardex === 'return_in' && operacion.disposition === 'quarantine'

  Object.assign(fila, {
    physical_qty: despues,
    reserved_qty: fila.reserved_qty + (aCuarentena ? cantidad : 0),
    quarantine_qty: fila.quarantine_qty + (aCuarentena ? cantidad : 0),
    average_cost: Math.round(promedio * 100) / 100,
    updated_at: new Date().toISOString(),
  })

  const renglon = agregarKardex({
    warehouse_id: bodegaId,
    product_id: operacion.product_id,
    lot_number: operacion.lot_number,
    operation_id: operacion.id,
    movement_type: tipoKardex,
    qty: cantidad,
    initial_qty: antes,
    resulting_qty: despues,
    unit_cost: costo,
    average_cost: fila.average_cost,
    reference_doc: operacion.reference_doc,
    user_id: usuarioId,
  })
  return { id: renglon.id, initial_qty: antes, resulting_qty: despues }
}

// Permiso que pide cada tipo de movimiento, según los permisos del seed de Backend 1.
// Backend 2 pide stock.movement.create para todos; alinear (ese permiso no existe en Backend 1,
// así que con él ningún rol podría registrar movimientos).
const PERMISO_POR_TIPO = {
  receive: 'stock.receive',
  issue: 'stock.issue',
  transfer: 'stock.transfer',
  return: 'stock.receive',
}

function validarMovimiento(c) {
  const problema = (() => {
    if (!PERMISO_POR_TIPO[c.type]) return 'type'
    if (!esIdValido(c.warehouse_id)) return 'warehouse_id'
    if (!esIdValido(c.product_id)) return 'product_id'
    if (!esCantidad(c.qty)) return 'qty'
    if (c.unit_cost !== undefined && !esCantidad(c.unit_cost, { permitirCero: true })) return 'unit_cost'
    if (!c.idempotency_key || String(c.idempotency_key).length > 128) return 'idempotency_key'
    if (c.type === 'transfer' && !c.destination_warehouse_id) return 'destination_warehouse_id'
    if (c.type !== 'transfer' && c.destination_warehouse_id) return 'destination_warehouse_id'
    if (c.type === 'return' && !c.return_direction) return 'return_direction'
    if (c.type !== 'return' && (c.return_direction || c.disposition)) return 'return_direction'
    if (c.return_direction === 'supplier' && c.disposition) return 'disposition'
    return null
  })()
  if (problema) throw errorHttp(400, `Datos invalidos para el movimiento (${problema})`)
}

// POST /api/inventory/movements
// { type, warehouse_id, product_id, qty, unit_cost?, reference_doc?, lot_number?, destination_warehouse_id?,
//   return_direction?, disposition?, idempotency_key }
// Si llega la misma idempotency_key con los mismos datos, responde lo de la primera vez (duplicate: true)
// sin volver a mover el stock; con datos distintos, 409.
export async function registrarMovimiento(cuerpo) {
  if (PERMISO_POR_TIPO[cuerpo.type]) exigirPermiso(PERMISO_POR_TIPO[cuerpo.type])
  validarMovimiento(cuerpo)

  const huella = JSON.stringify(cuerpo)
  const repetida = operaciones.find((o) => o.idempotency_key === cuerpo.idempotency_key)
  if (repetida) {
    if (repetida.request_hash !== huella) {
      throw errorHttp(409, 'La clave de idempotencia ya se utilizó con datos diferentes')
    }
    return esperar({
      ok: true,
      operation: sinCostos(repetida),
      movements: kardex.filter((k) => k.operation_id === repetida.id).map(sinCostos),
      duplicate: true,
    })
  }

  const producto = productos.find((p) => p.id === Number(cuerpo.product_id) && p.status === 'active')
  if (!producto) throw errorHttp(404, 'El producto no existe o no pertenece a este negocio')
  if (Number(cuerpo.destination_warehouse_id) === Number(cuerpo.warehouse_id)) {
    throw errorHttp(400, 'El almacén de origen y destino deben ser distintos')
  }

  const esTransferencia = cuerpo.type === 'transfer'
  const ahora = new Date().toISOString()
  const operacion = {
    id: ids.operacion,
    business_id: 1,
    movement_type: cuerpo.type,
    status: esTransferencia ? 'in_transit' : 'completed',
    source_warehouse_id: Number(cuerpo.warehouse_id),
    destination_warehouse_id: esTransferencia ? Number(cuerpo.destination_warehouse_id) : null,
    product_id: Number(cuerpo.product_id),
    lot_number: cuerpo.lot_number || '',
    qty: Number(cuerpo.qty),
    unit_cost: Number(cuerpo.unit_cost ?? 0),
    reference_doc: cuerpo.reference_doc || null,
    return_direction: cuerpo.return_direction || null,
    disposition: cuerpo.disposition || null,
    idempotency_key: cuerpo.idempotency_key,
    request_hash: huella,
    actor_id: usuarioActual(),
    received_by: null,
    completed_at: esTransferencia ? null : ahora,
    created_at: ahora,
    updated_at: ahora,
  }

  const tipoKardex = {
    receive: 'receive',
    issue: 'issue',
    transfer: 'transfer_out',
    return: cuerpo.return_direction === 'customer' ? 'return_in' : 'return_out',
  }[cuerpo.type]
  // Si falla (sin stock), no se guarda la operación: como la transacción del servidor
  const movimiento = aplicar(operacion, operacion.source_warehouse_id, tipoKardex, usuarioActual())
  ids.operacion++
  operaciones.push(operacion)

  return esperar({ ok: true, operation: sinCostos(operacion), movements: [movimiento] })
}

// POST /api/inventory/movements/:id/receive (recibir una transferencia en la bodega destino)
export async function recibirTransferencia(id) {
  exigirPermiso(PERMISO_POR_TIPO.transfer)
  const operacion = operaciones.find((o) => o.id === Number(id) && o.movement_type === 'transfer')
  if (!operacion) throw errorHttp(404, 'Transferencia no encontrada')
  if (operacion.status === 'completed') {
    return esperar({
      ok: true,
      operation: sinCostos(operacion),
      movements: kardex.filter((k) => k.operation_id === operacion.id).map(sinCostos),
      duplicate: true,
    })
  }
  const movimiento = aplicar(operacion, operacion.destination_warehouse_id, 'transfer_in', usuarioActual())
  const ahora = new Date().toISOString()
  Object.assign(operacion, {
    status: 'completed',
    received_by: usuarioActual(),
    completed_at: ahora,
    updated_at: ahora,
  })
  return esperar({ ok: true, operation: sinCostos(operacion), movements: [movimiento] })
}

// GET /api/inventory/movements?type=&status=in_transit|completed&product_id=&page=&limit=
export async function listarMovimientos({ type, status, product_id, page = 1, limit = 20 } = {}) {
  exigirPermiso('stock.read')
  const lista = operaciones
    .filter((o) => (!type || o.movement_type === type) && (!status || o.status === status))
    .filter((o) => !product_id || o.product_id === Number(product_id))
    .sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id)
    .map((o) => {
      const copia = { ...o }
      delete copia.request_hash
      delete copia.idempotency_key
      if (!puedeVerCostos()) delete copia.unit_cost
      return copia
    })
  return esperar({ ok: true, ...paginar(lista, page, limit) })
}

// ---------- Conteo cíclico ----------

// POST /api/inventory/counts  { warehouse_id, notes } → sesión en estado in_progress
export async function abrirConteo({ warehouse_id = 1, notes = null } = {}) {
  exigirPermiso('stock.count')
  if (!esIdValido(warehouse_id)) throw errorHttp(400, 'Datos invalidos para la sesion de conteo')
  const ahora = new Date().toISOString()
  const sesion = {
    id: ids.conteo++,
    business_id: 1,
    warehouse_id: Number(warehouse_id),
    status: 'in_progress',
    notes,
    created_by: usuarioActual(),
    created_at: ahora,
    updated_at: ahora,
  }
  conteos.push(sesion)
  return esperar({ ok: true, message: 'Sesion de conteo ciclico iniciada', data: { ...sesion } })
}

// POST /api/inventory/counts/:id/items  { items: [{ product_id, lot_number?, counted_qty }] }
// Compara contra el sistema, crea un ajuste pendiente por cada diferencia y CIERRA la sesión
// (una sesión solo recibe un envío de partidas).
export async function registrarConteo(id, { items } = {}) {
  exigirPermiso('stock.count')
  if (!esIdValido(id)) throw errorHttp(400, 'El ID de la sesion de conteo debe ser un numero entero')
  const valido =
    Array.isArray(items) &&
    items.length > 0 &&
    items.every((i) => esIdValido(i.product_id) && esCantidad(i.counted_qty, { permitirCero: true }))
  if (!valido) throw errorHttp(400, 'Formato de conteo invalido')

  const sesion = conteos.find((c) => c.id === Number(id))
  if (!sesion) throw errorHttp(404, 'Sesion de conteo no encontrada')
  if (sesion.status !== 'in_progress') {
    throw errorHttp(409, 'Esta sesion de conteo ya se encuentra cerrada o completada')
  }

  const vistos = new Set()
  for (const item of items) {
    const llave = `${item.product_id}:${item.lot_number || ''}`
    if (vistos.has(llave)) {
      throw errorHttp(400, 'No se puede contar el mismo producto y lote más de una vez en una sesión')
    }
    vistos.add(llave)
    if (!productos.some((p) => p.id === Number(item.product_id))) {
      throw errorHttp(404, `El producto ${item.product_id} no existe o no pertenece a este negocio`)
    }
  }

  const partidas = items.map((item) => {
    const lote = item.lot_number || ''
    const fila = filaDeExistencia(sesion.warehouse_id, Number(item.product_id), lote)
    const sistema = fila ? Number(fila.physical_qty) : 0
    const contado = Number(item.counted_qty)
    const diferencia = contado - sistema
    let ajusteId = null
    if (diferencia !== 0) {
      ajusteId = crearAjuste({
        warehouse_id: sesion.warehouse_id,
        product_id: Number(item.product_id),
        lot_number: lote,
        adjustment_type: diferencia > 0 ? 'positive' : 'negative',
        qty: Math.abs(diferencia),
        reason: `Diferencia detectada en conteo cíclico #${sesion.id}`,
        requested_by: sesion.created_by,
      }).id
    }
    return {
      id: ids.partida++,
      product_id: Number(item.product_id),
      system_qty: sistema,
      counted_qty: contado,
      difference_qty: diferencia,
      adjustment_id: ajusteId,
    }
  })

  sesion.status = 'completed'
  sesion.updated_at = new Date().toISOString()
  return esperar({
    ok: true,
    message: 'Conteo registrado; las diferencias requieren aprobación antes de modificar el stock',
    data: { count_session_id: sesion.id, status: 'completed', items: partidas },
  })
}

// ---------- Ajustes ----------

function crearAjuste(datos) {
  const ahora = new Date().toISOString()
  const ajuste = {
    id: ids.ajuste++,
    business_id: 1,
    lot_number: '',
    evidence_url: null,
    status: 'pending',
    approved_by: null,
    created_at: ahora,
    updated_at: ahora,
    ...datos,
  }
  ajustes.push(ajuste)
  return ajuste
}

// POST /api/inventory/adjustments/request
// { warehouse_id, product_id, lot_number?, adjustment_type: positive|negative, qty, reason, evidence_url? }
export async function solicitarAjuste(cuerpo) {
  exigirPermiso('stock.adjust.request')
  const { warehouse_id = 1, product_id, lot_number, adjustment_type, qty, reason, evidence_url } = cuerpo
  const valido =
    esIdValido(warehouse_id) &&
    esIdValido(product_id) &&
    ['positive', 'negative'].includes(adjustment_type) &&
    esCantidad(qty)
  if (!valido) throw errorHttp(400, 'Datos invalidos en la solicitud de ajuste')
  if (!reason || reason.trim().length < 5) {
    throw errorHttp(400, 'El motivo del ajuste debe tener al menos 5 caracteres')
  }
  if (!productos.some((p) => p.id === Number(product_id))) {
    throw errorHttp(404, 'El producto no existe o no pertenece a este negocio')
  }
  const ajuste = crearAjuste({
    warehouse_id: Number(warehouse_id),
    product_id: Number(product_id),
    lot_number: lot_number || '',
    adjustment_type,
    qty: Number(qty),
    reason: reason.trim(),
    evidence_url: evidence_url || null,
    requested_by: usuarioActual(),
  })
  return esperar({
    ok: true,
    message: 'Solicitud de ajuste creada en estado pendiente de aprobacion',
    data: { ...ajuste },
  })
}

// GET /api/inventory/adjustments?status=pending|approved|rejected&warehouse_id=&product_id=&page=&limit=
export async function listarAjustes({ status = 'pending', warehouse_id, product_id, page = 1, limit = 20 } = {}) {
  exigirPermiso('stock.adjust.approve')
  const lista = ajustes
    .filter((a) => a.status === status)
    .filter((a) => !warehouse_id || a.warehouse_id === Number(warehouse_id))
    .filter((a) => !product_id || a.product_id === Number(product_id))
    .sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id)
    .map((a) => ({ ...a }))
  return esperar({ ok: true, ...paginar(lista, page, limit) })
}

// POST /api/inventory/adjustments/:id/approve. Quien lo solicitó no puede aprobarlo.
export async function aprobarAjuste(id) {
  exigirPermiso('stock.adjust.approve')
  const ajuste = ajustes.find((a) => a.id === Number(id))
  if (!ajuste) throw errorHttp(404, 'Solicitud de ajuste no encontrada')
  if (ajuste.status !== 'pending') throw errorHttp(409, 'El ajuste ya fue procesado con estatus: ' + ajuste.status)
  if (ajuste.requested_by === usuarioActual()) {
    throw errorHttp(403, 'La persona que solicita el ajuste no puede aprobarlo')
  }

  const fila =
    filaDeExistencia(ajuste.warehouse_id, ajuste.product_id, ajuste.lot_number) ??
    agregarExistencia({
      warehouse_id: ajuste.warehouse_id,
      product_id: ajuste.product_id,
      lot_number: ajuste.lot_number,
    })
  const antes = Number(fila.physical_qty)
  const positivo = ajuste.adjustment_type === 'positive'
  const despues = positivo ? antes + ajuste.qty : antes - ajuste.qty
  if (despues < 0) throw errorHttp(409, 'El ajuste negativo dejaría existencias en números negativos')
  if (!positivo && antes - Number(fila.reserved_qty) < ajuste.qty) {
    throw errorHttp(409, 'El ajuste negativo no puede reducir existencias reservadas')
  }

  fila.physical_qty = despues
  fila.updated_at = new Date().toISOString()
  agregarKardex({
    warehouse_id: ajuste.warehouse_id,
    product_id: ajuste.product_id,
    lot_number: ajuste.lot_number,
    movement_type: positivo ? 'adjustment_in' : 'adjustment_out',
    qty: ajuste.qty,
    initial_qty: antes,
    resulting_qty: despues,
    unit_cost: fila.average_cost,
    average_cost: fila.average_cost,
    reference_doc: `Ajuste ID ${ajuste.id}: ${ajuste.reason}`,
    user_id: usuarioActual(),
  })
  Object.assign(ajuste, { status: 'approved', approved_by: usuarioActual(), updated_at: new Date().toISOString() })

  return esperar({
    ok: true,
    message: 'Ajuste de inventario aprobado y aplicado al stock con exito',
    adjustment_id: ajuste.id,
    initial_qty: antes,
    resulting_qty: despues,
    status: 'approved',
  })
}
