import { useEffect, useRef, useState } from 'react'
import { listarCategorias, listarProductos } from '../../api/productos.js'
import { usePuede } from '../../auth/usePuede.js'
import Badge from '../../components/Badge.jsx'
import Boton from '../../components/Boton.jsx'
import Input from '../../components/Input.jsx'
import Paginacion from '../../components/Paginacion.jsx'
import Select from '../../components/Select.jsx'
import Tabla from '../../components/Tabla.jsx'
import './ProductosPage.css'

const ESTADOS_STOCK = {
  disponible: { tono: 'optimo', texto: 'Óptimo' },
  bajo: { tono: 'alerta', texto: 'Stock bajo' },
  agotado: { tono: 'neutro', texto: 'Agotado' },
}

const formatoDinero = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })

export default function ProductosPage() {
  const puede = usePuede()
  const [pagina, setPagina] = useState(1)
  const [porPagina, setPorPagina] = useState(25)
  const [compacta, setCompacta] = useState(false)
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  // Filtros. "texto" es lo que se escribe; "busqueda" es lo que se manda, 300 ms después de dejar de escribir
  const [texto, setTexto] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [categoria, setCategoria] = useState('')
  const [estadoStock, setEstadoStock] = useState('')
  const [categorias, setCategorias] = useState([])
  const buscador = useRef(null)
  const hayFiltros = Boolean(busqueda || categoria || estadoStock)

  useEffect(() => {
    const espera = setTimeout(() => {
      setBusqueda(texto.trim())
      setPagina(1)
    }, 300)
    return () => clearTimeout(espera)
  }, [texto])

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
    setBusqueda('')
    setCategoria('')
    setEstadoStock('')
    setPagina(1)
  }

  useEffect(() => {
    // Si cambian de página o de filtro rápido, ignoramos la respuesta vieja que llegue tarde
    let vigente = true
    setCargando(true)
    setError(null)
    listarProductos({ pagina, porPagina, busqueda, categoria, estadoStock })
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
  }, [pagina, porPagina, busqueda, categoria, estadoStock])

  const columnas = [
    {
      clave: 'nombre',
      titulo: 'Producto',
      render: (p) => (
        <>
          <div className="producto-nombre">{p.nombre}</div>
          <div className="producto-sku">{p.sku}</div>
        </>
      ),
    },
    { clave: 'categoria', titulo: 'Categoría', render: (p) => <Badge tono="info">{p.categoria}</Badge> },
    {
      clave: 'ubicacion',
      titulo: 'Ubicación',
      render: (p) => `Pasillo ${p.ubicacion.pasillo} · Rack ${p.ubicacion.rack} · Gaveta ${p.ubicacion.gaveta}`,
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
      render: (p) => formatoDinero.format(p.precioVenta),
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
            </p>
          )}
        </div>
        <Boton
          variante="secundario"
          icono={compacta ? 'density_medium' : 'density_small'}
          aria-pressed={compacta}
          onClick={() => setCompacta(!compacta)}
        >
          {compacta ? 'Vista normal' : 'Vista compacta'}
        </Boton>
      </header>

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
            onChange={(e) => {
              setCategoria(e.target.value)
              setPagina(1)
            }}
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
              onClick={() => {
                setEstadoStock('')
                setPagina(1)
              }}
            >
              Todos
            </button>
            {Object.entries(ESTADOS_STOCK).map(([valor, estado]) => (
              <button
                key={valor}
                type="button"
                className={`productos-chip productos-chip-${estado.tono}`}
                aria-pressed={estadoStock === valor}
                onClick={() => {
                  setEstadoStock(valor)
                  setPagina(1)
                }}
              >
                {estado.texto}
              </button>
            ))}
          </div>
          {hayFiltros && (
            <Boton variante="secundario" icono="filter_alt_off" onClick={limpiarFiltros}>
              Limpiar filtros
            </Boton>
          )}
        </div>
      </div>

      {error &&<p role="alert" className="productos-error">No se pudieron cargar los productos: {error}</p>}
      {cargando && !datos && <p>Cargando productos…</p>}

      {datos && (
        <div aria-busy={cargando}>
          <Tabla
            columnas={columnas}
            filas={datos.elementos}
            compacta={compacta}
            mensajeVacio={hayFiltros ? 'Ningún producto coincide con los filtros.' : 'No hay productos registrados.'}
          />
          <Paginacion
            pagina={pagina}
            porPagina={porPagina}
            totalElementos={datos.total}
            onCambiar={setPagina}
            onCambiarPorPagina={(n) => {
              setPorPagina(n)
              setPagina(1)
            }}
          />
        </div>
      )}
    </section>
  )
}
