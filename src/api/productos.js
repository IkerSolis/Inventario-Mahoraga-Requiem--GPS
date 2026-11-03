import { pedir, usarMock } from './cliente.js'
import * as mock from './mock/productos.js'

// Contrato provisional (falta confirmarlo con Backend 2):
// GET /api/productos?pagina=1&porPagina=25&busqueda=&categoria=&estadoStock= → { elementos: [producto, ...], total }
// producto: { id, sku, nombre, categoria, marca, unidad, precioCompra, precioVenta,
//             existencias, stockMinimo, estadoStock: 'disponible' | 'bajo' | 'agotado',
//             ubicacion: { pasillo, rack, gaveta } }
// Sin el permiso costs.read el servidor no debería mandar precioCompra.
// busqueda compara contra nombre y SKU; los filtros vacíos no se mandan.
export function listarProductos({ pagina, porPagina, busqueda, categoria, estadoStock }) {
  if (usarMock) return mock.listarProductos({ pagina, porPagina, busqueda, categoria, estadoStock })

  const parametros = new URLSearchParams({ pagina, porPagina })
  if (busqueda) parametros.set('busqueda', busqueda)
  if (categoria) parametros.set('categoria', categoria)
  if (estadoStock) parametros.set('estadoStock', estadoStock)
  return pedir(`/productos?${parametros}`)
}

// GET /api/categorias → ['Accesorios', 'Calzado', ...] (provisional; el catálogo de categorías es de Frontend 3)
export function listarCategorias() {
  if (usarMock) return mock.listarCategorias()
  return pedir('/categorias')
}
