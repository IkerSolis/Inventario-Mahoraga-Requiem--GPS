// Lógica de selección de filas de Tabla.jsx (separada para poder probarla sin React)

// Agrega el id si no estaba, o lo quita si ya estaba
export function alternarFila(seleccionadas, id) {
  if (seleccionadas.includes(id)) return seleccionadas.filter((s) => s !== id)
  return [...seleccionadas, id]
}

// Casilla del encabezado: marca o desmarca solo las filas visibles, sin tocar las de otras páginas
export function alternarVisibles(seleccionadas, idsVisibles) {
  const todas = idsVisibles.every((id) => seleccionadas.includes(id))
  if (todas) return seleccionadas.filter((id) => !idsVisibles.includes(id))
  return [...seleccionadas, ...idsVisibles.filter((id) => !seleccionadas.includes(id))]
}
