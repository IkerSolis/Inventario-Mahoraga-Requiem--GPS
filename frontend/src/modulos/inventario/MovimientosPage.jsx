import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listarBodegas } from '../../api/bodegas.js'
import { listarMovimientos } from '../../api/inventario.js'
import { usePuede } from '../../auth/usePuede.js'
import Badge from '../../components/Badge.jsx'
import Boton from '../../components/Boton.jsx'
import Paginacion from '../../components/Paginacion.jsx'
import Select from '../../components/Select.jsx'
import Tabla from '../../components/Tabla.jsx'
import { SIN_DATO, formatoDinero } from '../productos/productoFormato.js'
import { ESTADOS_OPERACION, TIPOS_MOVIMIENTO, nombreBodega, textoFecha } from './inventarioFormato.js'
import { useCarga } from './useCarga.js'
import { useParametrosUrl } from './useParametrosUrl.js'
import { useProductos } from './useProductos.js'

// Lista de movimientos registrados (GET /inventory/movements), del más nuevo al más viejo.
// Solo consulta: las entradas y salidas se registran en el Escáner.
// Pendiente: formulario de movimientos (transferencias y devoluciones) y botón "Recibir" para
// transferencias en tránsito (POST /inventory/movements/:id/receive; la función ya está en src/api/).
export default function MovimientosPage() {
  const puede = usePuede()
  const [leer, cambiar] = useParametrosUrl()
  const tipo = TIPOS_MOVIMIENTO[leer('tipo')] ? leer('tipo') : ''
  const estado = ESTADOS_OPERACION[leer('estado')] ? leer('estado') : ''
  const productoId = Number(leer('producto')) || null
  const pagina = Number(leer('pagina')) || 1
  const porPagina = Number(leer('porPagina')) || 25

  const [bodegas, setBodegas] = useState([])
  useEffect(() => {
    listarBodegas()
      .then(setBodegas)
      .catch(() => setBodegas([]))
  }, [])

  const clave = [tipo, estado, productoId, pagina, porPagina].join('|')
  const { datos, cargando, error } = useCarga(clave, () =>
    listarMovimientos({ tipo, estado, productoId, pagina, porPagina }),
  )
  const producto = useProductos([
    ...(datos?.elementos.map((m) => m.productoId) ?? []),
    ...(productoId ? [productoId] : []),
  ])

  const columnas = [
    {
      clave: 'fecha',
      titulo: 'Fecha',
      render: (m) => <span className="inventario-sin-corte">{textoFecha(m.fecha)}</span>,
    },
    {
      clave: 'tipo',
      titulo: 'Tipo',
      render: (m) => {
        const t = TIPOS_MOVIMIENTO[m.tipo]
        return t ? <Badge tono={t.tono}>{t.texto}</Badge> : m.tipo
      },
    },
    {
      clave: 'producto',
      titulo: 'Producto',
      render: (m) => (
        <>
          <Link to={`/inventario/kardex/${m.productoId}`}>{producto(m.productoId).nombre}</Link>
          <div className="inventario-sku">
            {producto(m.productoId).sku}
            {m.lote && ` · Lote ${m.lote}`}
          </div>
        </>
      ),
    },
    {
      clave: 'bodega',
      titulo: 'Bodega',
      render: (m) =>
        m.tipo === 'transferencia'
          ? `${nombreBodega(bodegas, m.bodegaId)} → ${nombreBodega(bodegas, m.bodegaDestinoId)}`
          : nombreBodega(bodegas, m.bodegaId),
    },
    { clave: 'cantidad', titulo: 'Cantidad', alinear: 'derecha', render: (m) => <strong>{m.cantidad}</strong> },
    // Solo la UI la oculta; sin costs.read el servidor no manda el costo
    puede('costs.read') && {
      clave: 'costo',
      titulo: 'Costo unit.',
      alinear: 'derecha',
      render: (m) => (m.costoUnitario == null ? SIN_DATO : formatoDinero.format(m.costoUnitario)),
    },
    { clave: 'documento', titulo: 'Documento', render: (m) => m.documento || SIN_DATO },
    {
      clave: 'estado',
      titulo: 'Estado',
      render: (m) => {
        const e = ESTADOS_OPERACION[m.estado]
        return e ? (
          <Badge tono={e.tono} punto>
            {e.texto}
          </Badge>
        ) : (
          m.estado
        )
      },
    },
  ].filter(Boolean)

  const hayFiltros = Boolean(tipo || estado || productoId)
  const puedeEscanear = ['stock.receive', 'stock.issue'].some(puede)

  return (
    <div>
      <div className="inventario-encabezado">
        <h2>Movimientos</h2>
        {puedeEscanear && (
          <p className="inventario-nota">
            Las entradas y salidas se registran en el <Link to="/escaner">Escáner</Link>.
          </p>
        )}
      </div>

      <div className="inventario-filtros">
        <Select etiqueta="Tipo" value={tipo} onChange={(e) => cambiar({ tipo: e.target.value })}>
          <option value="">Todos</option>
          {Object.entries(TIPOS_MOVIMIENTO).map(([valor, t]) => (
            <option key={valor} value={valor}>
              {t.texto}
            </option>
          ))}
        </Select>
        <Select etiqueta="Estado" value={estado} onChange={(e) => cambiar({ estado: e.target.value })}>
          <option value="">Todos</option>
          {Object.entries(ESTADOS_OPERACION).map(([valor, e]) => (
            <option key={valor} value={valor}>
              {e.texto}
            </option>
          ))}
        </Select>
        {productoId && (
          <Boton variante="secundario" icono="close" onClick={() => cambiar({ producto: '' })}>
            Producto: {producto(productoId).nombre}
          </Boton>
        )}
        {hayFiltros && (
          <Boton
            variante="secundario"
            icono="filter_alt_off"
            onClick={() => cambiar({ tipo: '', estado: '', producto: '' })}
          >
            Limpiar filtros
          </Boton>
        )}
      </div>

      {error && (
        <p role="alert" className="inventario-aviso inventario-aviso-error">
          No se pudieron cargar los movimientos: {error}
        </p>
      )}
      {cargando && !datos && <p>Cargando movimientos…</p>}

      {datos && (
        <div aria-busy={cargando}>
          <p className="inventario-nota cifra">
            {datos.total.toLocaleString('es-MX')} {datos.total === 1 ? 'movimiento' : 'movimientos'}
          </p>
          <Tabla
            columnas={columnas}
            filas={datos.elementos}
            compacta
            mensajeVacio={hayFiltros ? 'Ningún movimiento coincide con los filtros.' : 'Todavía no hay movimientos.'}
          />
          <Paginacion
            pagina={pagina}
            porPagina={porPagina}
            totalElementos={datos.total}
            onCambiar={(n) => cambiar({ pagina: n })}
            onCambiarPorPagina={(n) => cambiar({ porPagina: n === 25 ? '' : n })}
          />
        </div>
      )}
    </div>
  )
}
