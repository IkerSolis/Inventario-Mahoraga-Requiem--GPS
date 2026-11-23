// Lógica de Paginacion.jsx (separada para poder probarla sin React)

// Siempre muestra la primera, la última y las vecinas de la actual; el resto se resume con "…"
// Ejemplo: actual 5 de 74 → [1, '…', 4, 5, 6, '…', 74]
export function paginasVisibles(actual, total) {
  const paginas = []
  for (let p = 1; p <= total; p++) {
    if (p === 1 || p === total || Math.abs(p - actual) <= 1) {
      paginas.push(p)
    } else if (paginas[paginas.length - 1] !== '…') {
      paginas.push('…')
    }
  }
  return paginas
}
