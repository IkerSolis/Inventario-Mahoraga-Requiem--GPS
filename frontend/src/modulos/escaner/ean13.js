// Convierte un código EAN-13 en su patrón de barras: 95 caracteres, '1' = barra negra y '0' = espacio.
// Se usa en la página de desarrollo /codigos-prueba para dibujar códigos que la cámara pueda leer.

// Cada dígito se dibuja con 7 módulos. La tabla "L" es la base; las otras dos se sacan de ella:
// R = L con los colores invertidos, y G = R al revés.
const L = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011']
const R = L.map((patron) => [...patron].map((bit) => (bit === '1' ? '0' : '1')).join(''))
const G = R.map((patron) => [...patron].reverse().join(''))

// El primer dígito no se dibuja: decide qué tabla (L o G) usa cada uno de los 6 dígitos de la izquierda
const PARIDAD = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL']

export function barrasEan13(codigo) {
  if (!/^\d{13}$/.test(codigo)) throw new Error('Un EAN-13 tiene exactamente 13 dígitos')
  const digitos = [...codigo].map(Number)
  const paridad = PARIDAD[digitos[0]]

  let barras = '101' // guarda de inicio
  for (let i = 1; i <= 6; i++) barras += paridad[i - 1] === 'L' ? L[digitos[i]] : G[digitos[i]]
  barras += '01010' // guarda central
  for (let i = 7; i <= 12; i++) barras += R[digitos[i]]
  barras += '101' // guarda final
  return barras
}
