import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { listarBodegas } from '../../api/bodegas.js'
import { existenciasDeProducto } from '../../api/inventario.js'
import { buscarProductoPorCodigo } from '../../api/productos.js'
import { usePuede } from '../../auth/usePuede.js'
import Boton from '../../components/Boton.jsx'
import Select from '../../components/Select.jsx'
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
import { registrarLectura } from './registrarLectura.js'
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

  // Bodega donde se registra todo. Vive en la URL (?bodega=2); por defecto, la primera activa.
  const [bodegas, setBodegas] = useState(null) // [{ id, codigo, nombre, sucursal, activa }]
  const [errorBodegas, setErrorBodegas] = useState(null)
  const bodega = bodegas?.find((b) => String(b.id) === parametros.get('bodega')) ?? bodegas?.[0] ?? null

  useEffect(() => {
    listarBodegas()
      .then((todas) => setBodegas(todas.filter((b) => b.activa)))
      .catch((e) => setErrorBodegas(e.message))
  }, [])

  // lectura: producto leído y datos de la confirmación, o null.
  // { producto (con existencias, disponible y ubicación en la bodega), cantidad (texto del input), clave (idempotencia) }
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

  // stock: { fisico, disponible, pasillo, rack, gaveta } del producto en la bodega elegida.
  // La ubicación solo se muestra; se edita en Inventario › Existencias.
  function nuevaLectura(producto, stock) {
    const { fisico, disponible, pasillo, rack, gaveta } = stock
    return {
      producto: { ...producto, existencias: fisico, disponible, pasillo, rack, gaveta },
      cantidad: '1',
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
    const problema = validarCantidad(tipo, objetivo.cantidad, producto.disponible)
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
      const lecturaEnviada = { producto, cantidad: Number(objetivo.cantidad), clave: objetivo.clave }
      const movimiento = await registrarLectura(tipo, lecturaEnviada, bodega, documento.trim())
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

  // Cambia un parámetro de la URL sin perder los demás (modo y bodega)
  function cambiarParametro(nombre, valor) {
    setParametros(
      (actuales) => {
        const nuevos = new URLSearchParams(actuales)
        nuevos.set(nombre, valor)
        return nuevos
      },
      { replace: true },
    )
  }

  // Cambiar de modo descarta la lectura y el documento: una entrada a medias no debe convertirse en salida,
  // y la orden de compra de una recepción no corresponde a un despacho
  function cambiarModo(clave) {
    cambiarParametro('modo', clave)
    setDocumento('')
    descartar()
  }

  // Cambiar de bodega descarta la lectura: sus existencias eran de la bodega anterior
  function cambiarBodega(id) {
    cambiarParametro('bodega', id)
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
      // Si no se pueden consultar las existencias, se sigue sin ellas: el servidor valida al confirmar
      const sinDato = { fisico: null, disponible: null, pasillo: null, rack: null, gaveta: null }
      const stock = await existenciasDeProducto(producto.id, bodega.id).catch(() => sinDato)
      if (esVieja()) return
      const nueva = nuevaLectura(producto, stock)
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

  if (!bodegas || bodegas.length === 0) {
    return (
      <section>
        <h1>Escáner</h1>
        {errorBodegas ? (
          <p role="alert" className="escaner-error">
            No se pudieron cargar las bodegas: {errorBodegas}
          </p>
        ) : bodegas ? (
          <p className="escaner-sin-permiso">No hay bodegas activas. Se dan de alta en Configuración.</p>
        ) : (
          <p>Cargando bodegas…</p>
        )}
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
        <div className="escaner-bodega">
          <Select etiqueta="Bodega" value={bodega.id} onChange={(e) => cambiarBodega(e.target.value)}>
            {bodegas.map((b) => (
              <option key={b.id} value={b.id}>
                {b.codigo} · {b.nombre}
              </option>
            ))}
          </Select>
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
              <LecturaActual lectura={lectura} bodega={bodega} onDescartar={descartar} />
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
