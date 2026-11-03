import { forwardRef, useState } from 'react'
import Boton from '../../components/Boton.jsx'
import Input from '../../components/Input.jsx'

// Campo donde "escribe" el lector USB: el lector se comporta como teclado, teclea el código y manda Enter.
// Sin lector se puede escribir el código (o el SKU) a mano y presionar Enter.
// ref: la página lo usa para devolver el foco al campo después de cada lectura.
// autoEnfocar: false en teléfono, para que no se abra el teclado al entrar.
const LectorCodigo = forwardRef(function LectorCodigo({ onLeer, buscando, autoEnfocar = true }, ref) {
  const [codigo, setCodigo] = useState('')
  const [enfocado, setEnfocado] = useState(false)

  function enviar(e) {
    e.preventDefault()
    const limpio = codigo.trim()
    if (!limpio) return
    onLeer(limpio)
    setCodigo('') // listo para la siguiente lectura
  }

  // En teléfono (autoEnfocar = false) no hay lector USB, así que no tiene sentido avisar que está "en pausa"
  let estado = autoEnfocar
    ? 'Lector en pausa: haz clic en el campo para seguir leyendo'
    : 'Escribe el código o usa la cámara'
  if (enfocado) estado = 'Lector activo, esperando código'
  if (buscando) estado = 'Buscando producto…'

  return (
    <form className="lector" onSubmit={enviar}>
      {/* Si el campo pierde el foco, el lector USB escribiría en otro lado: por eso se avisa */}
      <p className={`lector-estado ${enfocado ? 'lector-estado-activo' : ''}`}>
        <span className="lector-punto" aria-hidden="true" />
        {estado}
      </p>
      <div className="lector-fila">
        <div className="lector-campo">
          <Input
            ref={ref}
            etiqueta="Código de barras o SKU"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            onFocus={() => setEnfocado(true)}
            onBlur={() => setEnfocado(false)}
            autoFocus={autoEnfocar}
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="search"
          />
        </div>
        <Boton type="submit" icono="search" cargando={buscando}>
          Buscar
        </Boton>
      </div>
    </form>
  )
})

export default LectorCodigo
