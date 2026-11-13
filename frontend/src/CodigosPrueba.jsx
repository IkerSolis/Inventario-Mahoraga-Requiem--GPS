import { useEffect, useState } from 'react'
import { listarProductos } from './api/productos.js'
import { barrasEan13 } from './modulos/escaner/ean13.js'
import './modulos/escaner/EscanerPage.css'

// Página de desarrollo: muestra el código de barras de cada producto para escanearlo desde la pantalla
// con la cámara del teléfono. Solo existe en desarrollo (ver App.jsx).

const ANCHO_MODULO = 3 // píxeles por barra delgada; más ancho = más fácil de leer con la cámara
const MARGEN = 11 // espacio en blanco a cada lado (en módulos); los lectores lo necesitan

function CodigoDeBarras({ codigo }) {
  const barras = barrasEan13(codigo)
  const ancho = (barras.length + MARGEN * 2) * ANCHO_MODULO
  return (
    <svg
      viewBox={`0 0 ${ancho} 100`}
      width={ancho}
      height="100"
      role="img"
      aria-label={`Código de barras ${codigo}`}
      className="codigo-barras"
    >
      <rect width={ancho} height="100" fill="#fff" />
      {[...barras].map((bit, i) =>
        bit === '1' ? (
          <rect key={i} x={(MARGEN + i) * ANCHO_MODULO} y="8" width={ANCHO_MODULO} height="84" fill="#000" />
        ) : null,
      )}
    </svg>
  )
}

export default function CodigosPrueba() {
  const [productos, setProductos] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    listarProductos({ pagina: 1, porPagina: 100 })
      // Solo los que tienen un EAN-13 (el código de barras es opcional en el backend)
      .then((respuesta) => setProductos(respuesta.elementos.filter((p) => /^\d{13}$/.test(p.codigoBarras ?? ''))))
      .catch((e) => setError(e.message))
  }, [])

  return (
    <section>
      <h1>Códigos de prueba</h1>
      <p>Abre el escáner en el teléfono (npm run dev:red), toca “Usar cámara” y apunta a estos códigos.</p>
      {error && <p role="alert">No se pudieron cargar los productos: {error}</p>}
      {!productos && !error && <p>Cargando productos…</p>}
      {productos && (
        <ul className="codigos-prueba">
          {productos.map((p) => (
            <li key={p.id}>
              <CodigoDeBarras codigo={p.codigoBarras} />
              <strong>{p.nombre}</strong>
              <span className="cifra">
                {p.codigoBarras} · {p.sku}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
