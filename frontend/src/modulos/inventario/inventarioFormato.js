// Textos que comparten las pantallas de Inventario

export const TIPOS_MOVIMIENTO = {
  entrada: { texto: 'Entrada', tono: 'optimo' },
  salida: { texto: 'Salida', tono: 'info' },
  transferencia: { texto: 'Transferencia', tono: 'neutro' },
  devolucion: { texto: 'Devolución', tono: 'alerta' },
}

export const ESTADOS_OPERACION = {
  enTransito: { texto: 'En tránsito', tono: 'alerta' },
  completado: { texto: 'Completado', tono: 'optimo' },
}

const formatoFecha = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' })

export function textoFecha(iso) {
  return iso ? formatoFecha.format(new Date(iso)) : '—'
}

// Nombre corto de la bodega con la lista que ya cargó la pantalla
export function nombreBodega(bodegas, id) {
  if (id == null) return '—'
  return bodegas.find((b) => b.id === id)?.nombre ?? `Bodega ${id}`
}

// Renglones del kardex (las claves vienen de traductores.js → TIPO_KARDEX). entra: suma al saldo.
export const TIPOS_KARDEX = {
  entrada: { texto: 'Entrada', entra: true },
  salida: { texto: 'Salida', entra: false },
  transferenciaEntrada: { texto: 'Transferencia recibida', entra: true },
  transferenciaSalida: { texto: 'Transferencia enviada', entra: false },
  devolucionEntrada: { texto: 'Devolución de cliente', entra: true },
  devolucionSalida: { texto: 'Devolución a proveedor', entra: false },
  ajusteEntrada: { texto: 'Ajuste positivo', entra: true },
  ajusteSalida: { texto: 'Ajuste negativo', entra: false },
}
