// Lógica del escáner sin React, para poder probarla con Vitest

// Cada modo usa una tecla, pide un permiso y registra un tipo de movimiento
export const MODOS = [
  {
    clave: 'entrada',
    tecla: 'F1',
    titulo: 'Entrada de mercancía',
    descripcion: 'Recepciones de proveedor',
    permiso: 'stock.receive',
    tipoMovimiento: 'entrada',
    icono: 'move_to_inbox',
  },
  {
    clave: 'salida',
    tecla: 'F2',
    titulo: 'Salida / despacho',
    descripcion: 'Surtido y envíos',
    permiso: 'stock.issue',
    tipoMovimiento: 'salida',
    icono: 'outbox',
  },
  {
    clave: 'auditoria',
    tecla: 'F3',
    titulo: 'Auditoría / conteo físico',
    descripcion: 'Conteo cíclico',
    permiso: 'stock.count',
    tipoMovimiento: 'conteo',
    icono: 'fact_check',
  },
]

// puede: la función de usePuede()
export function modosPermitidos(puede) {
  return MODOS.filter((modo) => puede(modo.permiso))
}

// El modo que viene en la URL si existe y está permitido; si no, el primero permitido; null si no hay ninguno
export function elegirModo(claveEnUrl, permitidos) {
  return permitidos.find((modo) => modo.clave === claveEnUrl) ?? permitidos[0] ?? null
}

// tecla: e.key del teclado ('F1', 'F2'...). null si la tecla no es de un modo permitido
export function modoPorTecla(tecla, permitidos) {
  return permitidos.find((modo) => modo.tecla === tecla) ?? null
}

// ¿El código leído es del producto que ya está en pantalla? (por código de barras o por SKU)
// Sirve para que leer otra vez la misma pieza sume 1 en lugar de buscarla de nuevo.
export function esMismoProducto(codigo, producto) {
  if (!producto) return false
  const limpio = codigo.trim().toUpperCase()
  return limpio === producto.codigoBarras || limpio === producto.sku.toUpperCase()
}
