// Manda al servidor lo confirmado en el escáner y arma el registro que se muestra en el manifiesto.
// F1 (entrada) y F2 (salida) son movimientos: POST /inventory/movements con la clave de idempotencia.
// F3 (auditoría) usa el conteo cíclico: abre una sesión (POST /counts) y le manda la partida
// (POST /counts/:id/items). El servidor cierra la sesión con ese envío, así que cada conteo abre la suya.
import { abrirConteo, registrarConteo, registrarMovimiento } from '../../api/inventario.js'

// lectura: { producto, cantidad (número), clave }. bodega: { id, nombre }. documento: texto, puede ir vacío.
// Devuelve { tipo, cantidad, existenciasAntes, existenciasDespues, diferencia, ajusteId, documento, bodega, fecha }
export async function registrarLectura(tipo, { producto, cantidad, clave }, bodega, documento) {
  const comun = { tipo, cantidad, documento, bodega: bodega.nombre, fecha: new Date().toISOString() }

  if (tipo === 'conteo') {
    // El documento (si lo hay) queda como nota de la sesión de conteo.
    // Si falla el segundo paso, la sesión abierta queda vacía; al reintentar se abre otra.
    const conteo = await abrirConteo(bodega.id, documento || null)
    const { partidas } = await registrarConteo(conteo.id, [{ productoId: producto.id, contado: cantidad }])
    const [partida] = partidas
    return {
      ...comun,
      // El conteo no mueve el stock: si hay diferencia, queda un ajuste pendiente de aprobar
      existenciasAntes: partida.sistema,
      existenciasDespues: partida.sistema,
      diferencia: partida.diferencia,
      ajusteId: partida.ajusteId,
    }
  }

  const { movimientos } = await registrarMovimiento({
    tipo,
    bodegaId: bodega.id,
    productoId: producto.id,
    cantidad,
    documento,
    clave,
  })
  const [movimiento] = movimientos
  return {
    ...comun,
    existenciasAntes: movimiento.existenciasAntes,
    existenciasDespues: movimiento.existenciasDespues,
    diferencia: null,
    ajusteId: null,
  }
}
