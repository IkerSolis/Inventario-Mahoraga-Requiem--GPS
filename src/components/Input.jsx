import { useId } from 'react'
import './Campo.css'

// Campo de texto con etiqueta y mensaje de error (por ejemplo, el que devuelve Zod).
export default function Input({ etiqueta, error, id, ...resto }) {
  const idAuto = useId()
  const idCampo = id ?? idAuto
  const idError = `${idCampo}-error`

  return (
    <div className="campo">
      <label htmlFor={idCampo}>{etiqueta}</label>
      <input
        id={idCampo}
        className="campo-control"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? idError : undefined}
        {...resto}
      />
      {error && <p id={idError} className="campo-error">{error}</p>}
    </div>
  )
}
