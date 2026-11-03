// Simula los endpoints de productos con datos en memoria.
import { errorHttp } from '../cliente.js'
import { esperar } from './esperar.js'
import { tienePermiso } from './sesion.js'

const base = [
  { nombre: 'Camiseta básica blanca', categoria: 'Playeras', marca: 'Norte', unidad: 'pieza', precio: 189 },
  { nombre: 'Jeans regular fit', categoria: 'Pantalones', marca: 'Denim Co', unidad: 'pieza', precio: 649 },
  { nombre: 'Sudadera con capucha', categoria: 'Sudaderas', marca: 'Norte', unidad: 'pieza', precio: 529 },
  { nombre: 'Gorra bordada', categoria: 'Accesorios', marca: 'Urbana', unidad: 'pieza', precio: 249 },
  { nombre: 'Chamarra impermeable', categoria: 'Chamarras', marca: 'Andes', unidad: 'pieza', precio: 1299 },
  { nombre: 'Tenis urbanos', categoria: 'Calzado', marca: 'Paso', unidad: 'par', precio: 999 },
  { nombre: 'Calcetines deportivos', categoria: 'Accesorios', marca: 'Paso', unidad: 'paquete', precio: 129 },
  { nombre: 'Playera polo', categoria: 'Playeras', marca: 'Urbana', unidad: 'pieza', precio: 349 },
  { nombre: 'Short de mezclilla', categoria: 'Pantalones', marca: 'Denim Co', unidad: 'pieza', precio: 399 },
  { nombre: 'Cinturón de piel', categoria: 'Accesorios', marca: 'Andes', unidad: 'pieza', precio: 289 },
  { nombre: 'Bota de trabajo', categoria: 'Calzado', marca: 'Andes', unidad: 'par', precio: 1499 },
  { nombre: 'Chaleco acolchado', categoria: 'Chamarras', marca: 'Norte', unidad: 'pieza', precio: 799 },
]

const STOCK_MINIMO = 10

// El backend calcula el estado de stock en la consulta comparando contra el mínimo; aquí lo imitamos
export function calcularEstadoStock(existencias, minimo) {
  if (existencias === 0) return 'agotado'
  if (existencias < minimo) return 'bajo'
  return 'disponible'
}

// El backend genera el código de barras. Aquí: 750 (prefijo de México) + id en 9 dígitos + dígito verificador.
// El dígito verificador es el que valida cualquier lector: suma los 12 dígitos alternando ×1 y ×3.
export function digitoVerificadorEan13(doceDigitos) {
  let suma = 0
  for (let i = 0; i < 12; i++) suma += Number(doceDigitos[i]) * (i % 2 === 0 ? 1 : 3)
  return (10 - (suma % 10)) % 10
}

function generarEan13(id) {
  const doce = '750' + String(id).padStart(9, '0')
  return doce + digitoVerificadorEan13(doce)
}

// Exportado para el mock de movimientos, que modifica las existencias de estos mismos productos
export const productos = Array.from({ length: 48 }, (_, i) => {
  const b = base[i % base.length]
  const existencias = (i * 17) % 60
  return {
    id: i + 1,
    sku: `MOD-${String(1000 + i * 7)}`,
    codigoBarras: generarEan13(i + 1),
    nombre: i < base.length ? b.nombre : `${b.nombre} ${Math.floor(i / base.length) + 1}`,
    descripcion: '',
    categoria: b.categoria,
    marca: b.marca,
    unidad: b.unidad,
    precioCompra: Math.round(b.precio * 0.55),
    precioVenta: b.precio,
    existencias,
    stockMinimo: STOCK_MINIMO,
    estadoStock: calcularEstadoStock(existencias, STOCK_MINIMO),
    pasillo: String((i % 4) + 1),
    rack: 'ABCD'[i % 4],
    gaveta: String((i % 6) + 1),
    archivado: false,
    imagen: null,
  }
})

// Igual que el servidor: sin costs.read el costo no viaja en la respuesta
export function quitarCostoSiNoPuede(producto) {
  if (tienePermiso('costs.read')) return producto
  const { precioCompra, ...sinCosto } = producto
  return sinCosto
}

// Minúsculas y sin acentos, para que "cinturon" encuentre "Cinturón"
function normalizar(texto) {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

// Los filtros vacíos ('' o undefined) no filtran nada.
// Por defecto solo trae los activos; con archivados: true trae solo los archivados.
export function listarProductos({
  pagina = 1,
  porPagina = 25,
  busqueda,
  categoria,
  estadoStock,
  archivados = false,
} = {}) {
  const texto = normalizar(busqueda ?? '').trim()
  const filtrados = productos.filter(
    (p) =>
      p.archivado === archivados &&
      (!texto || normalizar(p.nombre).includes(texto) || normalizar(p.sku).includes(texto)) &&
      (!categoria || p.categoria === categoria) &&
      (!estadoStock || p.estadoStock === estadoStock),
  )

  const inicio = (pagina - 1) * porPagina
  return esperar({
    elementos: filtrados.slice(inicio, inicio + porPagina).map(quitarCostoSiNoPuede),
    total: filtrados.length,
  })
}

export async function obtenerProducto(id) {
  const producto = productos.find((p) => p.id === id)
  if (!producto) throw new Error('El producto no existe')
  return esperar(quitarCostoSiNoPuede(producto))
}

// Busca por código de barras o por SKU (lo que lea el escáner o escriba el usuario)
export async function buscarProductoPorCodigo(codigo) {
  const buscado = codigo.trim().toUpperCase()
  const producto = productos.find((p) => p.codigoBarras === buscado || p.sku.toUpperCase() === buscado)
  if (!producto) throw errorHttp(404, `No existe un producto con el código ${codigo.trim()}`)
  if (producto.archivado) throw errorHttp(409, `${producto.nombre} está archivado; restáuralo para moverlo`)
  return esperar(quitarCostoSiNoPuede(producto))
}

// Igual que el servidor: los campos sin permiso se ignoran aunque vengan en la petición
function quitarCamposSinPermiso(datos) {
  const permitidos = { ...datos }
  if (!tienePermiso('costs.read')) delete permitidos.precioCompra
  if (!tienePermiso('prices.manage')) delete permitidos.precioVenta
  return permitidos
}

function exigirPermiso(permiso) {
  if (!tienePermiso(permiso)) throw new Error(`No tienes permiso (${permiso})`)
}

export async function crearProducto(datos) {
  exigirPermiso('products.create')
  const id = Math.max(...productos.map((p) => p.id)) + 1
  const nuevo = {
    precioVenta: 0, // si quien crea no gestiona precios, queda en 0 hasta que alguien con prices.manage lo asigne
    precioCompra: 0,
    ...quitarCamposSinPermiso(datos),
    id,
    sku: `MOD-${String(2000 + productos.length)}`, // el backend genera el SKU y el código de barras
    codigoBarras: generarEan13(id),
    existencias: 0, // las existencias solo cambian con movimientos de inventario
    archivado: false,
    imagen: null,
  }
  nuevo.estadoStock = calcularEstadoStock(nuevo.existencias, nuevo.stockMinimo)
  productos.unshift(nuevo) // al inicio, para que se vea en la primera página
  return esperar(quitarCostoSiNoPuede(nuevo))
}

export async function actualizarProducto(id, datos) {
  exigirPermiso('products.update')
  const producto = productos.find((p) => p.id === id)
  if (!producto) throw new Error('El producto no existe')

  Object.assign(producto, quitarCamposSinPermiso(datos))
  producto.estadoStock = calcularEstadoStock(producto.existencias, producto.stockMinimo)
  return esperar(quitarCostoSiNoPuede(producto))
}

// El servidor real guardaría el archivo y devolvería su URL; en el mock basta guardarlo como data URL
function leerComoDataUrl(archivo) {
  return new Promise((resolver, rechazar) => {
    const lector = new FileReader()
    lector.onload = () => resolver(lector.result)
    lector.onerror = () => rechazar(lector.error)
    lector.readAsDataURL(archivo)
  })
}

export async function subirImagenProducto(id, archivo) {
  if (!tienePermiso('products.create') && !tienePermiso('products.update')) {
    throw new Error('No tienes permiso (products.update)')
  }
  // El servidor valida por su cuenta, aunque el formulario ya lo haya hecho
  if (!['image/png', 'image/jpeg'].includes(archivo.type)) throw new Error('Solo se aceptan imágenes PNG o JPG')
  if (archivo.size > 2 * 1024 * 1024) throw new Error('La imagen pesa más de 2 MB')

  const producto = productos.find((p) => p.id === id)
  if (!producto) throw new Error('El producto no existe')
  producto.imagen = await leerComoDataUrl(archivo)
  return esperar(quitarCostoSiNoPuede(producto))
}

// Archivar no borra: el producto conserva su historial (kardex) y se puede restaurar
async function cambiarArchivado(id, archivado) {
  exigirPermiso('products.archive')
  const producto = productos.find((p) => p.id === id)
  if (!producto) throw new Error('El producto no existe')
  producto.archivado = archivado
  return esperar(quitarCostoSiNoPuede(producto))
}

export function archivarProducto(id) {
  return cambiarArchivado(id, true)
}

export function restaurarProducto(id) {
  return cambiarArchivado(id, false)
}

export function listarCategorias() {
  const nombres = new Set(productos.map((p) => p.categoria))
  return esperar([...nombres].sort())
}
