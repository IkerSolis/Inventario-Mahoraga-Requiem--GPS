import { useEffect, useState } from 'react'
import { listarBodegas } from '../../api/bodegas.js'
import { aprobarAjuste, listarAjustes, rechazarAjuste, solicitarAjuste } from '../../api/inventario.js'
import { buscarProductoPorCodigo } from '../../api/productos.js'
import { useSesion } from '../../auth/SesionContext.jsx'
import { usePuede } from '../../auth/usePuede.js'
import Badge from '../../components/Badge.jsx'
import Boton from '../../components/Boton.jsx'
import Input from '../../components/Input.jsx'
import Paginacion from '../../components/Paginacion.jsx'
import Select from '../../components/Select.jsx'
import Tabla from '../../components/Tabla.jsx'
import Textarea from '../../components/Textarea.jsx'
import { erroresPorCampo } from '../productos/productoSchema.js'
import { ajusteSchema } from './ajusteSchema.js'
import { nombreBodega, textoFecha } from './inventarioFormato.js'
import { useCarga } from './useCarga.js'
import { useParametrosUrl } from './useParametrosUrl.js'
import { useProductos } from './useProductos.js'

// Ajustes de existencias: quien tiene stock.adjust.request los solicita; quien tiene stock.adjust.approve
// revisa la bandeja y aprueba o rechaza. Nadie aprueba ni rechaza lo que él mismo solicitó
// (la UI oculta los botones; el servidor responde 403).
// Los conteos cíclicos con diferencia también llegan aquí como ajustes pendientes.
export default function AjustesPage() {
  const puede = usePuede()
  const [bodegas, setBodegas] = useState([])
  const [recargas, setRecargas] = useState(0) // al solicitar uno, la bandeja se vuelve a pedir

  useEffect(() => {
    listarBodegas()
      .then((todas) => setBodegas(todas))
      .catch(() => setBodegas([]))
  }, [])

  return (
    <div className="ajustes">
      {puede('stock.adjust.request') && (
        <SolicitarAjuste bodegas={bodegas.filter((b) => b.activa)} onSolicitado={() => setRecargas((n) => n + 1)} />
      )}
      {puede('stock.adjust.approve') ? (
        <BandejaAjustes bodegas={bodegas} recargas={recargas} />
      ) : (
        <p className="inventario-nota">Las solicitudes las aprueba otro usuario con permiso de aprobar ajustes.</p>
      )}
    </div>
  )
}

const VALORES_VACIOS = { bodegaId: '', tipo: '', cantidad: '', motivo: '', evidencia: '' }

function SolicitarAjuste({ bodegas, onSolicitado }) {
  const [codigo, setCodigo] = useState('')
  const [producto, setProducto] = useState(null)
  const [errorProducto, setErrorProducto] = useState(null)
  const [buscando, setBuscando] = useState(false)
  const [valores, setValores] = useState(VALORES_VACIOS)
  const [errores, setErrores] = useState({})
  const [enviando, setEnviando] = useState(false)
  const [aviso, setAviso] = useState(null)

  // La bodega empieza en la primera activa
  const bodegaId = valores.bodegaId || (bodegas[0] ? String(bodegas[0].id) : '')

  async function buscar(e) {
    e.preventDefault()
    if (!codigo.trim()) return
    setBuscando(true)
    setErrorProducto(null)
    try {
      setProducto(await buscarProductoPorCodigo(codigo))
    } catch (error) {
      setProducto(null)
      setErrorProducto(error.message)
    } finally {
      setBuscando(false)
    }
  }

  function cambiar(e) {
    const { name, value } = e.target
    setValores({ ...valores, [name]: value })
    if (errores[name]) setErrores({ ...errores, [name]: undefined })
  }

  async function enviar(e) {
    e.preventDefault()
    setAviso(null)
    const resultado = ajusteSchema.safeParse({ ...valores, bodegaId })
    const sinProducto = producto ? {} : { producto: 'Busca y elige el producto' }
    if (!resultado.success || !producto) {
      setErrores({ ...(resultado.success ? {} : erroresPorCampo(resultado.error)), ...sinProducto })
      return
    }
    setEnviando(true)
    try {
      await solicitarAjuste({ ...resultado.data, productoId: producto.id })
      setAviso({ tipo: 'exito', texto: `Ajuste de ${producto.nombre} solicitado. Queda pendiente de aprobación.` })
      setValores(VALORES_VACIOS)
      setProducto(null)
      setCodigo('')
      setErrores({})
      onSolicitado()
    } catch (error) {
      setAviso({ tipo: 'error', texto: `No se pudo solicitar: ${error.message}` })
    } finally {
      setEnviando(false)
    }
  }

  const campo = (nombre) => ({ name: nombre, value: valores[nombre], onChange: cambiar, error: errores[nombre] })

  return (
    <section className="ajustes-panel" aria-labelledby="titulo-solicitar">
      <h2 id="titulo-solicitar">Solicitar ajuste</h2>
      {aviso && (
        <p
          role={aviso.tipo === 'error' ? 'alert' : 'status'}
          className={`inventario-aviso inventario-aviso-${aviso.tipo}`}
        >
          {aviso.texto}
        </p>
      )}

      {/* Buscar el producto es un formulario aparte: Enter en el código busca, no envía la solicitud */}
      <form className="ajustes-producto" onSubmit={buscar}>
        <Input
          etiqueta="Producto (código de barras o SKU)"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          error={errorProducto ?? errores.producto}
        />
        <Boton type="submit" variante="secundario" icono="search" cargando={buscando}>
          Buscar
        </Boton>
      </form>
      {producto && (
        <p className="ajustes-elegido">
          <span className="material-symbols-outlined" aria-hidden="true">
            check_circle
          </span>
          {producto.nombre} <span className="inventario-sku">{producto.sku}</span>
        </p>
      )}

      <form className="ajustes-formulario" onSubmit={enviar} noValidate>
        <Select etiqueta="Bodega" {...campo('bodegaId')} value={bodegaId}>
          {bodegas.map((b) => (
            <option key={b.id} value={b.id}>
              {b.codigo} · {b.nombre}
            </option>
          ))}
        </Select>
        <Select etiqueta="Tipo" {...campo('tipo')}>
          <option value="">Elige…</option>
          <option value="positivo">Positivo (sumar)</option>
          <option value="negativo">Negativo (restar)</option>
        </Select>
        <Input etiqueta="Cantidad" type="number" min={1} step={1} inputMode="numeric" {...campo('cantidad')} />
        <div className="ajustes-completo">
          <Textarea etiqueta="Motivo" maxLength={500} {...campo('motivo')} />
        </div>
        <div className="ajustes-completo">
          <Input etiqueta="Evidencia (URL, opcional)" maxLength={500} {...campo('evidencia')} />
        </div>
        <div className="ajustes-completo">
          <Boton type="submit" icono="send" cargando={enviando}>
            Solicitar ajuste
          </Boton>
        </div>
      </form>
    </section>
  )
}

const ESTADOS = {
  pendiente: { texto: 'Pendientes', tono: 'alerta' },
  aprobado: { texto: 'Aprobados', tono: 'optimo' },
  rechazado: { texto: 'Rechazados', tono: 'neutro' },
}

function BandejaAjustes({ bodegas, recargas }) {
  const { usuario } = useSesion()
  const [leer, cambiar] = useParametrosUrl()
  const estado = ESTADOS[leer('estado')] ? leer('estado') : 'pendiente'
  const pagina = Number(leer('pagina')) || 1
  const porPagina = 25
  const [procesando, setProcesando] = useState(null) // id del ajuste que se está aprobando o rechazando
  const [aviso, setAviso] = useState(null)
  const [cambios, setCambios] = useState(0)

  const clave = [estado, pagina, recargas, cambios].join('|')
  const { datos, cargando, error } = useCarga(clave, () => listarAjustes({ estado, pagina, porPagina }))
  const producto = useProductos(datos?.elementos.map((a) => a.productoId) ?? [])

  async function resolver(ajuste, aprobar) {
    setProcesando(ajuste.id)
    setAviso(null)
    const nombre = producto(ajuste.productoId).nombre
    try {
      if (aprobar) {
        const { existenciasAntes, existenciasDespues } = await aprobarAjuste(ajuste.id)
        setAviso({ tipo: 'exito', texto: `Ajuste aprobado: ${nombre} (${existenciasAntes} → ${existenciasDespues}).` })
      } else {
        await rechazarAjuste(ajuste.id)
        setAviso({ tipo: 'exito', texto: `Ajuste de ${nombre} rechazado. Las existencias no cambiaron.` })
      }
      setCambios((n) => n + 1)
    } catch (e) {
      setAviso({ tipo: 'error', texto: `No se pudo ${aprobar ? 'aprobar' : 'rechazar'}: ${e.message}` })
    } finally {
      setProcesando(null)
    }
  }

  const columnas = [
    {
      clave: 'fecha',
      titulo: 'Fecha',
      render: (a) => <span className="inventario-sin-corte">{textoFecha(a.fecha)}</span>,
    },
    {
      clave: 'producto',
      titulo: 'Producto',
      render: (a) => (
        <>
          {producto(a.productoId).nombre}
          <div className="inventario-sku">{producto(a.productoId).sku}</div>
        </>
      ),
    },
    { clave: 'bodega', titulo: 'Bodega', render: (a) => nombreBodega(bodegas, a.bodegaId) },
    {
      clave: 'cantidad',
      titulo: 'Ajuste',
      alinear: 'derecha',
      render: (a) => (
        <Badge tono={a.tipo === 'positivo' ? 'optimo' : 'alerta'}>
          {a.tipo === 'positivo' ? '+' : '−'}
          {a.cantidad}
        </Badge>
      ),
    },
    {
      clave: 'motivo',
      titulo: 'Motivo',
      render: (a) => (
        <>
          {a.motivo}
          {a.evidencia && (
            <div>
              <a href={a.evidencia} target="_blank" rel="noreferrer">
                Evidencia
              </a>
            </div>
          )}
        </>
      ),
    },
    {
      clave: 'solicito',
      titulo: 'Solicitó',
      render: (a) => (a.solicitadoPor === usuario.id ? 'Tú' : `Usuario ${a.solicitadoPor}`),
    },
    estado === 'pendiente' && {
      clave: 'acciones',
      titulo: 'Acciones',
      render: (a) =>
        a.solicitadoPor === usuario.id ? (
          <span className="inventario-nota">Lo aprueba otra persona</span>
        ) : (
          <div className="inventario-acciones">
            <Boton
              icono="check"
              cargando={procesando === a.id}
              disabled={procesando !== null}
              onClick={() => resolver(a, true)}
            >
              Aprobar
            </Boton>
            <Boton
              variante="secundario"
              icono="close"
              disabled={procesando !== null}
              onClick={() => resolver(a, false)}
            >
              Rechazar
            </Boton>
          </div>
        ),
    },
  ].filter(Boolean)

  return (
    <section className="ajustes-panel" aria-labelledby="titulo-bandeja">
      <div className="inventario-encabezado">
        <h2 id="titulo-bandeja">Bandeja de ajustes</h2>
        <div className="inventario-chips" role="group" aria-label="Estado del ajuste">
          {Object.entries(ESTADOS).map(([valor, e]) => (
            <button
              key={valor}
              type="button"
              className="inventario-chip"
              aria-pressed={estado === valor}
              onClick={() => cambiar({ estado: valor === 'pendiente' ? '' : valor })}
            >
              {e.texto}
            </button>
          ))}
        </div>
      </div>

      {aviso && (
        <p
          role={aviso.tipo === 'error' ? 'alert' : 'status'}
          className={`inventario-aviso inventario-aviso-${aviso.tipo}`}
        >
          {aviso.texto}
        </p>
      )}
      {error && (
        <p role="alert" className="inventario-aviso inventario-aviso-error">
          No se pudieron cargar los ajustes: {error}
        </p>
      )}
      {cargando && !datos && <p>Cargando ajustes…</p>}
      {datos && (
        <div aria-busy={cargando}>
          <Tabla
            columnas={columnas}
            filas={datos.elementos}
            compacta
            mensajeVacio={estado === 'pendiente' ? 'No hay ajustes pendientes.' : 'No hay ajustes en este estado.'}
          />
          <Paginacion
            pagina={pagina}
            porPagina={porPagina}
            totalElementos={datos.total}
            onCambiar={(n) => cambiar({ pagina: n })}
          />
        </div>
      )}
    </section>
  )
}
