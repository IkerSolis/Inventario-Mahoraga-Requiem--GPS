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
