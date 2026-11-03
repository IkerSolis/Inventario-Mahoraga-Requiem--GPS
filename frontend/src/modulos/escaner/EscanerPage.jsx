import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { buscarProductoPorCodigo } from '../../api/productos.js'
import { usePuede } from '../../auth/usePuede.js'
import { registrarMovimiento } from '../../api/movimientos.js'
import Boton from '../../components/Boton.jsx'
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
import ImagenEscaner from './ImagenEscaner.jsx'
import ManifiestoSesion from './ManifiestoSesion.jsx'
import VistaCamara from './VistaCamara.jsx'
import { hayCamaraDisponible } from './lectorZxing.js'
import { sonar } from './sonido.js'
import './EscanerPage.css'

const CLAVE_MANIFIESTO = 'escaner-manifiesto'
const MAXIMO_MANIFIESTO = 200 // para no llenar el almacenamiento en una sesión muy larga

// Pantalla táctil sin mouse (teléfono o tableta)
function esPantallaTactil() {
  return window.matchMedia?.('(pointer: coarse)').matches ?? false
}

const CLAVE_OPCIONES = 'escaner-opciones'

function cargarOpciones() {
  try {
    return { sonido: true, autoEnvio: false, ...JSON.parse(localStorage.getItem(CLAVE_OPCIONES)) }
  } catch {
    return { sonido: true, autoEnvio: false }
  }
}

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
  const [documento, setDocumento] = useState('') // se conserva entre lecturas del mismo modo
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
  // Claves de las confirmaciones que van en camino. Evita mandar dos veces la misma lectura si presionan
  // Ctrl+Enter muy rápido (antes de que React repinte), sin bloquear lecturas distintas en auto-envío.
  const enviando = useRef(new Set())
  const [camaraAbierta, setCamaraAbierta] = useState(false)
  const [opciones, setOpciones] = useState(cargarOpciones) // { sonido, autoEnvio }

  // Las opciones son una preferencia de cada usuario en su navegador: se guardan en localStorage
  useEffect(() => {
    try {
      localStorage.setItem(CLAVE_OPCIONES, JSON.stringify(opciones))
    } catch {
      // Sin almacenamiento: las opciones vuelven a su valor inicial al recargar
    }
  }, [opciones])

  // En auditoría se escribe lo contado, así que no tiene sentido registrar 1 automáticamente en cada lectura
  const autoEnvioActivo = opciones.autoEnvio && modo?.tipoMovimiento !== 'conteo'

  function pitar(tipo) {
    if (opciones.sonido) sonar(tipo)
  }

  // En teléfono no se devuelve el foco al campo: no hay lector USB y abriría el teclado en cada lectura
  function enfocarLector() {
    if (esPantallaTactil()) return
    lector.current?.focus()
  }

  function abrirCamara() {
    if (!hayCamaraDisponible()) {
      setErrorLectura('La cámara solo funciona en https o en localhost. Desde el teléfono usa "npm run dev:red".')
      return
    }
    setErrorLectura(null)
    setCamaraAbierta(true)
  }

  function errorDeCamara(mensaje) {
    setCamaraAbierta(false)
    setErrorLectura(mensaje)
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

  // objetivo: la lectura a confirmar. Normalmente la de la pantalla; con auto-envío, la recién leída.
  async function confirmar(objetivo = lectura) {
    const tipo = modo.tipoMovimiento
    const { producto } = objetivo
    if (enviando.current.has(objetivo.clave)) return
    const problema = validarCantidad(tipo, objetivo.cantidad, producto.existencias)
    if (problema) {
      // Con el botón no llega aquí (está deshabilitado); con auto-envío sí, por ejemplo una salida sin stock.
      // El mensaje ya se ve bajo la cantidad (la lectura queda en pantalla), así que solo suena el error.
      pitar('error')
      return
    }

    enviando.current.add(objetivo.clave)
    setConfirmando(true)
    setErrorMovimiento(null)
    try {
      const datos = {
        tipo,
        productoId: producto.id,
        cantidad: Number(objetivo.cantidad),
        pasillo: objetivo.pasillo.trim(),
        rack: objetivo.rack.trim(),
        gaveta: objetivo.gaveta.trim(),
        documento: documento.trim(),
      }
      const { movimiento } = await registrarMovimiento(datos, objetivo.clave)
      setUltimoMovimiento(resumenMovimiento(movimiento, producto.nombre))
      const registro = { ...movimiento, nombre: producto.nombre, sku: producto.sku, clave: objetivo.clave }
      setManifiesto((anterior) => [registro, ...anterior].slice(0, MAXIMO_MANIFIESTO))
      setLectura(null)
      pitar('ok')
      enfocarLector()
    } catch (e) {
      // La lectura se queda con la misma clave: si se reintenta, el servidor no la duplica
      setErrorMovimiento(e.message)
      pitar('error')
    } finally {
      enviando.current.delete(objetivo.clave)
      setConfirmando(enviando.current.size > 0)
    }
  }

  // Cambiar de modo descarta la lectura y el documento: una entrada a medias no debe convertirse en salida,
  // y la orden de compra de una recepción no corresponde a un despacho
  function cambiarModo(clave) {
    setParametros({ modo: clave }, { replace: true })
    setDocumento('')
    descartar()
  }

  async function leer(codigo) {
    setErrorLectura(null)
    setUltimoMovimiento(null)
    // Con auto-envío cada lectura se registra sola, así que no se suma a la lectura en pantalla
    if (!autoEnvioActivo && lectura && esMismoProducto(codigo, lectura.producto)) {
      cambiarLectura({ cantidad: sumarCantidad(lectura.cantidad, 1) })
      pitar('ok')
      return
    }

    const numero = ++ultimaBusqueda.current
    // En modo manual solo importa la última lectura (la que se ve); con auto-envío cada lectura es una pieza
    // y ninguna se puede descartar, aunque lleguen varias antes de que responda la primera
    const esVieja = () => !autoEnvioActivo && numero !== ultimaBusqueda.current
    setBuscando(true)
    try {
      const producto = await buscarProductoPorCodigo(codigo)
      if (esVieja()) return
      const nueva = nuevaLectura(producto)
      setLectura(nueva)
      setErrorMovimiento(null)
      // Auto-envío: registra 1 pieza en cuanto se lee (el pitido lo da la confirmación)
      if (autoEnvioActivo) confirmar(nueva)
      else pitar('ok')
    } catch (e) {
      if (esVieja()) return
      setLectura(null)
      setErrorLectura(e.estado === 404 ? `No existe un producto con el código ${codigo}` : e.message)
      pitar('error')
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
          <div className="escaner-opciones">
            <label>
              <input
                type="checkbox"
                checked={opciones.sonido}
                onChange={(e) => setOpciones({ ...opciones, sonido: e.target.checked })}
              />
              Sonido
            </label>
            <label>
              <input
                type="checkbox"
                checked={opciones.autoEnvio}
                disabled={modo.tipoMovimiento === 'conteo'}
                aria-describedby="ayuda-auto-envio"
                onChange={(e) => setOpciones({ ...opciones, autoEnvio: e.target.checked })}
              />
              Auto-envío
            </label>
            <span id="ayuda-auto-envio" className="escaner-opciones-ayuda">
              {modo.tipoMovimiento === 'conteo'
                ? 'No disponible en auditoría: ahí se escribe lo contado.'
                : 'Registra 1 pieza en cuanto se lee el código, sin confirmar.'}
            </span>
          </div>

          <LectorCodigo ref={lector} onLeer={leer} buscando={buscando} autoEnfocar={!esPantallaTactil()} />

          <div className="escaner-alternativas">
            {!camaraAbierta && (
              <Boton variante="secundario" icono="photo_camera" onClick={abrirCamara}>
                Usar cámara
              </Boton>
            )}
            <ImagenEscaner onLeer={leer} onError={setErrorLectura} />
          </div>
          {camaraAbierta && (
            <VistaCamara onLeer={leer} onError={errorDeCamara} onCerrar={() => setCamaraAbierta(false)} />
          )}

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
                onConfirmar={() => confirmar()}
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
