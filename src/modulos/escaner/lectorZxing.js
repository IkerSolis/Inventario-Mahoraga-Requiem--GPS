// @zxing/browser lee códigos de barras desde la cámara o desde una imagen.
// Pesa unos 125 KB comprimido, así que no va en la carga inicial: import() lo descarga solo la primera vez que se usa.
// Se usa el lector de códigos lineales (EAN-13, UPC, Code 128...), que son los de los productos.
// Es más rápido que el de todos los formatos y no llena la consola probando QR, PDF417, etc. en cada cuadro.
export async function crearLectorZxing() {
  const { BrowserMultiFormatOneDReader } = await import('@zxing/browser')
  return new BrowserMultiFormatOneDReader()
}

// La cámara solo existe en páginas seguras (https o localhost)
export function hayCamaraDisponible() {
  return Boolean(navigator.mediaDevices?.getUserMedia)
}
