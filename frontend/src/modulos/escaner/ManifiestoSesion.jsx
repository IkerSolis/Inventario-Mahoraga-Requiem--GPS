import Badge from '../../components/Badge.jsx'
import Tabla from '../../components/Tabla.jsx'
import { resumirManifiesto, textoCantidad, textoDiferencia } from './escanerLogica.js'

const TIPOS = {
  entrada: { texto: 'Entrada', tono: 'optimo' },
  salida: { texto: 'Salida', tono: 'info' },
  conteo: { texto: 'Conteo', tono: 'neutro' },
}

const columnas = [
  {
    clave: 'fecha',
    titulo: 'Hora',
    render: (m) => <span className="cifra">{new Date(m.fecha).toLocaleTimeString('es-MX')}</span>,
  },
  {
    clave: 'tipo',
    titulo: 'Tipo',
    render: (m) => <Badge tono={TIPOS[m.tipo].tono}>{TIPOS[m.tipo].texto}</Badge>,
  },
  {
    clave: 'producto',
    titulo: 'Producto',
    render: (m) => (
      <>
        <div className="manifiesto-nombre">{m.nombre}</div>
        <div className="producto-sku">{m.sku}</div>
      </>
    ),
  },
  {
    clave: 'cantidad',
    titulo: 'Cantidad',
    alinear: 'derecha',
    render: (m) => (
      <>
        <strong>{textoCantidad(m.tipo, m.cantidad)}</strong>
        {m.tipo === 'conteo' && m.diferencia !== 0 && (
          <div>
            <Badge tono="alerta">Dif. {textoDiferencia(m.diferencia)}</Badge>
          </div>
        )}
      </>
    ),
  },
  {
    clave: 'existencias',
    titulo: 'Existencias',
    alinear: 'derecha',
    render: (m) => `${m.existenciasAntes} → ${m.existenciasDespues}`,
  },
  {
    clave: 'ubicacion',
    titulo: 'Ubicación',
    render: (m) => `Pasillo ${m.pasillo || '—'} · Rack ${m.rack || '—'} · Gaveta ${m.gaveta || '—'}`,
  },
  { clave: 'documento', titulo: 'Documento', render: (m) => m.documento || '—' },
]

// "Manifiesto de remesa activa": los movimientos confirmados en esta sesión, el más reciente primero.
// movimientos: lo que respondió el servidor, más el nombre y SKU del producto y la clave de idempotencia.
export default function ManifiestoSesion({ movimientos }) {
  const resumen = resumirManifiesto(movimientos)

  return (
    <section className="escaner-panel manifiesto" aria-labelledby="titulo-manifiesto">
      <header className="manifiesto-encabezado">
        <h2 id="titulo-manifiesto">Manifiesto de la sesión</h2>
        <Badge tono="info">
          {movimientos.length} {movimientos.length === 1 ? 'registro' : 'registros'}
        </Badge>
      </header>

      <dl className="manifiesto-resumen">
        <div>
          <dt>Entradas</dt>
          <dd className="cifra">+{resumen.entradas}</dd>
        </div>
        <div>
          <dt>Salidas</dt>
          <dd className="cifra">−{resumen.salidas}</dd>
        </div>
        <div>
          <dt>Conteos</dt>
          <dd className="cifra">{resumen.conteos}</dd>
        </div>
        <div>
          <dt>Con diferencia</dt>
          <dd className={`cifra ${resumen.conDiferencia > 0 ? 'manifiesto-alerta' : ''}`}>{resumen.conDiferencia}</dd>
        </div>
      </dl>

      {/* La clave de idempotencia es única por movimiento, así que sirve como key de cada fila */}
      <Tabla
        columnas={columnas}
        filas={movimientos}
        claveFila="clave"
        compacta
        mensajeVacio="Todavía no hay movimientos en esta sesión."
      />
    </section>
  )
}
