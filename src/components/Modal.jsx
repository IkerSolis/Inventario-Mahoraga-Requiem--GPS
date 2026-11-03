import { useEffect, useId, useRef } from 'react'
import Boton from './Boton.jsx'
import './Modal.css'

// Usa el <dialog> nativo: Esc cierra y el foco queda dentro del modal sin código extra.
// acciones: botones del pie (por ejemplo Cancelar / Guardar)
export default function Modal({ abierto, onCerrar, titulo, acciones, children }) {
  const referencia = useRef(null)
  const idTitulo = useId()

  useEffect(() => {
    const dialogo = referencia.current
    if (abierto && !dialogo.open) dialogo.showModal()
    if (!abierto && dialogo.open) dialogo.close()
  }, [abierto])

  // onClose se dispara al cerrar con Esc o con dialogo.close()
  return (
    <dialog ref={referencia} className="modal" aria-labelledby={idTitulo} onClose={onCerrar}>
      {/* El contenido se monta solo al abrir, así un formulario empieza limpio cada vez */}
      {abierto && (
        <>
          <header className="modal-encabezado">
            <h2 id={idTitulo}>{titulo}</h2>
            <Boton variante="secundario" icono="close" aria-label="Cerrar" onClick={onCerrar} />
          </header>
          <div className="modal-cuerpo">{children}</div>
          {acciones && <footer className="modal-acciones">{acciones}</footer>}
        </>
      )}
    </dialog>
  )
}
