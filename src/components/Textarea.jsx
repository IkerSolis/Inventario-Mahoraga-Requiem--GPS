import { useId } from 'react'
import './Campo.css'

// Igual que Input, pero para textos largos de varias líneas.
export default function Textarea({ etiqueta, error, id, rows = 3, ...resto }) {
  const idAuto = useId()
  const idCampo = id ?? idAuto
  const idError = `${idCampo}-error`

  return (
    <div className="campo">
      <label htmlFor={idCampo}>{etiqueta}</label>
      <textarea
        id={idCampo}
        className="campo-control"
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? idError : undefined}
        {...resto}
      />
      {error && <p id={idError} className="campo-error">{error}</p>}
    </div>
  )
}
