import { pedir, usarMock } from './cliente.js'
import * as mock from './mock/productos.js'

// Contrato provisional (falta confirmarlo con Backend 2):
// GET /api/productos?pagina=1&porPagina=25&busqueda=&categoria=&estadoStock= → { elementos: [producto, ...], total }
// producto: { id, sku, nombre, descripcion, categoria, marca, unidad, precioCompra, precioVenta,
//             existencias, stockMinimo, estadoStock: 'disponible' | 'bajo' | 'agotado',
//             pasillo, rack, gaveta, archivado }
// Sin archivados=true el servidor solo manda productos activos; con archivados=true, solo los archivados.
// Sin el permiso costs.read el servidor no debería mandar precioCompra.
// busqueda compara contra nombre y SKU; los filtros vacíos no se mandan.
export function listarProductos({ pagina, porPagina, busqueda, categoria, estadoStock, archivados = false }) {
  if (usarMock) return mock.listarProductos({ pagina, porPagina, busqueda, categoria, estadoStock, archivados })

  const parametros = new URLSearchParams({ pagina, porPagina })
  if (busqueda) parametros.set('busqueda', busqueda)
  if (categoria) parametros.set('categoria', categoria)
  if (estadoStock) parametros.set('estadoStock', estadoStock)
  if (archivados) parametros.set('archivados', 'true')
  return pedir(`/productos?${parametros}`)
}

// GET /api/productos/:id → producto completo (con descripción). Sin costs.read, sin precioCompra.
export function obtenerProducto(id) {
  if (usarMock) return mock.obtenerProducto(id)
  return pedir(`/productos/${id}`)
}

// POST /api/productos → producto creado. El servidor genera id y SKU; las existencias empiezan en 0.
export function crearProducto(datos) {
  if (usarMock) return mock.crearProducto(datos)
  return pedir('/productos', { method: 'POST', body: JSON.stringify(datos) })
}

// PATCH /api/productos/:id → producto actualizado. PATCH porque solo mandamos los campos que el usuario puede tocar.
export function actualizarProducto(id, datos) {
  if (usarMock) return mock.actualizarProducto(id, datos)
  return pedir(`/productos/${id}`, { method: 'PATCH', body: JSON.stringify(datos) })
}

// POST /api/productos/:id/archivar y /restaurar → producto. Archivar no borra; requiere products.archive.
export function archivarProducto(id) {
  if (usarMock) return mock.archivarProducto(id)
  return pedir(`/productos/${id}/archivar`, { method: 'POST' })
}

export function restaurarProducto(id) {
  if (usarMock) return mock.restaurarProducto(id)
  return pedir(`/productos/${id}/restaurar`, { method: 'POST' })
}

// GET /api/categorias → ['Accesorios', 'Calzado', ...] (provisional; el catálogo de categorías es de Frontend 3)
export function listarCategorias() {
  if (usarMock) return mock.listarCategorias()
  return pedir('/categorias')
}
