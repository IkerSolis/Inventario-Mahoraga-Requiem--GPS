// Textos y formatos que comparten la lista y el detalle de productos

// Las claves son las que entrega traductores.js (ESTADO_STOCK)
export const ESTADOS_STOCK = {
  disponible: { tono: 'optimo', texto: 'Óptimo' },
  bajo: { tono: 'alerta', texto: 'Stock bajo' },
  agotado: { tono: 'neutro', texto: 'Agotado' },
}

// Lo que se muestra cuando un dato no viene en la respuesta
export const SIN_DATO = '—'

export const formatoDinero = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })

// Nombre de la categoría a partir de su id, con la lista que ya cargó la página
export function nombreCategoria(categorias, id) {
  return categorias.find((c) => c.id === id)?.nombre ?? SIN_DATO
}
