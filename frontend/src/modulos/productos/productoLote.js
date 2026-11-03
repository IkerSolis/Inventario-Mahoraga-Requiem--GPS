// Resume el resultado de aplicar una acción a varios productos a la vez.
// resultados viene de Promise.allSettled: cada uno es { status: 'fulfilled' } o { status: 'rejected', reason }.
// textos: { uno: 'se archivó', participio: 'archivado' }
// Devuelve el aviso para mostrar: { tipo: 'exito' | 'alerta' | 'error', texto }
export function resumirLote(productos, resultados, { uno, participio }) {
  const fallidos = resultados.filter((r) => r.status === 'rejected')
  const exitos = resultados.length - fallidos.length

  if (exitos === 0) {
    return { tipo: 'error', texto: `No se pudo completar: ${fallidos[0].reason.message}` }
  }

  const hecho =
    productos.length === 1
      ? `${productos[0].nombre} ${uno}.`
      : `${exitos} ${exitos === 1 ? `producto ${participio}` : `productos ${participio}s`}.`

  if (fallidos.length === 0) return { tipo: 'exito', texto: hecho }

  const noPudieron = fallidos.length === 1 ? '1 no se pudo' : `${fallidos.length} no se pudieron`
  return { tipo: 'alerta', texto: `${hecho} ${noPudieron}: ${fallidos[0].reason.message}` }
}
