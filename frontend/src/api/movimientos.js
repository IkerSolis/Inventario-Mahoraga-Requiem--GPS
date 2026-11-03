import { pedir, usarMock } from './cliente.js'
import * as mock from './mock/movimientos.js'

// Contrato provisional (falta confirmarlo con Backend 2):
// POST /api/movimientos
//   Encabezado: Idempotency-Key: <uuid distinto por cada confirmación>
//   Cuerpo: { tipo: 'entrada' | 'salida' | 'conteo', productoId, cantidad, pasillo, rack, gaveta, documento }
//   Respuesta: { movimiento: { id, tipo, productoId, cantidad, existenciasAntes, existenciasDespues,
//                              diferencia (solo conteo), fecha, ... }, producto: producto actualizado }
// Permisos: entrada → stock.receive, salida → stock.issue, conteo → stock.count.
// Si la misma Idempotency-Key llega dos veces, el servidor responde lo mismo sin mover el stock otra vez.
export function registrarMovimiento(datos, claveIdempotencia) {
  if (usarMock) return mock.registrarMovimiento(datos, claveIdempotencia)
  return pedir('/movimientos', {
    method: 'POST',
    body: JSON.stringify(datos),
    headers: { 'Idempotency-Key': claveIdempotencia },
  })
}
