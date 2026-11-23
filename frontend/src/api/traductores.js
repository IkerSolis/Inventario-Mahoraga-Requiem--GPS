// Traductores entre lo que manda el backend (inglés, snake_case) y lo que usa la UI (español, camelCase).
// Van entre la API (o el mock) y las páginas: si el backend cambia un nombre, solo se toca este archivo.
// Lo que no venga en la respuesta queda en null, y la UI lo muestra como "—".

// Algunos campos decimales llegan como texto (Postgres manda los DECIMAL así); null se queda null
function numero(valor) {
  if (valor === null || valor === undefined || valor === '') return null
  return Number(valor)
}

// ---------- Listas paginadas ----------

// { ok, data: [...], pagination: { page, limit, total, totalPages } } → { elementos, total, paginas }
export function aPagina(respuesta, traducir) {
  return {
    elementos: respuesta.data.map(traducir),
    total: respuesta.pagination.total,
    paginas: respuesta.pagination.totalPages,
  }
}

// ---------- Productos ----------

// Las existencias y el estado no vienen en /products: están por bodega en /inventory/stock.
export function aProducto(fila) {
  return {
    id: fila.id,
    sku: fila.sku,
    codigoBarras: fila.barcode ?? null,
    nombre: fila.name,
    descripcion: fila.description ?? '',
    categoriaId: fila.category_id ?? null,
    unidad: fila.unit,
    // Sin costs.read el servidor no manda cost_price
    precioCompra: numero(fila.cost_price),
    precioVenta: numero(fila.sale_price),
    imagen: fila.image_url ?? null,
    archivado: fila.status === 'archived',
    existencias: null,
    estadoStock: null,
  }
}

// Datos del formulario → cuerpo para POST/PUT /products. Solo manda los campos que vienen,
// así un PUT parcial no borra lo que el usuario no tocó (o no puede editar).
const CAMPOS_PRODUCTO = {
  sku: 'sku',
  codigoBarras: 'barcode',
  nombre: 'name',
  descripcion: 'description',
  categoriaId: 'category_id',
  unidad: 'unit',
  precioCompra: 'cost_price',
  precioVenta: 'sale_price',
}

export function deProducto(datos) {
  const cuerpo = {}
  for (const [campo, campoServidor] of Object.entries(CAMPOS_PRODUCTO)) {
    if (campo in datos) cuerpo[campoServidor] = datos[campo] === '' ? null : datos[campo]
  }
  return cuerpo
}

export function aCategoria(fila) {
  return { id: fila.id, nombre: fila.name, padreId: fila.parent_id ?? null, activa: fila.status === 'active' }
}

// ---------- Existencias ----------

// stock_state del servidor → clave de la UI (la misma que usa ESTADOS_STOCK en Productos)
export const ESTADO_STOCK = { Optimo: 'disponible', 'Stock Bajo': 'bajo', Agotado: 'agotado' }

// Y al revés, para el filtro ?state= de /inventory/stock
export const FILTRO_ESTADO_STOCK = { disponible: 'optimo', bajo: 'bajo', agotado: 'agotado' }

export function aStock(fila) {
  return {
    id: fila.id,
    bodegaId: fila.warehouse_id,
    productoId: fila.product_id,
    nombre: fila.product_name ?? null,
    sku: fila.product_sku ?? null,
    codigoBarras: fila.product_barcode ?? null,
    unidad: fila.product_unit ?? null,
    lote: fila.lot_number || null,
    fisico: numero(fila.physical_qty),
    reservado: numero(fila.reserved_qty),
    disponible: numero(fila.available_qty),
    minimo: numero(fila.min_stock),
    maximo: numero(fila.max_stock),
    pasillo: fila.aisle ?? null,
    rack: fila.rack ?? null,
    gaveta: fila.bin_location ?? null,
    estado: ESTADO_STOCK[fila.stock_state] ?? null,
    costoPromedio: numero(fila.average_cost),
  }
}

// Niveles y ubicación (Inventario > Existencias) → cuerpo de POST /inventory/levels
export function deNiveles({ productoId, bodegaId, minimo, maximo, pasillo, rack, gaveta }) {
  return {
    product_id: productoId,
    warehouse_id: bodegaId,
    min_stock: minimo,
    max_stock: maximo,
    aisle: pasillo,
    rack,
    bin_location: gaveta,
  }
}

// ---------- Movimientos y kardex ----------

// type de inventory_operations ↔ tipo de la UI
export const TIPO_MOVIMIENTO = { receive: 'entrada', issue: 'salida', transfer: 'transferencia', return: 'devolucion' }
// Y al revés, para el cuerpo del movimiento y el filtro ?type=
export const FILTRO_TIPO_MOVIMIENTO = Object.fromEntries(Object.entries(TIPO_MOVIMIENTO).map(([en, es]) => [es, en]))

// movement_type del kardex: además del tipo, dice si entró o salió de la bodega
export const TIPO_KARDEX = {
  receive: 'entrada',
  issue: 'salida',
  transfer_out: 'transferenciaSalida',
  transfer_in: 'transferenciaEntrada',
  return_in: 'devolucionEntrada',
  return_out: 'devolucionSalida',
  adjustment_in: 'ajusteEntrada',
  adjustment_out: 'ajusteSalida',
}

const ESTADO_OPERACION = { in_transit: 'enTransito', completed: 'completado' }
export const FILTRO_ESTADO_OPERACION = { enTransito: 'in_transit', completado: 'completed' }

// Datos del movimiento → cuerpo de POST /inventory/movements
export function deMovimiento({
  tipo,
  bodegaId,
  bodegaDestinoId,
  productoId,
  cantidad,
  costoUnitario,
  documento,
  lote,
  clave,
}) {
  const cuerpo = {
    type: FILTRO_TIPO_MOVIMIENTO[tipo],
    warehouse_id: bodegaId,
    product_id: productoId,
    qty: cantidad,
    idempotency_key: clave,
  }
  if (bodegaDestinoId) cuerpo.destination_warehouse_id = bodegaDestinoId
  if (costoUnitario != null) cuerpo.unit_cost = costoUnitario
  if (documento) cuerpo.reference_doc = documento
  if (lote) cuerpo.lot_number = lote
  return cuerpo
}

export function aOperacion(fila) {
  return {
    id: fila.id,
    tipo: TIPO_MOVIMIENTO[fila.movement_type] ?? fila.movement_type,
    estado: ESTADO_OPERACION[fila.status] ?? fila.status,
    bodegaId: fila.source_warehouse_id,
    bodegaDestinoId: fila.destination_warehouse_id ?? null,
    productoId: fila.product_id,
    lote: fila.lot_number || null,
    cantidad: numero(fila.qty),
    costoUnitario: numero(fila.unit_cost),
    documento: fila.reference_doc ?? null,
    devolucion: fila.return_direction ?? null, // customer | supplier
    destino: fila.disposition ?? null, // available | quarantine
    usuarioId: fila.actor_id ?? null,
    recibidoPor: fila.received_by ?? null,
    fecha: fila.created_at,
    completado: fila.completed_at ?? null,
  }
}

// Renglón del kardex. Al registrar un movimiento, el servidor solo manda { id, initial_qty, resulting_qty }.
export function aKardex(fila) {
  return {
    id: fila.id,
    tipo: TIPO_KARDEX[fila.movement_type] ?? fila.movement_type ?? null,
    bodegaId: fila.warehouse_id ?? null,
    productoId: fila.product_id ?? null,
    lote: fila.lot_number || null,
    cantidad: numero(fila.qty),
    existenciasAntes: numero(fila.initial_qty),
    existenciasDespues: numero(fila.resulting_qty),
    costoUnitario: numero(fila.unit_cost),
    costoPromedio: numero(fila.average_cost),
    documento: fila.reference_doc ?? null,
    usuarioId: fila.user_id ?? null,
    fecha: fila.created_at ?? null,
  }
}

// Respuesta de POST /movements y /movements/:id/receive → { operacion, movimientos, duplicado }
export function aMovimiento(respuesta) {
  return {
    operacion: aOperacion(respuesta.operation),
    movimientos: respuesta.movements.map(aKardex),
    duplicado: Boolean(respuesta.duplicate),
  }
}

// ---------- Conteo cíclico ----------

export function aConteo(fila) {
  return {
    id: fila.id,
    bodegaId: fila.warehouse_id,
    estado: fila.status === 'in_progress' ? 'abierto' : 'cerrado',
    notas: fila.notes ?? null,
    creadoPor: fila.created_by,
    fecha: fila.created_at,
  }
}

// Respuesta de POST /counts/:id/items
export function aResultadoConteo(datos) {
  return {
    conteoId: datos.count_session_id,
    partidas: datos.items.map((p) => ({
      productoId: p.product_id,
      sistema: numero(p.system_qty),
      contado: numero(p.counted_qty),
      diferencia: numero(p.difference_qty),
      ajusteId: p.adjustment_id ?? null,
    })),
  }
}

// ---------- Ajustes ----------

const ESTADO_AJUSTE = { pending: 'pendiente', approved: 'aprobado', rejected: 'rechazado' }
export const FILTRO_ESTADO_AJUSTE = Object.fromEntries(Object.entries(ESTADO_AJUSTE).map(([en, es]) => [es, en]))

export function aAjuste(fila) {
  return {
    id: fila.id,
    bodegaId: fila.warehouse_id,
    productoId: fila.product_id,
    lote: fila.lot_number || null,
    tipo: fila.adjustment_type === 'positive' ? 'positivo' : 'negativo',
    cantidad: numero(fila.qty),
    motivo: fila.reason,
    evidencia: fila.evidence_url ?? null,
    estado: ESTADO_AJUSTE[fila.status] ?? fila.status,
    solicitadoPor: fila.requested_by,
    aprobadoPor: fila.approved_by ?? null,
    fecha: fila.created_at,
  }
}

export function deAjuste({ bodegaId, productoId, lote, tipo, cantidad, motivo, evidencia }) {
  const cuerpo = {
    warehouse_id: bodegaId,
    product_id: productoId,
    adjustment_type: tipo === 'positivo' ? 'positive' : 'negative',
    qty: cantidad,
    reason: motivo,
  }
  if (lote) cuerpo.lot_number = lote
  if (evidencia) cuerpo.evidence_url = evidencia
  return cuerpo
}

// ---------- Sesión y bodegas (Backend 1) ----------

// GET /api/auth/me → la sesión que usa la UI. La UI pregunta por permisos, nunca por rol.
export function aSesion(respuesta) {
  const { user, business } = respuesta
  return {
    usuario: { id: user.id, nombre: user.name, correo: user.email ?? null, avatar: user.avatar_url ?? null },
    negocio: business ? { id: business.id, nombre: business.name, logo: business.logo_url ?? null } : null,
    roles: user.roles ?? [],
    permisos: user.permissions ?? [],
    esPropietario: Boolean(user.is_owner),
  }
}

export function aBodega(fila) {
  return {
    id: fila.id,
    codigo: fila.code,
    nombre: fila.name,
    sucursal: fila.branch_name ?? null,
    activa: Boolean(fila.is_active),
  }
}
