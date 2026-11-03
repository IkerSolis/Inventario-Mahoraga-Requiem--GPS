import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { usePuede } from '../../auth/usePuede.js'
import { elegirModo, modoPorTecla, modosPermitidos } from './escanerLogica.js'
import './EscanerPage.css'

export default function EscanerPage() {
  const puede = usePuede()
  const [parametros, setParametros] = useSearchParams()
  const permitidos = modosPermitidos(puede)
  // El modo vive en la URL (?modo=salida), igual que los filtros de Productos
  const modo = elegirModo(parametros.get('modo'), permitidos)

  // F1, F2 y F3 cambian de modo. preventDefault porque el navegador las usa (F1 = ayuda, F3 = buscar).
  useEffect(() => {
    function alPresionarTecla(e) {
      if (!['F1', 'F2', 'F3'].includes(e.key)) return
      e.preventDefault()
      const elegido = modoPorTecla(e.key, permitidos)
      if (elegido) setParametros({ modo: elegido.clave }, { replace: true })
    }
    window.addEventListener('keydown', alPresionarTecla)
    return () => window.removeEventListener('keydown', alPresionarTecla)
  }, [permitidos, setParametros])

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
            onClick={() => setParametros({ modo: m.clave }, { replace: true })}
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
          <p className="escaner-vacio">Modo {modo.titulo.toLowerCase()}: lee un código para empezar.</p>
        </div>
      </div>
    </section>
  )
}
