import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { buscarProductoPorCodigo } from '../../api/productos.js'
import { usePuede } from '../../auth/usePuede.js'
import { registrarMovimiento } from '../../api/movimientos.js'
import ConfirmacionMovimiento from './ConfirmacionMovimiento.jsx'
import LecturaActual from './LecturaActual.jsx'
import LectorCodigo from './LectorCodigo.jsx'
import {
  elegirModo,
  esMismoProducto,
  modoPorTecla,
  modosPermitidos,
  nuevaClave,
  resumenMovimiento,
  sumarCantidad,
  validarCantidad,
} from './escanerLogica.js'
import ManifiestoSesion from './ManifiestoSesion.jsx'
import './EscanerPage.css'

const CLAVE_MANIFIESTO = 'escaner-manifiesto'
const MAXIMO_MANIFIESTO = 200 // para no llenar el almacenamiento en una sesión muy larga

function cargarManifiesto() {
  try {
    return JSON.parse(sessionStorage.getItem(CLAVE_MANIFIESTO)) ?? []
  } catch {
    return []
  }
}

export default function EscanerPage() {
  const puede = usePuede()
  const [parametros, setParametros] = useSearchParams()
  const permitidos = modosPermitidos(puede)
  // El modo vive en la URL (?modo=salida), igual que los filtros de Productos
  const modo = elegirModo(parametros.get('modo'), permitidos)

  // lectura: producto leído y datos de la confirmación, o null.
  // { producto, cantidad (texto del input), pasillo, rack, gaveta, clave (idempotencia) }
  const [lectura, setLectura] = useState(null)
  const [errorLectura, setErrorLectura] = useState(null)
  const [buscando, setBuscando] = useState(false)
  const [documento, setDocumento] = useState('') // se conserva entre lecturas
  const [confirmando, setConfirmando] = useState(false)
  const [errorMovimiento, setErrorMovimiento] = useState(null)
  const [ultimoMovimiento, setUltimoMovimiento] = useState(null) // texto del último movimiento registrado
  const [manifiesto, setManifiesto] = useState(cargarManifiesto) // movimientos de la sesión, el más nuevo primero

  // El manifiesto se guarda en sessionStorage: sobrevive a recargar la página, se borra al cerrar la pestaña
  useEffect(() => {
    try {
      sessionStorage.setItem(CLAVE_MANIFIESTO, JSON.stringify(manifiesto))
    } catch {
      // Sin almacenamiento (modo privado o bloqueado): el manifiesto solo vive mientras la página esté abierta
    }
  }, [manifiesto])
  const lector = useRef(null)
  // Número de la última búsqueda: si llegan dos lecturas seguidas, se ignora la respuesta de la vieja
  const ultimaBusqueda = useRef(0)
  // Evita mandar dos veces la misma confirmación si presionan Ctrl+Enter muy rápido (antes de que React repinte)
  const enviando = useRef(false)

  function enfocarLector() {
    lector.current?.focus()
  }

  function descartar() {
    setLectura(null)
    setErrorLectura(null)
    setErrorMovimiento(null)
    enfocarLector()
  }

  // La ubicación propuesta es la que ya tiene el producto; se puede cambiar antes de confirmar
  function nuevaLectura(producto) {
    return {
      producto,
      cantidad: '1',
      pasillo: producto.pasillo,
      rack: producto.rack,
      gaveta: producto.gaveta,
      clave: nuevaClave(),
    }
  }

  function cambiarLectura(cambios) {
    setLectura({ ...lectura, ...cambios })
    setErrorMovimiento(null)
  }

  // Después de un botón (+10, −1...) el foco vuelve al lector: si quedara en el botón,
  // el Enter que manda el lector USB volvería a presionarlo
  function sumar(paso) {
    cambiarLectura({ cantidad: sumarCantidad(lectura.cantidad, paso) })
    enfocarLector()
  }

  async function confirmar() {
    const tipo = modo.tipoMovimiento
    const { producto } = lectura
    if (enviando.current || validarCantidad(tipo, lectura.cantidad, producto.existencias)) return

    enviando.current = true
    setConfirmando(true)
    setErrorMovimiento(null)
    try {
      const datos = {
        tipo,
        productoId: producto.id,
        cantidad: Number(lectura.cantidad),
        pasillo: lectura.pasillo.trim(),
        rack: lectura.rack.trim(),
        gaveta: lectura.gaveta.trim(),
        documento: documento.trim(),
      }
      const { movimiento } = await registrarMovimiento(datos, lectura.clave)
      setUltimoMovimiento(resumenMovimiento(movimiento, producto.nombre))
      const registro = { ...movimiento, nombre: producto.nombre, sku: producto.sku, clave: lectura.clave }
      setManifiesto((anterior) => [registro, ...anterior].slice(0, MAXIMO_MANIFIESTO))
      setLectura(null)
      enfocarLector()
    } catch (e) {
      // La lectura se queda con la misma clave: si se reintenta, el servidor no la duplica
      setErrorMovimiento(e.message)
    } finally {
      enviando.current = false
      setConfirmando(false)
    }
  }

  // Cambiar de modo descarta la lectura, porque una entrada a medias no debe convertirse en salida
  function cambiarModo(clave) {
    setParametros({ modo: clave }, { replace: true })
    descartar()
  }

  async function leer(codigo) {
    setErrorLectura(null)
    setUltimoMovimiento(null)
    if (lectura && esMismoProducto(codigo, lectura.producto)) {
      cambiarLectura({ cantidad: sumarCantidad(lectura.cantidad, 1) })
      return
    }

    const numero = ++ultimaBusqueda.current
    setBuscando(true)
    try {
      const producto = await buscarProductoPorCodigo(codigo)
      if (numero !== ultimaBusqueda.current) return
      setLectura(nuevaLectura(producto))
      setErrorMovimiento(null)
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
  // Ctrl+Enter confirma y Esc descarta la lectura actual.
  // Sin lista de dependencias: se vuelve a registrar en cada render para usar siempre la lectura y el modo actuales.
  useEffect(() => {
    function alPresionarTecla(e) {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && lectura) {
        e.preventDefault()
        confirmar()
        return
      }
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

          {ultimoMovimiento && !lectura && (
            <p role="status" className="escaner-exito">
              {ultimoMovimiento}
            </p>
          )}

          {lectura ? (
            <>
              <LecturaActual lectura={lectura} onDescartar={descartar} />
              <ConfirmacionMovimiento
                tipo={modo.tipoMovimiento}
                lectura={lectura}
                documento={documento}
                confirmando={confirmando}
                error={errorMovimiento}
                onCambiar={cambiarLectura}
                onSumar={sumar}
                onCambiarDocumento={setDocumento}
                onConfirmar={confirmar}
              />
            </>
          ) : (
            !errorLectura &&
            !ultimoMovimiento && (
              <p className="escaner-vacio">Modo {modo.titulo.toLowerCase()}: lee un código para empezar.</p>
            )
          )}
        </div>

        <ManifiestoSesion movimientos={manifiesto} />
      </div>
    </section>
  )
}
