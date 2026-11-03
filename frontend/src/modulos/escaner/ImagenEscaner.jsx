import { useState } from 'react'
import { crearLectorZxing } from './lectorZxing.js'

// "Escanear desde imagen": se elige una foto y se busca el código de barras en ella. Sirve para probar sin cámara.
// onLeer(codigo) si encontró un código; onError(mensaje) si no.
export default function ImagenEscaner({ onLeer, onError }) {
  const [leyendo, setLeyendo] = useState(false)

  async function elegir(e) {
    const archivo = e.target.files[0]
    e.target.value = '' // para poder elegir la misma foto otra vez
    if (!archivo) return

    setLeyendo(true)
    const url = URL.createObjectURL(archivo)
    try {
      const lector = await crearLectorZxing()
      const resultado = await lector.decodeFromImageUrl(url)
      onLeer(resultado.getText())
    } catch {
      onError('No se encontró un código de barras en la imagen. Prueba con una foto más cercana y enfocada.')
    } finally {
      URL.revokeObjectURL(url)
      setLeyendo(false)
    }
  }

  // El <input type="file"> va oculto dentro de un <label> con estilo de botón; sigue siendo accesible con teclado
  return (
    <label className={`boton boton-secundario imagen-escaner ${leyendo ? 'imagen-escaner-leyendo' : ''}`}>
      <span className={`material-symbols-outlined ${leyendo ? 'girando' : ''}`} aria-hidden="true">
        {leyendo ? 'progress_activity' : 'image_search'}
      </span>
      {leyendo ? 'Leyendo imagen…' : 'Desde imagen'}
      <input type="file" accept="image/*" className="visualmente-oculto" onChange={elegir} disabled={leyendo} />
    </label>
  )
}
