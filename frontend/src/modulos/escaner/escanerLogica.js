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
// El código de barras es opcional en el backend, así que puede venir en null.
export function esMismoProducto(codigo, producto) {
  if (!producto) return false
  const limpio = codigo.trim().toUpperCase()
  return (producto.codigoBarras != null && limpio === producto.codigoBarras) || limpio === producto.sku.toUpperCase()
}

// Botones de suma rápida de la confirmación
export const PASOS_RAPIDOS = [1, 5, 10, 25, 50, 100]

// La cantidad viaja como texto (es lo que da el <input>); vacío o inválido cuenta como 0
export function sumarCantidad(texto, paso) {
  const actual = Number(texto) || 0
  return String(Math.max(0, actual + paso))
}

// Cuántas habrá después del movimiento. En el conteo, lo contado pasa a ser el total.
export function totalNuevo(tipo, existencias, cantidad) {
  if (tipo === 'entrada') return existencias + cantidad
  if (tipo === 'salida') return existencias - cantidad
  return cantidad
}

// Validación en el cliente, para avisar antes de enviar. El servidor vuelve a validar.
// La cantidad es entera en la UI, aunque el servidor acepta hasta dos decimales.
// disponible: lo que se puede sacar (físico − reservado). Si es null (no se pudo consultar),
// no se revisa aquí y el servidor responde 409 si no alcanza.
// Devuelve el mensaje de error, o null si se puede confirmar.
export function validarCantidad(tipo, texto, disponible) {
  const cantidad = Number(texto)
  if (texto.trim() === '' || !Number.isInteger(cantidad)) return 'Escribe una cantidad entera'
  if (tipo === 'conteo') return cantidad < 0 ? 'La cantidad contada no puede ser negativa' : null
  if (cantidad < 1) return 'La cantidad debe ser al menos 1'
  if (tipo === 'salida' && disponible != null && cantidad > disponible) return `Solo hay ${disponible} disponibles`
  return null
}

// Clave de idempotencia: una por lectura. Si se reintenta la misma confirmación, el servidor no la duplica.
// crypto.randomUUID solo existe en páginas seguras (https o localhost); si no, se arma una clave aleatoria.
export function nuevaClave() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

// Cómo se muestra la cantidad: +10 en entradas, −4 en salidas (signo menos tipográfico), 12 en conteos
export function textoCantidad(tipo, cantidad) {
  if (tipo === 'entrada') return `+${cantidad}`
  if (tipo === 'salida') return `−${cantidad}`
  return String(cantidad)
}

// Diferencia con signo para conteos: +2, −3 o 0
export function textoDiferencia(diferencia) {
  if (diferencia > 0) return `+${diferencia}`
  if (diferencia < 0) return `−${Math.abs(diferencia)}`
  return '0'
}

// Mensaje después de confirmar. movimiento: el registro que arma registrarLectura.js con la respuesta.
// En un conteo con diferencia el servidor crea un ajuste pendiente: el stock no cambia hasta que se apruebe.
export function resumenMovimiento(movimiento, nombreProducto) {
  const { tipo, cantidad, existenciasAntes, existenciasDespues, diferencia } = movimiento
  if (tipo === 'conteo') {
    const detalle =
      diferencia === 0 ? 'sin diferencia' : `diferencia ${textoDiferencia(diferencia)}, ajuste pendiente de aprobación`
    return `Conteo registrado: ${nombreProducto}, ${cantidad} contadas (sistema ${existenciasAntes}, ${detalle}).`
  }
  const nombre = tipo === 'entrada' ? 'Entrada registrada' : 'Salida registrada'
  return `${nombre}: ${nombreProducto} ${textoCantidad(tipo, cantidad)} (${existenciasAntes} → ${existenciasDespues}).`
}

// Totales del manifiesto: piezas que entraron y salieron, conteos hechos y cuántos tuvieron diferencia
export function resumirManifiesto(movimientos) {
  const resumen = { entradas: 0, salidas: 0, conteos: 0, conDiferencia: 0 }
  for (const m of movimientos) {
    if (m.tipo === 'entrada') resumen.entradas += m.cantidad
    if (m.tipo === 'salida') resumen.salidas += m.cantidad
    if (m.tipo === 'conteo') {
      resumen.conteos += 1
      if (m.diferencia !== 0) resumen.conDiferencia += 1
    }
  }
  return resumen
}

// La cámara lee muchas veces por segundo mientras el código sigue enfrente.
// Una lectura del mismo código dentro de la espera se ignora; ultima: { texto, momento }
export function esLecturaRepetida(texto, ahora, ultima, espera = 2000) {
  return texto === ultima.texto && ahora - ultima.momento < espera
}

// Mensaje claro para cada error típico al abrir la cámara (los nombres vienen del navegador)
export function mensajeErrorCamara(error) {
  if (error?.name === 'NotAllowedError') return 'No se dio permiso para usar la cámara.'
  if (error?.name === 'NotFoundError' || error?.name === 'OverconstrainedError') return 'No se encontró una cámara.'
  if (error?.name === 'NotReadableError') return 'La cámara está ocupada por otra aplicación.'
  return `No se pudo abrir la cámara: ${error?.message ?? 'error desconocido'}`
}
