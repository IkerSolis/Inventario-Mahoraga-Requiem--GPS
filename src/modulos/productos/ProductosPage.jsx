import { useEffect, useState } from 'react'
import { listarProductos } from '../../api/productos.js'
import { usePuede } from '../../auth/usePuede.js'
import Badge from '../../components/Badge.jsx'
import Boton from '../../components/Boton.jsx'
import Paginacion from '../../components/Paginacion.jsx'
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

  useEffect(() => {
    // Si cambian de página rápido, ignoramos la respuesta vieja que llegue tarde
    let vigente = true
    setCargando(true)
    setError(null)
    listarProductos({ pagina, porPagina })
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
  }, [pagina, porPagina])

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
          {datos && <p className="productos-total cifra">{datos.total.toLocaleString('es-MX')} productos</p>}
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

      {error && <p role="alert" className="productos-error">No se pudieron cargar los productos: {error}</p>}
      {cargando && !datos && <p>Cargando productos…</p>}

      {datos && (
        <div aria-busy={cargando}>
          <Tabla
            columnas={columnas}
            filas={datos.elementos}
            compacta={compacta}
            mensajeVacio="No hay productos registrados."
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
