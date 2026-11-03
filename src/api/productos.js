import { pedir, usarMock } from './cliente.js'
import * as mock from './mock/productos.js'

// Contrato provisional (falta confirmarlo con Backend 2):
// GET /api/productos?pagina=1&porPagina=25 → { elementos: [producto, ...], total }
// producto: { id, sku, nombre, categoria, marca, unidad, precioCompra, precioVenta,
//             existencias, stockMinimo, estadoStock: 'disponible' | 'bajo' | 'agotado',
//             ubicacion: { pasillo, rack, gaveta } }
// Sin el permiso costs.read el servidor no debería mandar precioCompra.
export function listarProductos({ pagina, porPagina }) {
  if (usarMock) return mock.listarProductos({ pagina, porPagina })
  const parametros = new URLSearchParams({ pagina, porPagina })
  return pedir(`/productos?${parametros}`)
}
