// Simula los endpoints de productos con datos en memoria.
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
function calcularEstadoStock(existencias, minimo) {
  if (existencias === 0) return 'agotado'
  if (existencias < minimo) return 'bajo'
  return 'disponible'
}

const productos = Array.from({ length: 48 }, (_, i) => {
  const b = base[i % base.length]
  const existencias = (i * 17) % 60
  return {
    id: i + 1,
    sku: `MOD-${String(1000 + i * 7)}`,
    nombre: i < base.length ? b.nombre : `${b.nombre} ${Math.floor(i / base.length) + 1}`,
    categoria: b.categoria,
    marca: b.marca,
    unidad: b.unidad,
    precioCompra: Math.round(b.precio * 0.55),
    precioVenta: b.precio,
    existencias,
    stockMinimo: STOCK_MINIMO,
    estadoStock: calcularEstadoStock(existencias, STOCK_MINIMO),
    ubicacion: { pasillo: (i % 4) + 1, rack: 'ABCD'[i % 4], gaveta: (i % 6) + 1 },
  }
})

function esperar(datos) {
  return new Promise((resolver) => setTimeout(() => resolver(datos), 300))
}

// Igual que el servidor: sin costs.read el costo no viaja en la respuesta
function quitarCostoSiNoPuede(producto) {
  if (tienePermiso('costs.read')) return producto
  const { precioCompra, ...sinCosto } = producto
  return sinCosto
}

export function listarProductos({ pagina = 1, porPagina = 25 } = {}) {
  const inicio = (pagina - 1) * porPagina
  return esperar({
    elementos: productos.slice(inicio, inicio + porPagina).map(quitarCostoSiNoPuede),
    total: productos.length,
  })
}
