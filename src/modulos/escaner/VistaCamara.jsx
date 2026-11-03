import { useEffect, useRef } from 'react'
import Boton from '../../components/Boton.jsx'
import { esLecturaRepetida, mensajeErrorCamara } from './escanerLogica.js'
import { crearLectorZxing } from './lectorZxing.js'

// Muestra la cámara y lee códigos continuamente. Se enciende al montarse y se apaga al desmontarse.
// onLeer(codigo) por cada código nuevo; onError(mensaje) si no se pudo abrir la cámara.
export default function VistaCamara({ onLeer, onError, onCerrar }) {
  const video = useRef(null)
  const ultima = useRef({ texto: '', momento: 0 })
  // Las funciones de la página cambian en cada render; se guardan en refs para no reiniciar la cámara cada vez
  const alLeer = useRef(onLeer)
  const alFallar = useRef(onError)
  useEffect(() => {
    alLeer.current = onLeer
    alFallar.current = onError
  })

  useEffect(() => {
    let controles = null
    let cancelado = false

    crearLectorZxing()
      // facingMode 'environment' = cámara trasera en el teléfono
      .then((lector) =>
        lector.decodeFromConstraints({ video: { facingMode: 'environment' } }, video.current, (resultado) => {
          if (!resultado) return
          const texto = resultado.getText()
          const ahora = Date.now()
          if (esLecturaRepetida(texto, ahora, ultima.current)) return
          ultima.current = { texto, momento: ahora }
          alLeer.current(texto)
        }),
      )
      .then((nuevosControles) => {
        // Si la vista se cerró mientras la cámara arrancaba, se apaga en cuanto termina de arrancar
        if (cancelado) nuevosControles.stop()
        else controles = nuevosControles
      })
      .catch((error) => {
        if (!cancelado) alFallar.current(mensajeErrorCamara(error))
      })

    return () => {
      cancelado = true
      controles?.stop()
    }
  }, [])

  return (
    <div className="camara">
      <video ref={video} className="camara-video" muted playsInline aria-label="Vista de la cámara" />
      <p className="camara-ayuda">Apunta al código de barras. Cada código se lee una vez cada 2 segundos.</p>
      <Boton variante="secundario" icono="videocam_off" onClick={onCerrar}>
        Cerrar cámara
      </Boton>
    </div>
  )
}
