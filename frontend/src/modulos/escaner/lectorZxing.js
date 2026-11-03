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

// Abre la cámara y devuelve su stream (MediaStream).
// idCamara: una cámara elegida en la lista; sin ella se pide la trasera y, si falla, la primera disponible.
export async function abrirCamara(idCamara) {
  if (idCamara) {
    return navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: idCamara } }, audio: false })
  }
  try {
    // "ideal" en lugar de "exact": si no hay cámara trasera no falla, usa otra
    return await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
  } catch (error) {
    if (error.name === 'NotAllowedError') throw error // sin permiso, otra cámara tampoco va a funcionar
    return navigator.mediaDevices.getUserMedia({ video: true, audio: false })
  }
}

// Lista de cámaras del dispositivo. Los nombres solo aparecen después de dar permiso.
export async function listarCamaras() {
  const dispositivos = await navigator.mediaDevices.enumerateDevices()
  return dispositivos.filter((d) => d.kind === 'videoinput')
}
