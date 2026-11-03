import { forwardRef, useId } from 'react'
import './Campo.css'

// Campo de texto con etiqueta y mensaje de error (por ejemplo, el que devuelve Zod).
// forwardRef permite que la página reciba el <input> real, por ejemplo para enfocarlo con un atajo.
const Input = forwardRef(function Input({ etiqueta, error, id, ...resto }, ref) {
  const idAuto = useId()
  const idCampo = id ?? idAuto
  const idError = `${idCampo}-error`

  return (
    <div className="campo">
      <label htmlFor={idCampo}>{etiqueta}</label>
      <input
        ref={ref}
        id={idCampo}
        className="campo-control"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? idError : undefined}
        {...resto}
      />
      {error && <p id={idError} className="campo-error">{error}</p>}
    </div>
  )
})

export default Input
