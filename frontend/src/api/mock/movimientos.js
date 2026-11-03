// Simula POST /api/movimientos. Modifica las existencias de los mismos productos del mock de productos.
import { errorHttp } from '../cliente.js'
import { esperar } from './esperar.js'
import { calcularEstadoStock, productos, quitarCostoSiNoPuede } from './productos.js'
import { tienePermiso } from './sesion.js'

const PERMISO_POR_TIPO = { entrada: 'stock.receive', salida: 'stock.issue', conteo: 'stock.count' }

// Idempotencia: el servidor recuerda cada clave. Si llega repetida (doble clic, reintento por red lenta),
// responde lo mismo de la primera vez sin volver a mover el stock.
const yaProcesados = new Map()
let siguienteId = 1

export async function registrarMovimiento(datos, claveIdempotencia) {
  if (yaProcesados.has(claveIdempotencia)) return esperar(yaProcesados.get(claveIdempotencia))

  const { tipo, productoId, cantidad, pasillo = '', rack = '', gaveta = '', documento = '' } = datos
  const permiso = PERMISO_POR_TIPO[tipo]
  if (!permiso) throw errorHttp(400, `Tipo de movimiento desconocido: ${tipo}`)
  if (!tienePermiso(permiso)) throw errorHttp(403, `No tienes permiso (${permiso})`)

  // En el conteo se registra lo que hay en el estante, que puede ser 0; en entradas y salidas, al menos 1
  const minimo = tipo === 'conteo' ? 0 : 1
  if (!Number.isInteger(cantidad) || cantidad < minimo) {
    throw errorHttp(422, `La cantidad debe ser un número entero de ${minimo} o más`)
  }

  const producto = productos.find((p) => p.id === productoId)
  if (!producto) throw errorHttp(404, 'El producto no existe')
  if (producto.archivado) throw errorHttp(409, `${producto.nombre} está archivado; restáuralo para moverlo`)
  if (tipo === 'salida' && cantidad > producto.existencias) {
    throw errorHttp(409, `No hay suficiente stock: hay ${producto.existencias}`)
  }

  const existenciasAntes = producto.existencias
  if (tipo === 'entrada') producto.existencias += cantidad
  if (tipo === 'salida') producto.existencias -= cantidad
  // El conteo no cambia las existencias: solo registra lo contado.
  // Si hay diferencia, el ajuste se solicita y aprueba aparte (módulo de Inventario).
  producto.estadoStock = calcularEstadoStock(producto.existencias, producto.stockMinimo)

  const resultado = {
    movimiento: {
      id: siguienteId++,
      tipo,
      productoId,
      cantidad,
      pasillo,
      rack,
      gaveta,
      documento,
      existenciasAntes,
      existenciasDespues: producto.existencias,
      diferencia: tipo === 'conteo' ? cantidad - existenciasAntes : null,
      fecha: new Date().toISOString(),
    },
    // Copia, para que cambios posteriores del mock no modifiquen lo que ya se mostró
    producto: { ...quitarCostoSiNoPuede(producto) },
  }
  yaProcesados.set(claveIdempotencia, resultado)
  return esperar(resultado)
}
