import { useId } from 'react'
import './Campo.css'

// Igual que Input, pero las opciones van como hijos: <Select etiqueta="Unidad"><option>pieza</option></Select>
export default function Select({ etiqueta, error, id, children, ...resto }) {
  const idAuto = useId()
  const idCampo = id ?? idAuto
  const idError = `${idCampo}-error`

  return (
    <div className="campo">
      <label htmlFor={idCampo}>{etiqueta}</label>
      <select
        id={idCampo}
        className="campo-control"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? idError : undefined}
        {...resto}
      >
        {children}
      </select>
      {error && <p id={idError} className="campo-error">{error}</p>}
    </div>
  )
}
