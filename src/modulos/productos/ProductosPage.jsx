import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { listarCategorias, listarProductos, restaurarProducto } from '../../api/productos.js'
import { usePuede } from '../../auth/usePuede.js'
import Badge from '../../components/Badge.jsx'
import Boton from '../../components/Boton.jsx'
import Input from '../../components/Input.jsx'
import Paginacion from '../../components/Paginacion.jsx'
import Select from '../../components/Select.jsx'
import Tabla from '../../components/Tabla.jsx'
import ArchivarProductoModal from './ArchivarProductoModal.jsx'
import ProductoModal from './ProductoModal.jsx'
import { ESTADOS_STOCK, formatoDinero } from './productoFormato.js'
import './productos.css'
import './ProductosPage.css'

export default function ProductosPage() {
  const puede = usePuede()

  // Búsqueda, filtros, página y "Ver archivados" viven en la URL (?q=...&categoria=...&pagina=2),
  // así se conservan al volver del detalle y se pueden compartir como enlace.
  const [parametros, setParametros] = useSearchParams()
  const pagina = Number(parametros.get('pagina')) || 1
  const porPagina = Number(parametros.get('porPagina')) || 25
  const busqueda = parametros.get('q') ?? ''
  const categoria = parametros.get('categoria') ?? ''
  const estadoStock = ESTADOS_STOCK[parametros.get('estado')] ? parametros.get('estado') : ''
  const verArchivados = parametros.get('archivados') === '1'

  // Cambia varios parámetros de la URL a la vez. Los vacíos se quitan para que la URL quede limpia.
  // replace: true para no llenar el historial con cada filtro; "atrás" regresa a la página anterior.
  function cambiarParametros(cambios) {
    setParametros(
      (actuales) => {
        const nuevos = new URLSearchParams(actuales)
        for (const [clave, valor] of Object.entries(cambios)) {
          if (valor === '' || valor === false || valor == null) nuevos.delete(clave)
          else nuevos.set(clave, String(valor))
        }
        return nuevos
      },
      { replace: true },
    )
  }

  // Cualquier cambio de filtro regresa a la página 1
  function cambiarFiltros(cambios) {
    cambiarParametros({ ...cambios, pagina: '' })
  }

  const [compacta, setCompacta] = useState(false)
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  // edicion: null = modal cerrado; { idProducto: null } = crear; { idProducto } = editar
  const [edicion, setEdicion] = useState(null)
  const [porArchivar, setPorArchivar] = useState(null) // producto que espera confirmación para archivarse
  const [restaurando, setRestaurando] = useState(null) // id del producto que se está restaurando
  const [aviso, setAviso] = useState(null) // { tipo: 'exito' | 'error', texto }
  const [recargas, setRecargas] = useState(0)

  // "texto" es lo que se escribe; pasa a la URL (?q=) 300 ms después de dejar de escribir
  const [texto, setTexto] = useState(busqueda)
  const [categorias, setCategorias] = useState([])
  const buscador = useRef(null)
  const hayFiltros = Boolean(busqueda || categoria || estadoStock)

  useEffect(() => {
    const espera = setTimeout(() => {
      // Solo si cambió, para no regresar a la página 1 sin motivo (por ejemplo, al volver del detalle)
      if (texto.trim() !== (parametros.get('q') ?? '')) cambiarFiltros({ q: texto.trim() })
    }, 300)
    return () => clearTimeout(espera)
  }, [texto]) // solo reacciona a lo que se escribe

  // Atajo Ctrl + / (Cmd + / en Mac) para ir al buscador.
  // También "/" sola, pero solo si no se está escribiendo en otro campo.
  useEffect(() => {
    function alPresionarTecla(e) {
      const escribiendo = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)
      if (e.key === '/' && (e.ctrlKey || e.metaKey || !escribiendo)) {
        e.preventDefault()
        buscador.current.focus()
      }
    }
    window.addEventListener('keydown', alPresionarTecla)
    return () => window.removeEventListener('keydown', alPresionarTecla)
  }, [])

  useEffect(() => {
    // Si fallan las categorías, el filtro solo muestra "Todas" y la tabla sigue funcionando
    listarCategorias().then(setCategorias).catch(() => setCategorias([]))
  }, [])

  function limpiarFiltros() {
    setTexto('')
    cambiarFiltros({ q: '', categoria: '', estado: '' })
  }

  useEffect(() => {
    // Si cambian de página o de filtro rápido, ignoramos la respuesta vieja que llegue tarde
    let vigente = true
    setCargando(true)
    setError(null)
    listarProductos({ pagina, porPagina, busqueda, categoria, estadoStock, archivados: verArchivados })
      .then((respuesta) => {
        if (vigente) setDatos(respuesta)
      })
      .catch((e) => {
        if (vigente) setError(e.message)
      })
      .finally(() => {
        if (vigente) setCargando(false)
      })
    return () => {
      vigente = false
    }
  }, [pagina, porPagina, busqueda, categoria, estadoStock, verArchivados, recargas])

  function abrirFormulario(idProducto) {
    setAviso(null)
    setEdicion({ idProducto })
  }

  // Al terminar de guardar o archivar: cerrar modales, avisar y volver a pedir la lista para ver el cambio
  function alTerminar(mensaje) {
    setEdicion(null)
    setPorArchivar(null)
    setAviso({ tipo: 'exito', texto: mensaje })
    setRecargas((n) => n + 1)
  }

  // Restaurar no pide confirmación porque no quita nada: solo regresa el producto a la lista
  async function restaurar(producto) {
    setAviso(null)
    setRestaurando(producto.id)
    try {
      await restaurarProducto(producto.id)
      alTerminar(`${producto.nombre} se restauró.`)
    } catch (e) {
      setAviso({ tipo: 'error', texto: `No se pudo restaurar: ${e.message}` })
    } finally {
      setRestaurando(null)
    }
  }

  // En archivados la única acción es restaurar; en activos, editar y archivar
  const hayAcciones = verArchivados
    ? puede('products.archive')
    : puede('products.update') || puede('products.archive')

  const columnas = [
    {
      clave: 'nombre',
      titulo: 'Producto',
      render: (p) => (
        <>
          {/* state: el detalle usa estos filtros para que "Volver al catálogo" regrese a la misma vista */}
          <Link to={`/productos/${p.id}`} state={{ filtrosLista: parametros.toString() }} className="producto-nombre">
            {p.nombre}
          </Link>
          <div className="producto-sku">{p.sku}</div>
        </>
      ),
    },
    { clave: 'categoria', titulo: 'Categoría', render: (p) => <Badge tono="info">{p.categoria}</Badge> },
    {
      clave: 'ubicacion',
      titulo: 'Ubicación',
      render: (p) => `Pasillo ${p.pasillo} · Rack ${p.rack} · Gaveta ${p.gaveta}`,
    },
    { clave: 'existencias', titulo: 'Existencias', alinear: 'derecha' },
    {
      clave: 'estadoStock',
      titulo: 'Estado',
      render: (p) => {
        const estado = ESTADOS_STOCK[p.estadoStock]
        return <Badge tono={estado.tono} punto>{estado.texto}</Badge>
      },
    },
    // Solo la UI la oculta; el servidor es quien decide si manda el costo
    puede('costs.read') && {
      clave: 'precioCompra',
      titulo: 'Costo',
      alinear: 'derecha',
      render: (p) => (p.precioCompra == null ? '—' : formatoDinero.format(p.precioCompra)),
    },
    {
      clave: 'precioVenta',
      titulo: 'Precio',
      alinear: 'derecha',
      // Precio 0 = lo creó alguien sin prices.manage y falta asignarlo
      render: (p) => (p.precioVenta === 0 ? <Badge tono="alerta">Sin precio</Badge> : formatoDinero.format(p.precioVenta)),
    },
    hayAcciones && {
      clave: 'acciones',
      titulo: 'Acciones',
      render: (p) => (
        <div className="productos-fila-acciones">
          {verArchivados ? (
            <Boton
              variante="secundario"
              icono="unarchive"
              cargando={restaurando === p.id}
              onClick={() => restaurar(p)}
            >
              Restaurar
            </Boton>
          ) : (
            <>
              {puede('products.update') && (
                <Boton variante="secundario" icono="edit" aria-label={`Editar ${p.nombre}`} onClick={() => abrirFormulario(p.id)} />
              )}
              {puede('products.archive') && (
                <Boton
                  variante="secundario"
                  icono="archive"
                  aria-label={`Archivar ${p.nombre}`}
                  onClick={() => {
                    setAviso(null)
                    setPorArchivar(p)
                  }}
                />
              )}
            </>
          )}
        </div>
      ),
    },
  ].filter(Boolean)

  return (
    <section>
      <header className="productos-encabezado">
        <div>
          <h1>Catálogo de productos</h1>
          {datos && (
            <p className="productos-total cifra">
              {datos.total.toLocaleString('es-MX')} {datos.total === 1 ? 'producto' : 'productos'}
              {verArchivados && (datos.total === 1 ? ' archivado' : ' archivados')}
            </p>
          )}
        </div>
        <div className="productos-acciones">
          <Boton
            variante="secundario"
            icono={compacta ? 'density_medium' : 'density_small'}
            aria-pressed={compacta}
            onClick={() => setCompacta(!compacta)}
          >
            {compacta ? 'Vista normal' : 'Vista compacta'}
          </Boton>
          {puede('products.create') && (
            <Boton icono="add" onClick={() => abrirFormulario(null)}>Nuevo producto</Boton>
          )}
        </div>
      </header>

      {aviso && (
        <p role={aviso.tipo === 'error' ? 'alert' : 'status'} className={`productos-aviso productos-aviso-${aviso.tipo}`}>
          {aviso.texto}
        </p>
      )}

      <div className="productos-filtros">
        <div className="productos-filtros-fila">
          <div className="productos-buscador">
            <Input
              ref={buscador}
              type="search"
              etiqueta={<>Buscar <kbd>Ctrl + /</kbd></>}
              placeholder="Nombre o SKU"
              aria-keyshortcuts="Control+/"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
            />
          </div>
          <Select
            etiqueta="Categoría"
            value={categoria}
            onChange={(e) => cambiarFiltros({ categoria: e.target.value })}
          >
            <option value="">Todas</option>
            {categorias.map((nombre) => (
              <option key={nombre} value={nombre}>{nombre}</option>
            ))}
          </Select>
        </div>

        <div className="productos-filtros-fila">
          <div className="productos-chips" role="group" aria-label="Estado de stock">
            <button
              type="button"
              className="productos-chip"
              aria-pressed={estadoStock === ''}
              onClick={() => cambiarFiltros({ estado: '' })}
            >
              Todos
            </button>
            {Object.entries(ESTADOS_STOCK).map(([valor, estado]) => (
              <button
                key={valor}
                type="button"
                className={`productos-chip productos-chip-${estado.tono}`}
                aria-pressed={estadoStock === valor}
                onClick={() => cambiarFiltros({ estado: valor })}
              >
                {estado.texto}
              </button>
            ))}
          </div>
          <div className="productos-acciones">
            {hayFiltros && (
              <Boton variante="secundario" icono="filter_alt_off" onClick={limpiarFiltros}>
                Limpiar filtros
              </Boton>
            )}
            <label className="productos-ver-archivados">
              <input
                type="checkbox"
                checked={verArchivados}
                onChange={(e) => {
                  cambiarFiltros({ archivados: e.target.checked ? '1' : '' })
                  setAviso(null)
                }}
              />
              Ver archivados
            </label>
          </div>
        </div>
      </div>

      {error && <p role="alert" className="productos-error">No se pudieron cargar los productos: {error}</p>}
      {cargando && !datos && <p>Cargando productos…</p>}

      {datos && (
        <div aria-busy={cargando}>
          <Tabla
            columnas={columnas}
            filas={datos.elementos}
            compacta={compacta}
            mensajeVacio={
              hayFiltros
                ? 'Ningún producto coincide con los filtros.'
                : verArchivados
                  ? 'No hay productos archivados.'
                  : 'No hay productos registrados.'
            }
          />
          <Paginacion
            pagina={pagina}
            porPagina={porPagina}
            totalElementos={datos.total}
            onCambiar={(n) => cambiarParametros({ pagina: n === 1 ? '' : n })}
            onCambiarPorPagina={(n) => cambiarFiltros({ porPagina: n === 25 ? '' : n })}
          />
        </div>
      )}

      {edicion && (
        <ProductoModal
          idProducto={edicion.idProducto}
          categorias={categorias}
          onCerrar={() => setEdicion(null)}
          onGuardado={alTerminar}
        />
      )}

      {porArchivar && (
        <ArchivarProductoModal
          producto={porArchivar}
          onCerrar={() => setPorArchivar(null)}
          onArchivado={alTerminar}
        />
      )}
    </section>
  )
}
