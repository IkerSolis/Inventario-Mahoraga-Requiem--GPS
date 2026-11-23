import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listarBodegas } from '../../api/bodegas.js'
import { listarExistencias } from '../../api/inventario.js'
import { usePuede } from '../../auth/usePuede.js'
import Badge from '../../components/Badge.jsx'
import Boton from '../../components/Boton.jsx'
import Input from '../../components/Input.jsx'
import Paginacion from '../../components/Paginacion.jsx'
import Select from '../../components/Select.jsx'
import Tabla from '../../components/Tabla.jsx'
import { ESTADOS_STOCK, SIN_DATO, formatoDinero } from '../productos/productoFormato.js'
import { useCarga } from './useCarga.js'
import { useParametrosUrl } from './useParametrosUrl.js'

// Existencias por bodega (GET /inventory/stock). El estado (Óptimo / Stock bajo / Agotado) lo calcula
// el servidor. La "bandeja de stock bajo" es este mismo filtro con un acceso directo.
// Pendiente: editar mínimo, máximo y ubicación (POST /inventory/levels, con products.update en la UI).
export default function ExistenciasPage() {
  const puede = usePuede()
  const [leer, cambiar] = useParametrosUrl()
  const bodegaId = leer('bodega')
  const estado = ESTADOS_STOCK[leer('estado')] ? leer('estado') : ''
  const busqueda = leer('q')
  const pagina = Number(leer('pagina')) || 1
  const porPagina = Number(leer('porPagina')) || 25

  const [texto, setTexto] = useState(busqueda) // pasa a la URL 300 ms después de dejar de escribir
  const [bodegas, setBodegas] = useState([])

  useEffect(() => {
    listarBodegas()
      .then(setBodegas)
      .catch(() => setBodegas([])) // sin bodegas el filtro solo muestra "Todas"
  }, [])

  useEffect(() => {
    const espera = setTimeout(() => {
      if (texto.trim() !== busqueda) cambiar({ q: texto.trim() })
    }, 300)
    return () => clearTimeout(espera)
    // Solo reacciona a lo que se escribe
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto])

  const clave = [bodegaId, estado, busqueda, pagina, porPagina].join('|')
  const { datos, cargando, error } = useCarga(clave, () =>
    listarExistencias({ bodegaId, estado, busqueda, pagina, porPagina }),
  )

  const nombreBodega = (id) => bodegas.find((b) => b.id === id)?.nombre ?? `Bodega ${id}`
  const numero = (valor) => valor ?? SIN_DATO

  const columnas = [
    {
      clave: 'producto',
      titulo: 'Producto',
      render: (f) => (
        <>
          <Link to={`/productos/${f.productoId}`}>{f.nombre}</Link>
          <div className="inventario-sku">
            {f.sku}
            {f.lote && ` · Lote ${f.lote}`}
          </div>
        </>
      ),
    },
    { clave: 'bodega', titulo: 'Bodega', render: (f) => nombreBodega(f.bodegaId) },
    {
      clave: 'ubicacion',
      titulo: 'Ubicación',
      render: (f) =>
        f.pasillo || f.rack || f.gaveta ? (
          <span className="inventario-sin-corte">
            P {numero(f.pasillo)} · R {numero(f.rack)} · G {numero(f.gaveta)}
          </span>
        ) : (
          SIN_DATO
        ),
    },
    { clave: 'fisico', titulo: 'Físico', alinear: 'derecha', render: (f) => numero(f.fisico) },
    { clave: 'reservado', titulo: 'Reservado', alinear: 'derecha', render: (f) => numero(f.reservado) },
    {
      clave: 'disponible',
      titulo: 'Disponible',
      alinear: 'derecha',
      render: (f) => <strong>{numero(f.disponible)}</strong>,
    },
    {
      clave: 'minmax',
      titulo: 'Mín / Máx',
      alinear: 'derecha',
      render: (f) => `${numero(f.minimo)} / ${f.maximo ? f.maximo : SIN_DATO}`,
    },
    {
      clave: 'estado',
      titulo: 'Estado',
      render: (f) => {
        const e = ESTADOS_STOCK[f.estado]
        return e ? (
          <Badge tono={e.tono} punto>
            {e.texto}
          </Badge>
        ) : (
          SIN_DATO
        )
      },
    },
    // Solo la UI la oculta; sin costs.read el servidor ni siquiera manda el costo
    puede('costs.read') && {
      clave: 'costo',
      titulo: 'Costo prom.',
      alinear: 'derecha',
      render: (f) => (f.costoPromedio == null ? SIN_DATO : formatoDinero.format(f.costoPromedio)),
    },
    {
      clave: 'kardex',
      titulo: 'Kardex',
      render: (f) => (
        <Link to={`/inventario/kardex/${f.productoId}?bodega=${f.bodegaId}`} aria-label={`Kardex de ${f.nombre}`}>
          <span className="material-symbols-outlined" aria-hidden="true">
            timeline
          </span>
        </Link>
      ),
    },
  ].filter(Boolean)

  const hayFiltros = Boolean(bodegaId || estado || busqueda)

  return (
    <div>
      <div className="inventario-encabezado">
        <h2>Existencias</h2>
        <div className="inventario-acciones">
          {/* Acceso directo a la bandeja de stock bajo */}
          <Boton
            variante={estado === 'bajo' ? 'primario' : 'secundario'}
            icono="warning"
            aria-pressed={estado === 'bajo'}
            onClick={() => cambiar({ estado: estado === 'bajo' ? '' : 'bajo' })}
          >
            Bandeja de stock bajo
          </Boton>
        </div>
      </div>

      <div className="inventario-filtros">
        <div className="inventario-filtros-busqueda">
          <Input
            type="search"
            etiqueta="Buscar"
            placeholder="Nombre, SKU o código de barras"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
        </div>
        <Select etiqueta="Bodega" value={bodegaId} onChange={(e) => cambiar({ bodega: e.target.value })}>
          <option value="">Todas</option>
          {bodegas.map((b) => (
            <option key={b.id} value={b.id}>
              {b.codigo} · {b.nombre}
              {!b.activa && ' (inactiva)'}
            </option>
          ))}
        </Select>
        {hayFiltros && (
          <Boton
            variante="secundario"
            icono="filter_alt_off"
            onClick={() => {
              setTexto('')
              cambiar({ bodega: '', estado: '', q: '' })
            }}
          >
            Limpiar filtros
          </Boton>
        )}
      </div>

      <div className="inventario-chips" role="group" aria-label="Estado de stock">
        <button
          type="button"
          className="inventario-chip"
          aria-pressed={estado === ''}
          onClick={() => cambiar({ estado: '' })}
        >
          Todos
        </button>
        {Object.entries(ESTADOS_STOCK).map(([valor, e]) => (
          <button
            key={valor}
            type="button"
            className={`inventario-chip inventario-chip-${e.tono}`}
            aria-pressed={estado === valor}
            onClick={() => cambiar({ estado: valor })}
          >
            {e.texto}
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="inventario-aviso inventario-aviso-error">
          No se pudieron cargar las existencias: {error}
        </p>
      )}
      {cargando && !datos && <p>Cargando existencias…</p>}

      {datos && (
        <div aria-busy={cargando}>
          <p className="inventario-nota cifra">
            {datos.total.toLocaleString('es-MX')} {datos.total === 1 ? 'registro' : 'registros'}
          </p>
          <Tabla
            columnas={columnas}
            filas={datos.elementos}
            compacta
            mensajeVacio={
              estado === 'bajo'
                ? 'No hay productos con stock bajo.'
                : hayFiltros
                  ? 'Nada coincide con los filtros.'
                  : 'No hay existencias registradas.'
            }
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
