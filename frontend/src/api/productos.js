import { conParametros, errorHttp, json, pedir, usarMock } from './cliente.js'
import * as mock from './mock/productos.js'
import { aCategoria, aPagina, aProducto, deProducto } from './traductores.js'

// Endpoints de Backend 2 (/api/products y /api/categories). Cada función pide al servidor (o al mock,
// que responde igual) y traduce la respuesta al español con traductores.js.
// Permisos que pide el servidor: products.read para consultar, products.create para crear y generar
// SKU/código, products.update para editar y restaurar, products.archive para archivar.
// Sin costs.read el servidor no manda el costo (precioCompra queda en null).

// Si hay imagen, el cuerpo va como multipart (campo "image"); si no, como JSON.
// Los valores null no se mandan en multipart: llegarían como el texto "null".
function cuerpoProducto(metodo, datos, imagen) {
  const cuerpo = deProducto(datos)
  if (!imagen) return json(metodo, cuerpo)
  const formulario = new FormData()
  for (const [campo, valor] of Object.entries(cuerpo)) {
    if (valor !== null && valor !== undefined) formulario.append(campo, valor)
  }
  formulario.append('image', imagen)
  return { method: metodo, body: formulario }
}

// GET /api/products?page=&limit=&search=&category_id=&status=active|archived
// busqueda compara contra nombre, SKU y código de barras. Devuelve { elementos, total, paginas }.
export async function listarProductos({ pagina = 1, porPagina = 25, busqueda, categoriaId, archivados = false } = {}) {
  return aPagina(
    await pedirLista({
      page: pagina,
      limit: porPagina,
      search: busqueda,
      category_id: categoriaId,
      status: archivados ? 'archived' : 'active',
    }),
    aProducto,
  )
}

function pedirLista(parametros) {
  return usarMock ? mock.listar(parametros) : pedir(conParametros('/products', parametros))
}

// GET /api/products/:id (también devuelve archivados)
export async function obtenerProducto(id) {
  const respuesta = usarMock ? await mock.obtener(id) : await pedir(`/products/${id}`)
  return aProducto(respuesta.data)
}

// Para el escáner. Backend 2 no tiene búsqueda exacta por código: se busca con ?search= (que compara
// por partes contra nombre, SKU y código) y aquí se filtra la coincidencia exacta de código de barras o SKU.
// 404 si no hay; 409 si está archivado.
export async function buscarProductoPorCodigo(codigo) {
  const buscado = codigo.trim().toUpperCase()
  // status=all: también trae archivados, para poder avisar en lugar de decir que no existe
  const respuesta = await pedirLista({ search: codigo.trim(), limit: 100, status: 'all' })
  const producto = respuesta.data
    .map(aProducto)
    .find((p) => p.codigoBarras === buscado || p.sku.toUpperCase() === buscado)
  if (!producto) throw errorHttp(404, `No existe un producto con el código ${codigo.trim()}`)
  if (producto.archivado) throw errorHttp(409, `${producto.nombre} está archivado; restáuralo para moverlo`)
  return producto
}

// POST /api/products. El SKU lo manda el cliente (pídelo antes con generarSku). imagen: File o null.
export async function crearProducto(datos, imagen = null) {
  const respuesta = usarMock
    ? await mock.crear(deProducto(datos), imagen)
    : await pedir('/products', cuerpoProducto('POST', datos, imagen))
  return aProducto(respuesta.data)
}

// PUT /api/products/:id. Es parcial: solo cambia los campos que vienen en datos.
export async function actualizarProducto(id, datos, imagen = null) {
  const respuesta = usarMock
    ? await mock.actualizar(id, deProducto(datos), imagen)
    : await pedir(`/products/${id}`, cuerpoProducto('PUT', datos, imagen))
  return aProducto(respuesta.data)
}

// PATCH /api/products/:id/archive. Archivar no borra: el kardex se conserva. No devuelve el producto.
export async function archivarProducto(id) {
  if (usarMock) await mock.archivar(id)
  else await pedir(`/products/${id}/archive`, { method: 'PATCH' })
}

// Backend 2 no tiene ruta para restaurar: se hace con PUT { status: 'active' }, que pide products.update
export async function restaurarProducto(id) {
  const cuerpo = { status: 'active' }
  const respuesta = usarMock ? await mock.actualizar(id, cuerpo) : await pedir(`/products/${id}`, json('PUT', cuerpo))
  return aProducto(respuesta.data)
}

// GET /api/products/generate/sku?prefix= → 'MOD-0049'
export async function generarSku(prefijo = 'MOD') {
  const respuesta = usarMock
    ? await mock.generarSku(prefijo)
    : await pedir(conParametros('/products/generate/sku', { prefix: prefijo }))
  return respuesta.sku
}

// GET /api/products/generate/barcode?type=ean13 → EAN-13 válido que empieza con 750
export async function generarCodigoBarras() {
  const respuesta = usarMock ? await mock.generarCodigoBarras() : await pedir('/products/generate/barcode?type=ean13')
  return respuesta.barcode
}

// GET /api/categories?status=active → [{ id, nombre, padreId, activa }]
// (el catálogo de categorías lo administra Frontend 3; aquí solo se listan)
export async function listarCategorias() {
  const respuesta = usarMock
    ? await mock.listarCategorias({ status: 'active' })
    : await pedir('/categories?status=active')
  return respuesta.data.map(aCategoria)
}
