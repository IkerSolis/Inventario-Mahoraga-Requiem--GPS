// Textos y formatos que comparten la lista y el detalle de productos

export const ESTADOS_STOCK = {
  disponible: { tono: 'optimo', texto: 'Óptimo' },
  bajo: { tono: 'alerta', texto: 'Stock bajo' },
  agotado: { tono: 'neutro', texto: 'Agotado' },
}

export const formatoDinero = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })
