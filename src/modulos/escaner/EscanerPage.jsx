import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { buscarProductoPorCodigo } from '../../api/productos.js'
import { usePuede } from '../../auth/usePuede.js'
import LecturaActual from './LecturaActual.jsx'
import LectorCodigo from './LectorCodigo.jsx'
import { elegirModo, esMismoProducto, modoPorTecla, modosPermitidos } from './escanerLogica.js'
import './EscanerPage.css'

export default function EscanerPage() {
  const puede = usePuede()
  const [parametros, setParametros] = useSearchParams()
  const permitidos = modosPermitidos(puede)
  // El modo vive en la URL (?modo=salida), igual que los filtros de Productos
  const modo = elegirModo(parametros.get('modo'), permitidos)

  const [lectura, setLectura] = useState(null) // { producto, cantidad } o null
  const [errorLectura, setErrorLectura] = useState(null)
  const [buscando, setBuscando] = useState(false)
  const lector = useRef(null)
  // Número de la última búsqueda: si llegan dos lecturas seguidas, se ignora la respuesta de la vieja
  const ultimaBusqueda = useRef(0)

  function enfocarLector() {
    lector.current?.focus()
  }

  function descartar() {
    setLectura(null)
    setErrorLectura(null)
    enfocarLector()
  }

  // Cambiar de modo descarta la lectura, porque una entrada a medias no debe convertirse en salida
  function cambiarModo(clave) {
    setParametros({ modo: clave }, { replace: true })
    descartar()
  }

  async function leer(codigo) {
    setErrorLectura(null)
    if (lectura && esMismoProducto(codigo, lectura.producto)) {
      setLectura({ ...lectura, cantidad: lectura.cantidad + 1 })
      return
    }

    const numero = ++ultimaBusqueda.current
    setBuscando(true)
    try {
      const producto = await buscarProductoPorCodigo(codigo)
      if (numero !== ultimaBusqueda.current) return
      setLectura({ producto, cantidad: 1 })
    } catch (e) {
      if (numero !== ultimaBusqueda.current) return
      setLectura(null)
      setErrorLectura(e.estado === 404 ? `No existe un producto con el código ${codigo}` : e.message)
    } finally {
      if (numero === ultimaBusqueda.current) setBuscando(false)
      enfocarLector()
    }
  }

  // F1, F2 y F3 cambian de modo. preventDefault porque el navegador las usa (F1 = ayuda, F3 = buscar).
  // Esc descarta la lectura actual.
  // Sin lista de dependencias: se vuelve a registrar en cada render para usar siempre la lectura y el modo actuales.
  useEffect(() => {
    function alPresionarTecla(e) {
      if (e.key === 'Escape' && lectura) {
        descartar()
        return
      }
      if (!['F1', 'F2', 'F3'].includes(e.key)) return
      e.preventDefault()
      const elegido = modoPorTecla(e.key, permitidos)
      if (elegido) cambiarModo(elegido.clave)
    }
    window.addEventListener('keydown', alPresionarTecla)
    return () => window.removeEventListener('keydown', alPresionarTecla)
  })

  if (!modo) {
    return (
      <section>
        <h1>Escáner</h1>
        <p className="escaner-sin-permiso">
          Tu rol no tiene permiso para usar el escáner. Se necesita al menos uno de estos: registrar entradas
          (stock.receive), registrar salidas (stock.issue) o hacer conteos (stock.count).
        </p>
      </section>
    )
  }

  return (
    <section>
      <header className="escaner-encabezado">
        <span className="material-symbols-outlined escaner-encabezado-icono" aria-hidden="true">
          barcode_scanner
        </span>
        <div>
          <h1>Estación de escáner</h1>
          <p>Lee un código de barras o escribe el SKU. Cambia de modo con las teclas de función.</p>
        </div>
      </header>

      <div className="escaner-modos" role="group" aria-label="Modo del escáner">
        {permitidos.map((m) => (
          <button
            key={m.clave}
            type="button"
            className="escaner-modo"
            aria-pressed={m.clave === modo.clave}
            aria-keyshortcuts={m.tecla}
            onClick={() => cambiarModo(m.clave)}
          >
            <span className="material-symbols-outlined escaner-modo-icono" aria-hidden="true">
              {m.icono}
            </span>
            <span className="escaner-modo-texto">
              <strong>{m.titulo}</strong>
              <span>{m.descripcion}</span>
            </span>
            <kbd>{m.tecla}</kbd>
          </button>
        ))}
      </div>

      <div className="escaner-cuerpo">
        <div className="escaner-panel">
          <LectorCodigo ref={lector} onLeer={leer} buscando={buscando} />

          {errorLectura && (
            <p role="alert" className="escaner-error">
              {errorLectura}
            </p>
          )}

          {lectura ? (
            <LecturaActual lectura={lectura} onDescartar={descartar} />
          ) : (
            !errorLectura && (
              <p className="escaner-vacio">Modo {modo.titulo.toLowerCase()}: lee un código para empezar.</p>
            )
          )}
        </div>
      </div>
    </section>
  )
}
