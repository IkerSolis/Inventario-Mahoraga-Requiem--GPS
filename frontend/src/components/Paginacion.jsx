import { paginasVisibles } from './paginacionRango.js'
import './Paginacion.css'

// pagina empieza en 1. onCambiarPorPagina es opcional: si no se pasa, no aparece el selector de filas.
export default function Paginacion({
  pagina,
  porPagina,
  totalElementos,
  onCambiar,
  onCambiarPorPagina,
  opcionesPorPagina = [10, 25, 50, 100],
}) {
  const totalPaginas = Math.max(1, Math.ceil(totalElementos / porPagina))
  const desde = totalElementos === 0 ? 0 : (pagina - 1) * porPagina + 1
  const hasta = Math.min(pagina * porPagina, totalElementos)
  const enPrimera = pagina <= 1
  const enUltima = pagina >= totalPaginas

  return (
    <nav className="paginacion" aria-label="Paginación">
      <div className="paginacion-info">
        <span className="cifra">
          Mostrando {desde}–{hasta} de {totalElementos.toLocaleString('es-MX')}
        </span>
        {onCambiarPorPagina && (
          <label>
            Filas por página{' '}
            <select value={porPagina} onChange={(e) => onCambiarPorPagina(Number(e.target.value))}>
              {opcionesPorPagina.map((opcion) => (
                <option key={opcion} value={opcion}>
                  {opcion}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="paginacion-botones">
        <Flecha icono="first_page" texto="Primera página" disabled={enPrimera} onClick={() => onCambiar(1)} />
        <Flecha
          icono="chevron_left"
          texto="Página anterior"
          disabled={enPrimera}
          onClick={() => onCambiar(pagina - 1)}
        />
        {paginasVisibles(pagina, totalPaginas).map((p, indice) =>
          p === '…' ? (
            <span key={indice} className="paginacion-hueco" aria-hidden="true">
              …
            </span>
          ) : (
            <button
              key={indice}
              type="button"
              className="paginacion-boton cifra"
              aria-current={p === pagina ? 'page' : undefined}
              onClick={() => onCambiar(p)}
            >
              {p}
            </button>
          ),
        )}
        <Flecha
          icono="chevron_right"
          texto="Página siguiente"
          disabled={enUltima}
          onClick={() => onCambiar(pagina + 1)}
        />
        <Flecha icono="last_page" texto="Última página" disabled={enUltima} onClick={() => onCambiar(totalPaginas)} />
      </div>
    </nav>
  )
}

function Flecha({ icono, texto, disabled, onClick }) {
  return (
    <button type="button" className="paginacion-boton" aria-label={texto} disabled={disabled} onClick={onClick}>
      <span className="material-symbols-outlined" aria-hidden="true">
        {icono}
      </span>
    </button>
  )
}
