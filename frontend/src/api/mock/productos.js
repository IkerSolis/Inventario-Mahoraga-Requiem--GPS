// Simula /api/products y /api/categories de Backend 2 con datos en memoria.
// Responde EXACTO como el servidor (inglés, snake_case, { ok, data, pagination }); los errores se lanzan
// con errorHttp(estado, mensaje), igual que pedir() cuando el servidor contesta { ok: false, error }.
// La traducción al español está en ../traductores.js, no aquí.
import { errorHttp } from '../cliente.js'
import { esperar } from './esperar.js'
import { tienePermiso } from './sesion.js'

const AHORA = '2026-11-01T12:00:00.000Z'

function categoria(id, name, slug) {
  return {
    id,
    business_id: 1,
    parent_id: null,
    name,
    slug,
    description: null,
    icon_name: 'category',
    color_hex: '#4F46E5',
    status: 'active',
    created_at: AHORA,
    updated_at: AHORA,
  }
}

export const categorias = [
  categoria(1, 'Playeras', 'playeras'),
  categoria(2, 'Pantalones', 'pantalones'),
  categoria(3, 'Sudaderas', 'sudaderas'),
  categoria(4, 'Accesorios', 'accesorios'),
  categoria(5, 'Chamarras', 'chamarras'),
  categoria(6, 'Calzado', 'calzado'),
]

const base = [
  { name: 'Camiseta básica blanca', category_id: 1, unit: 'pieza', precio: 189 },
  { name: 'Jeans regular fit', category_id: 2, unit: 'pieza', precio: 649 },
  { name: 'Sudadera con capucha', category_id: 3, unit: 'pieza', precio: 529 },
  { name: 'Gorra bordada', category_id: 4, unit: 'pieza', precio: 249 },
  { name: 'Chamarra impermeable', category_id: 5, unit: 'pieza', precio: 1299 },
  { name: 'Tenis urbanos', category_id: 6, unit: 'par', precio: 999 },
  { name: 'Calcetines deportivos', category_id: 4, unit: 'paquete', precio: 129 },
  { name: 'Playera polo', category_id: 1, unit: 'pieza', precio: 349 },
  { name: 'Short de mezclilla', category_id: 2, unit: 'pieza', precio: 399 },
  { name: 'Cinturón de piel', category_id: 4, unit: 'pieza', precio: 289 },
  { name: 'Bota de trabajo', category_id: 6, unit: 'par', precio: 1499 },
  { name: 'Chaleco acolchado', category_id: 5, unit: 'pieza', precio: 799 },
]

// EAN-13: 12 dígitos + dígito verificador. Suma los 12 alternando ×1 y ×3 (así lo valida cualquier lector).
export function digitoVerificadorEan13(doceDigitos) {
  let suma = 0
  for (let i = 0; i < 12; i++) suma += Number(doceDigitos[i]) * (i % 2 === 0 ? 1 : 3)
  return (10 - (suma % 10)) % 10
}

// Los productos de ejemplo llevan un código fijo (750 + id en 9 dígitos) para que no cambie entre recargas
function ean13DeId(id) {
  const doce = '750' + String(id).padStart(9, '0')
  return doce + digitoVerificadorEan13(doce)
}

// Exportado para el mock de inventario, que necesita saber si un producto existe y está activo
export const productos = Array.from({ length: 48 }, (_, i) => {
  const b = base[i % base.length]
  return {
    id: i + 1,
    business_id: 1,
    sku: `MOD-${1000 + i * 7}`,
    name: i < base.length ? b.name : `${b.name} ${Math.floor(i / base.length) + 1}`,
    description: null,
    cost_price: Math.round(b.precio * 0.55),
    sale_price: b.precio,
    unit: b.unit,
    category_id: b.category_id,
    supplier_id: null,
    // brand_id existe en Backend 2, pero no hay endpoint de marcas: la UI no lo usa por ahora
    brand_id: null,
    barcode: ean13DeId(i + 1),
    qr_code: null,
    image_url: null,
    location: null,
    variants: null,
    status: 'active',
    created_at: AHORA,
    updated_at: AHORA,
  }
})

function exigirPermiso(permiso) {
  if (!tienePermiso(permiso)) throw errorHttp(403, `Acceso denegado: Se requiere el permiso '${permiso}'.`)
}

// Igual que el servidor: sin costs.read no viaja cost_price
function sinCostoSiNoPuede(fila, puedeVerCosto = tienePermiso('costs.read')) {
  const copia = { ...fila }
  if (!puedeVerCosto) delete copia.cost_price
  return copia
}

function buscarFila(id) {
  const fila = productos.find((p) => p.id === Number(id))
  if (!fila) throw errorHttp(404, 'Producto no encontrado en esta empresa.')
  return fila
}

// GET /api/products?page=&limit=&search=&category_id=&brand_id=&status=
// search compara (sin distinguir mayúsculas, con LIKE) contra sku, name y barcode
export async function listar({ page = 1, limit = 10, search, category_id, brand_id, status = 'active' } = {}) {
  exigirPermiso('products.read')
  const pagina = Number(page)
  const porPagina = Number(limit)
  if (porPagina < 1 || porPagina > 100) throw errorHttp(400, 'Parámetros de búsqueda inválidos')

  const texto = (search ?? '').trim().toLowerCase()
  const filtrados = productos
    .filter(
      (p) =>
        (status === 'all' || p.status === status) &&
        (!category_id || p.category_id === Number(category_id)) &&
        (!brand_id || p.brand_id === Number(brand_id)) &&
        (!texto ||
          p.sku.toLowerCase().includes(texto) ||
          p.name.toLowerCase().includes(texto) ||
          (p.barcode ?? '').toLowerCase().includes(texto)),
    )
    .sort((a, b) => b.id - a.id) // el servidor ordena por id descendente

  const inicio = (pagina - 1) * porPagina
  return esperar({
    ok: true,
    data: filtrados.slice(inicio, inicio + porPagina).map((p) => sinCostoSiNoPuede(p)),
    pagination: {
      page: pagina,
      limit: porPagina,
      total: filtrados.length,
      totalPages: Math.ceil(filtrados.length / porPagina),
    },
  })
}

// GET /api/products/:id (también devuelve archivados)
export async function obtener(id) {
  exigirPermiso('products.read')
  return esperar({ ok: true, data: sinCostoSiNoPuede(buscarFila(id)) })
}

function revisarDuplicados(datos, idPropio) {
  const otro = (campo) => productos.find((p) => p.id !== idPropio && datos[campo] && p[campo] === datos[campo])
  if (otro('sku')) throw errorHttp(409, `Ya existe un producto con el SKU '${datos.sku}' en tu empresa.`)
  if (otro('barcode')) {
    throw errorHttp(409, `Ya existe un producto con el código de barras '${datos.barcode}' en tu empresa.`)
  }
}

// Validación básica, como el esquema Zod del servidor
function validar(datos, esNuevo) {
  const problemas = []
  if (esNuevo || 'sku' in datos) if (!datos.sku || datos.sku.trim().length < 2) problemas.push('sku')
  if (esNuevo || 'name' in datos) if (!datos.name || datos.name.trim().length < 2) problemas.push('name')
  for (const campo of ['cost_price', 'sale_price']) {
    if (campo in datos && (Number.isNaN(Number(datos[campo])) || Number(datos[campo]) < 0)) problemas.push(campo)
  }
  if (problemas.length > 0) {
    throw errorHttp(400, `Error de validación en los campos del producto: ${problemas.join(', ')}.`)
  }
}

// El servidor guarda el archivo y responde su URL en /uploads; el mock lo guarda como data URL
function leerComoDataUrl(archivo) {
  return new Promise((resolver, rechazar) => {
    const lector = new FileReader()
    lector.onload = () => resolver(lector.result)
    lector.onerror = () => rechazar(lector.error)
    lector.readAsDataURL(archivo)
  })
}

// Igual que Multer en el servidor: solo PNG o JPG de hasta 5 MB
async function urlDeImagen(archivo) {
  if (!['image/png', 'image/jpeg', 'image/jpg'].includes(archivo.type)) {
    throw errorHttp(400, 'Solo se permiten imágenes PNG o JPG.')
  }
  if (archivo.size > 5 * 1024 * 1024) throw errorHttp(400, 'El archivo supera el límite máximo permitido de 5MB.')
  return leerComoDataUrl(archivo)
}

// POST /api/products (JSON, o multipart con el campo image). cuerpo ya viene en snake_case.
export async function crear(cuerpo, imagen) {
  exigirPermiso('products.create')
  validar(cuerpo, true)
  revisarDuplicados(cuerpo)
  const nuevo = {
    id: Math.max(...productos.map((p) => p.id)) + 1,
    business_id: 1,
    description: null,
    cost_price: 0,
    sale_price: 0,
    unit: 'pieza',
    category_id: null,
    supplier_id: null,
    brand_id: null,
    barcode: null,
    qr_code: null,
    image_url: null,
    location: null,
    variants: null,
    status: 'active',
    ...cuerpo,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  if (imagen) nuevo.image_url = await urlDeImagen(imagen)
  productos.push(nuevo)
  // Backend 2 responde el producto creado con cost_price aunque no se tenga costs.read (pendiente de corregir allá)
  return esperar({ ok: true, message: 'Producto creado exitosamente.', data: sinCostoSiNoPuede(nuevo, true) })
}

// PUT /api/products/:id (parcial: solo cambia lo que viene)
export async function actualizar(id, cuerpo, imagen) {
  exigirPermiso('products.update')
  const fila = productos.find((p) => p.id === Number(id))
  if (!fila) throw errorHttp(404, 'El producto especificado no fue encontrado.')
  validar(cuerpo, false)
  revisarDuplicados(cuerpo, fila.id)
  const imagenNueva = imagen ? await urlDeImagen(imagen) : null
  Object.assign(fila, cuerpo, { updated_at: new Date().toISOString() })
  if (imagenNueva) fila.image_url = imagenNueva
  // Igual que en crear: Backend 2 manda cost_price aquí sin revisar costs.read
  return esperar({ ok: true, message: 'Producto actualizado exitosamente.', data: sinCostoSiNoPuede(fila, true) })
}

// PATCH /api/products/:id/archive. No regresa el producto, solo su id y estado.
export async function archivar(id) {
  exigirPermiso('products.archive')
  const fila = productos.find((p) => p.id === Number(id))
  if (!fila) throw errorHttp(404, 'El producto especificado no fue encontrado.')
  fila.status = 'archived'
  fila.updated_at = new Date().toISOString()
  return esperar({
    ok: true,
    message: 'Producto archivado exitosamente. No se eliminó de la BD para preservar el historial del Kardex.',
    id: fila.id,
    status: 'archived',
  })
}

// GET /api/products/generate/sku?prefix= → PREFIJO-0049 (consecutivo según cuántos productos hay)
export async function generarSku(prefix = 'SKU') {
  exigirPermiso('products.create')
  const prefijo =
    String(prefix)
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 8) || 'SKU'
  let numero = productos.length + 1
  while (productos.some((p) => p.sku === `${prefijo}-${String(numero).padStart(4, '0')}`)) numero++
  return esperar({ ok: true, sku: `${prefijo}-${String(numero).padStart(4, '0')}` })
}

// GET /api/products/generate/barcode?type=ean13 → 750 + 9 dígitos al azar + verificador
export async function generarCodigoBarras() {
  exigirPermiso('products.create')
  let doce = '750'
  for (let i = 0; i < 9; i++) doce += Math.floor(Math.random() * 10)
  return esperar({ ok: true, type: 'ean13', barcode: doce + digitoVerificadorEan13(doce) })
}

// GET /api/categories?status= (lista plana; el servidor también acepta tree=true)
export async function listarCategorias({ status = 'all' } = {}) {
  exigirPermiso('products.read')
  const data = categorias
    .filter((c) => status === 'all' || c.status === status)
    .sort((a, b) => a.name.localeCompare(b.name, 'es'))
  return esperar({ ok: true, data: data.map((c) => ({ ...c })) })
}
