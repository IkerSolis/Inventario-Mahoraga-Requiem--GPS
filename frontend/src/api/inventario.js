import { conParametros, json, pedir, usarMock } from './cliente.js'
import * as mock from './mock/inventario.js'
import {
  FILTRO_ESTADO_AJUSTE,
  FILTRO_ESTADO_OPERACION,
  FILTRO_ESTADO_STOCK,
  FILTRO_TIPO_MOVIMIENTO,
  aAjuste,
  aConteo,
  aKardex,
  aMovimiento,
  aOperacion,
  aPagina,
  aResultadoConteo,
  aStock,
  deAjuste,
  deMovimiento,
  deNiveles,
} from './traductores.js'

// Endpoints de inventario de Backend 2 (/api/inventory). Cada función pide al servidor (o al mock,
// que responde igual) y traduce la respuesta al español con traductores.js.
// Sin costs.read el servidor no manda costos (costoUnitario y costoPromedio quedan en null).

// ---------- Existencias (stock.read) ----------

// GET /api/inventory/stock?warehouse_id=&product_id=&state=&search=&page=&limit=
// estado: 'disponible' | 'bajo' | 'agotado' | '' (todos). Devuelve { elementos, total, paginas }.
export async function listarExistencias({ bodegaId, productoId, estado, busqueda, pagina = 1, porPagina = 20 } = {}) {
  const parametros = {
    warehouse_id: bodegaId,
    product_id: productoId,
    state: FILTRO_ESTADO_STOCK[estado] ?? 'todos',
    search: busqueda,
    page: pagina,
    limit: porPagina,
  }
  const respuesta = usarMock
    ? await mock.listarExistencias(parametros)
    : await pedir(conParametros('/inventory/stock', parametros))
  return aPagina(respuesta, aStock)
}

// Existencias de un producto en una bodega: físico y disponible sumando todos sus lotes,
// y la ubicación de la fila sin lote (si no hay, la primera). Todo en 0 / null si no tiene fila.
export async function existenciasDeProducto(productoId, bodegaId) {
  const { elementos } = await listarExistencias({ productoId, bodegaId, porPagina: 100 })
  const principal = elementos.find((fila) => !fila.lote) ?? elementos[0] ?? null
  return {
    fisico: elementos.reduce((total, fila) => total + fila.fisico, 0),
    disponible: elementos.reduce((total, fila) => total + fila.disponible, 0),
    pasillo: principal?.pasillo ?? null,
    rack: principal?.rack ?? null,
    gaveta: principal?.gaveta ?? null,
  }
}

// POST /api/inventory/levels: mínimo, máximo y ubicación (pasillo, rack, gaveta) de un producto en una bodega.
// La UI pide products.update para esto (R7 es solo lectura).
// Pendiente para Backend 2: hoy el servidor solo pide stock.read; debería pedir products.update.
export async function guardarNiveles(datos) {
  const cuerpo = deNiveles(datos)
  const respuesta = usarMock
    ? await mock.guardarNiveles(cuerpo)
    : await pedir('/inventory/levels', json('POST', cuerpo))
  return aStock(respuesta.data)
}

// ---------- Kardex (stock.read) ----------

// GET /api/inventory/kardex/:productId?warehouse_id= → renglones del más viejo al más nuevo (sin paginar)
export async function verKardex(productoId, bodegaId) {
  const respuesta = usarMock
    ? await mock.verKardex(productoId, { warehouse_id: bodegaId })
    : await pedir(conParametros(`/inventory/kardex/${productoId}`, { warehouse_id: bodegaId }))
  return respuesta.movements.map(aKardex)
}

// ---------- Movimientos ----------

// GET /api/inventory/movements?type=&status=&product_id=&page=&limit= (stock.read)
// tipo: 'entrada' | 'salida' | 'transferencia' | 'devolucion'; estado: 'enTransito' | 'completado'
export async function listarMovimientos({ tipo, estado, productoId, pagina = 1, porPagina = 20 } = {}) {
  const parametros = {
    type: FILTRO_TIPO_MOVIMIENTO[tipo],
    status: FILTRO_ESTADO_OPERACION[estado],
    product_id: productoId,
    page: pagina,
    limit: porPagina,
  }
  const respuesta = usarMock
    ? await mock.listarMovimientos(parametros)
    : await pedir(conParametros('/inventory/movements', parametros))
  return aPagina(respuesta, aOperacion)
}

// POST /api/inventory/movements
// datos: { tipo, bodegaId, productoId, cantidad, documento?, lote?, bodegaDestinoId? (transferencia),
//          costoUnitario?, clave }
// clave: idempotency_key, distinta por cada confirmación. Si la misma clave llega dos veces, el servidor
// responde lo de la primera vez (duplicado: true) sin mover el stock otra vez.
// Permisos que pregunta la UI: entrada → stock.receive, salida → stock.issue, transferencia → stock.transfer.
// Backend 2 pide stock.movement.create; alinear (ese permiso no existe en el seed de Backend 1).
// Devuelve { operacion, movimientos: [{ existenciasAntes, existenciasDespues, ... }], duplicado }.
export async function registrarMovimiento(datos) {
  const cuerpo = deMovimiento(datos)
  const respuesta = usarMock
    ? await mock.registrarMovimiento(cuerpo)
    : await pedir('/inventory/movements', json('POST', cuerpo))
  return aMovimiento(respuesta)
}

// POST /api/inventory/movements/:id/receive: recibe una transferencia en tránsito en la bodega destino
export async function recibirTransferencia(id) {
  const respuesta = usarMock
    ? await mock.recibirTransferencia(id)
    : await pedir(`/inventory/movements/${id}/receive`, { method: 'POST' })
  return aMovimiento(respuesta)
}

// ---------- Conteo cíclico (stock.count) ----------

// POST /api/inventory/counts → sesión de conteo abierta
export async function abrirConteo(bodegaId, notas = null) {
  const cuerpo = { warehouse_id: bodegaId, notes: notas }
  const respuesta = usarMock ? await mock.abrirConteo(cuerpo) : await pedir('/inventory/counts', json('POST', cuerpo))
  return aConteo(respuesta.data)
}

// POST /api/inventory/counts/:id/items. partidas: [{ productoId, contado, lote? }]
// El servidor compara contra el sistema, crea un ajuste pendiente por cada diferencia y CIERRA la sesión:
// cada sesión recibe un solo envío. Devuelve { conteoId, partidas: [{ productoId, sistema, contado, diferencia, ajusteId }] }
export async function registrarConteo(conteoId, partidas) {
  const cuerpo = {
    items: partidas.map((p) => ({ product_id: p.productoId, counted_qty: p.contado, lot_number: p.lote || undefined })),
  }
  const respuesta = usarMock
    ? await mock.registrarConteo(conteoId, cuerpo)
    : await pedir(`/inventory/counts/${conteoId}/items`, json('POST', cuerpo))
  return aResultadoConteo(respuesta.data)
}

// ---------- Ajustes ----------

// GET /api/inventory/adjustments?status=&warehouse_id=&product_id=&page=&limit= (stock.adjust.approve)
// estado: 'pendiente' | 'aprobado' | 'rechazado'
export async function listarAjustes({ estado = 'pendiente', bodegaId, productoId, pagina = 1, porPagina = 20 } = {}) {
  const parametros = {
    status: FILTRO_ESTADO_AJUSTE[estado],
    warehouse_id: bodegaId,
    product_id: productoId,
    page: pagina,
    limit: porPagina,
  }
  const respuesta = usarMock
    ? await mock.listarAjustes(parametros)
    : await pedir(conParametros('/inventory/adjustments', parametros))
  return aPagina(respuesta, aAjuste)
}

// POST /api/inventory/adjustments/request (stock.adjust.request)
// datos: { bodegaId, productoId, tipo: 'positivo' | 'negativo', cantidad, motivo (5+ caracteres), evidencia?, lote? }
export async function solicitarAjuste(datos) {
  const cuerpo = deAjuste(datos)
  const respuesta = usarMock
    ? await mock.solicitarAjuste(cuerpo)
    : await pedir('/inventory/adjustments/request', json('POST', cuerpo))
  return aAjuste(respuesta.data)
}

// POST /api/inventory/adjustments/:id/approve (stock.adjust.approve). Quien lo solicitó no puede aprobarlo (403).
// Devuelve { existenciasAntes, existenciasDespues }
export async function aprobarAjuste(id) {
  const respuesta = usarMock
    ? await mock.aprobarAjuste(id)
    : await pedir(`/inventory/adjustments/${id}/approve`, { method: 'POST' })
  return { existenciasAntes: Number(respuesta.initial_qty), existenciasDespues: Number(respuesta.resulting_qty) }
}
