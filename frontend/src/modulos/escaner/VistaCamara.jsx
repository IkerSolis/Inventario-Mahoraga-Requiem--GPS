import { useEffect, useRef, useState } from 'react'
import Boton from '../../components/Boton.jsx'
import { esLecturaRepetida, mensajeErrorCamara } from './escanerLogica.js'
import { abrirCamara, crearLectorZxing, listarCamaras } from './lectorZxing.js'

// Muestra la cámara y lee códigos continuamente. Se enciende al montarse y se apaga al desmontarse.
// onLeer(codigo) por cada código nuevo; onError(mensaje) si no se pudo abrir la cámara.
//
// La cámara la abrimos nosotros (no zxing) para controlar el <video>: autoplay, muted y playsInline,
// y play() explícito. En algunos teléfonos, si el video no se reproduce, se ve el recuadro en negro.
export default function VistaCamara({ onLeer, onError, onCerrar }) {
  const video = useRef(null)
  const ultima = useRef({ texto: '', momento: 0 })
  const [idCamara, setIdCamara] = useState('') // '' = la trasera por defecto
  const [camaras, setCamaras] = useState([])
  const [idEnUso, setIdEnUso] = useState('')
  // Estado visible en pantalla: en el teléfono no se ve la consola
  const [estado, setEstado] = useState('Pidiendo permiso para usar la cámara…')

  // Las funciones de la página cambian en cada render; se guardan en refs para no reiniciar la cámara cada vez
  const alLeer = useRef(onLeer)
  const alFallar = useRef(onError)
  useEffect(() => {
    alLeer.current = onLeer
    alFallar.current = onError
  })

  useEffect(() => {
    let cancelado = false
    let flujo = null
    let controles = null
    let revision = null

    function apagar() {
      clearInterval(revision)
      controles?.stop()
      flujo?.getTracks().forEach((pista) => pista.stop())
    }

    async function iniciar() {
      try {
        flujo = await abrirCamara(idCamara)
        if (cancelado) return apagar()

        const elemento = video.current
        elemento.muted = true // la propiedad, no solo el atributo: sin esto algunos navegadores no dejan reproducir
        elemento.srcObject = flujo
        await elemento.play()
        if (cancelado) return apagar()

        const pista = flujo.getVideoTracks()[0]
        const nombre = pista?.label || 'cámara'
        setIdEnUso(pista?.getSettings().deviceId ?? '')
        setCamaras(await listarCamaras())

        // Revisa cada segundo si de verdad llegan cuadros: con imagen, el video tiene tamaño y avanza el tiempo
        revision = setInterval(() => {
          if (elemento.videoWidth > 0 && elemento.currentTime > 0) {
            setEstado(`${nombre} · imagen ${elemento.videoWidth}×${elemento.videoHeight} · buscando códigos`)
          } else {
            setEstado(`${nombre} · conectada pero sin imagen. Si sigue en negro, elige otra cámara de la lista.`)
          }
        }, 1000)

        const lector = await crearLectorZxing()
        if (cancelado) return apagar()
        controles = await lector.decodeFromVideoElement(elemento, (resultado) => {
          if (!resultado) return
          const texto = resultado.getText()
          const ahora = Date.now()
          const repetida = esLecturaRepetida(texto, ahora, ultima.current)
          // Se actualiza el momento aunque se ignore: mientras el código siga frente a la cámara no se vuelve
          // a leer. Para leerlo otra vez hay que retirarlo 2 segundos (si no, sumaría +1 sin parar).
          ultima.current = { texto, momento: ahora }
          if (!repetida) alLeer.current(texto)
        })
        if (cancelado) apagar()
      } catch (error) {
        apagar()
        if (!cancelado) alFallar.current(mensajeErrorCamara(error))
      }
    }

    iniciar()
    return () => {
      cancelado = true
      apagar()
    }
  }, [idCamara])

  function elegirCamara(e) {
    setEstado('Cambiando de cámara…')
    setIdCamara(e.target.value)
  }

  return (
    <div className="camara">
      <video ref={video} className="camara-video" autoPlay muted playsInline aria-label="Vista de la cámara" />
      <p className="camara-estado" role="status">
        {estado}
      </p>

      {/* Algunos teléfonos tienen varias cámaras traseras; si una sale en negro, se puede probar otra */}
      {camaras.length > 1 && (
        <label className="camara-selector">
          Cámara{' '}
          <select value={idCamara || idEnUso} onChange={elegirCamara}>
            {camaras.map((camara, i) => (
              <option key={camara.deviceId} value={camara.deviceId}>
                {camara.label || `Cámara ${i + 1}`}
              </option>
            ))}
          </select>
        </label>
      )}

      <p className="camara-ayuda">
        Apunta al código de barras. Para leer el mismo código otra vez, retíralo de la cámara 2 segundos.
      </p>
      <Boton variante="secundario" icono="videocam_off" onClick={onCerrar}>
        Cerrar cámara
      </Boton>
    </div>
  )
}
