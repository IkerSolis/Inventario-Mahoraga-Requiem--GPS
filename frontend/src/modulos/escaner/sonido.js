// "Beep" del escáner con la Web Audio API del navegador: un tono corto, sin archivos de audio.
// 'ok' = agudo y breve; 'error' = grave y más largo, para distinguirlos sin mirar la pantalla.
let contexto = null

export function sonar(tipo) {
  try {
    // El navegador solo deja crear o reanudar el audio después de una acción del usuario (tecla o clic)
    contexto ??= new AudioContext()
    if (contexto.state === 'suspended') contexto.resume()

    const oscilador = contexto.createOscillator()
    const volumen = contexto.createGain()
    oscilador.type = tipo === 'ok' ? 'sine' : 'square'
    oscilador.frequency.value = tipo === 'ok' ? 1050 : 220
    volumen.gain.value = 0.08
    oscilador.connect(volumen).connect(contexto.destination)
    oscilador.start()
    oscilador.stop(contexto.currentTime + (tipo === 'ok' ? 0.09 : 0.25))
  } catch {
    // Navegador sin audio: el escáner funciona igual, solo sin sonido
  }
}
