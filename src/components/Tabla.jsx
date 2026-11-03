import { alternarFila, alternarVisibles } from './tablaSeleccion.js'
import './Tabla.css'

// columnas: [{ clave, titulo, render?: (fila) => contenido, alinear?: 'derecha' }]
// filas: arreglo de objetos; claveFila es el campo único de cada fila (por defecto 'id')
// Selección (opcional): pasar seleccionadas (arreglo de ids) y onCambiarSeleccion(nuevosIds)
export default function Tabla({
  columnas,
  filas,
  claveFila = 'id',
  compacta = false,
  seleccionadas = [],
  onCambiarSeleccion,
  mensajeVacio = 'No hay datos para mostrar.',
}) {
  const conSeleccion = Boolean(onCambiarSeleccion)
  const idsVisibles = filas.map((fila) => fila[claveFila])
  const todas = idsVisibles.length > 0 && idsVisibles.every((id) => seleccionadas.includes(id))
  const algunas = idsVisibles.some((id) => seleccionadas.includes(id))

  return (
    <div className="tabla-contenedor">
      <table className={`tabla ${compacta ? 'tabla-compacta' : ''}`}>
        <thead>
          <tr>
            {conSeleccion && (
              <th scope="col" className="tabla-casilla">
                <input
                  type="checkbox"
                  aria-label="Seleccionar todas las filas visibles"
                  checked={todas}
                  disabled={filas.length === 0}
                  // indeterminate no existe como atributo en HTML; se asigna directo al elemento
                  ref={(casilla) => {
                    if (casilla) casilla.indeterminate = algunas && !todas
                  }}
                  onChange={() => onCambiarSeleccion(alternarVisibles(seleccionadas, idsVisibles))}
                />
              </th>
            )}
            {columnas.map((columna) => (
              <th
                key={columna.clave}
                scope="col"
                className={columna.alinear === 'derecha' ? 'tabla-derecha' : undefined}
              >
                {columna.titulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.length === 0 && (
            <tr>
              <td className="tabla-vacia" colSpan={columnas.length + (conSeleccion ? 1 : 0)}>
                {mensajeVacio}
              </td>
            </tr>
          )}
          {filas.map((fila) => {
            const id = fila[claveFila]
            const seleccionada = seleccionadas.includes(id)
            return (
              <tr key={id} className={seleccionada ? 'fila-seleccionada' : undefined}>
                {conSeleccion && (
                  <td className="tabla-casilla">
                    <input
                      type="checkbox"
                      aria-label={`Seleccionar fila ${id}`}
                      checked={seleccionada}
                      onChange={() => onCambiarSeleccion(alternarFila(seleccionadas, id))}
                    />
                  </td>
                )}
                {columnas.map((columna) => (
                  <td
                    key={columna.clave}
                    className={columna.alinear === 'derecha' ? 'tabla-derecha cifra' : undefined}
                  >
                    {columna.render ? columna.render(fila) : fila[columna.clave]}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
