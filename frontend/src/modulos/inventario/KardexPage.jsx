import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { listarBodegas } from '../../api/bodegas.js'
import { verKardex } from '../../api/inventario.js'
import { listarProductos, obtenerProducto } from '../../api/productos.js'
import { usePuede } from '../../auth/usePuede.js'
import Input from '../../components/Input.jsx'
import Select from '../../components/Select.jsx'
import Tabla from '../../components/Tabla.jsx'
import { SIN_DATO, formatoDinero } from '../productos/productoFormato.js'
import { TIPOS_KARDEX, nombreBodega, textoFecha } from './inventarioFormato.js'
import { useCarga } from './useCarga.js'
import { useParametrosUrl } from './useParametrosUrl.js'

// Kardex de un producto (GET /inventory/kardex/:productId): cada entrada y salida con el saldo
// antes y después, del más viejo al más nuevo. Sin producto en la URL, primero se busca uno.
export default function KardexPage() {
  const { productoId } = useParams()
  return productoId ? <KardexProducto productoId={Number(productoId)} /> : <ElegirProducto />
}

function ElegirProducto() {
  const [texto, setTexto] = useState('')
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => {
    const espera = setTimeout(() => setBusqueda(texto.trim()), 300)
    return () => clearTimeout(espera)
  }, [texto])

  const { datos, cargando, error } = useCarga(busqueda, () =>
    busqueda ? listarProductos({ busqueda, porPagina: 10 }) : Promise.resolve(null),
  )

  return (
    <div>
      <h2>Kardex</h2>
      <p className="inventario-nota">Busca un producto para ver su historial de entradas, salidas y saldos.</p>
      <div className="inventario-filtros">
        <div className="inventario-filtros-busqueda">
          <Input
            type="search"
            etiqueta="Producto"
            placeholder="Nombre, SKU o código de barras"
            autoFocus
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
        </div>
      </div>
      {error && (
        <p role="alert" className="inventario-aviso inventario-aviso-error">
          No se pudieron buscar productos: {error}
        </p>
      )}
      {busqueda && cargando && <p>Buscando…</p>}
      {datos && datos.elementos.length === 0 && <p>Ningún producto coincide con «{busqueda}».</p>}
      {datos && datos.elementos.length > 0 && (
        <ul className="kardex-resultados">
          {datos.elementos.map((p) => (
            <li key={p.id}>
              <Link to={`/inventario/kardex/${p.id}`}>{p.nombre}</Link> <span className="inventario-sku">{p.sku}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function KardexProducto({ productoId }) {
  const puede = usePuede()
  const [leer, cambiar] = useParametrosUrl()
  const bodegaId = leer('bodega')
  const [bodegas, setBodegas] = useState([])
  const [producto, setProducto] = useState(null)

  useEffect(() => {
    listarBodegas()
      .then(setBodegas)
      .catch(() => setBodegas([]))
  }, [])

  useEffect(() => {
    obtenerProducto(productoId)
      .then(setProducto)
      .catch(() => setProducto({ nombre: `Producto ${productoId}`, sku: '' }))
  }, [productoId])

  const { datos, cargando, error } = useCarga(`${productoId}|${bodegaId}`, () =>
    verKardex(productoId, bodegaId || undefined),
  )

  const columnas = [
    {
      clave: 'fecha',
      titulo: 'Fecha',
      render: (k) => <span className="inventario-sin-corte">{textoFecha(k.fecha)}</span>,
    },
    { clave: 'tipo', titulo: 'Movimiento', render: (k) => TIPOS_KARDEX[k.tipo]?.texto ?? k.tipo },
    { clave: 'bodega', titulo: 'Bodega', render: (k) => nombreBodega(bodegas, k.bodegaId) },
    { clave: 'documento', titulo: 'Documento', render: (k) => k.documento || SIN_DATO },
    {
      clave: 'entrada',
      titulo: 'Entrada',
      alinear: 'derecha',
      render: (k) => (TIPOS_KARDEX[k.tipo]?.entra ? <span className="kardex-entra">+{k.cantidad}</span> : ''),
    },
    {
      clave: 'salida',
      titulo: 'Salida',
      alinear: 'derecha',
      render: (k) => (TIPOS_KARDEX[k.tipo]?.entra === false ? <span className="kardex-sale">−{k.cantidad}</span> : ''),
    },
    { clave: 'saldo', titulo: 'Saldo', alinear: 'derecha', render: (k) => <strong>{k.existenciasDespues}</strong> },
    // Solo la UI las oculta; sin costs.read el servidor no manda costos
    puede('costs.read') && {
      clave: 'costo',
      titulo: 'Costo unit.',
      alinear: 'derecha',
      render: (k) => (k.costoUnitario == null ? SIN_DATO : formatoDinero.format(k.costoUnitario)),
    },
    puede('costs.read') && {
      clave: 'promedio',
      titulo: 'Costo prom.',
      alinear: 'derecha',
      render: (k) => (k.costoPromedio == null ? SIN_DATO : formatoDinero.format(k.costoPromedio)),
    },
  ].filter(Boolean)

  return (
    <div>
      <Link to="/inventario/kardex" className="kardex-volver">
        <span className="material-symbols-outlined" aria-hidden="true">
          arrow_back
        </span>
        Otro producto
      </Link>
      <div className="inventario-encabezado">
        <div>
          <h2>Kardex · {producto ? producto.nombre : '…'}</h2>
          {producto?.sku && <span className="inventario-sku">{producto.sku}</span>}
        </div>
        <Link to={`/inventario/movimientos?producto=${productoId}`}>Ver sus movimientos</Link>
      </div>

      <div className="inventario-filtros">
        <Select etiqueta="Bodega" value={bodegaId} onChange={(e) => cambiar({ bodega: e.target.value })}>
          <option value="">Todas</option>
          {bodegas.map((b) => (
            <option key={b.id} value={b.id}>
              {b.codigo} · {b.nombre}
            </option>
          ))}
        </Select>
      </div>

      {error && (
        <p role="alert" className="inventario-aviso inventario-aviso-error">
          No se pudo cargar el kardex: {error}
        </p>
      )}
      {cargando && !datos && <p>Cargando kardex…</p>}
      {datos && (
        <div aria-busy={cargando}>
          {!bodegaId && datos.length > 0 && (
            <p className="inventario-nota">El saldo de cada renglón es el de su bodega. Elige una para ver solo esa.</p>
          )}
          <Tabla columnas={columnas} filas={datos} compacta mensajeVacio="Este producto no tiene movimientos." />
        </div>
      )}
    </div>
  )
}
