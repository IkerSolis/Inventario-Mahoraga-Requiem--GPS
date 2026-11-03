import { useState } from 'react'
import { archivarProducto } from '../../api/productos.js'
import Boton from '../../components/Boton.jsx'
import Modal from '../../components/Modal.jsx'
import './productos.css'

// Confirmación antes de archivar. La página lo monta al pedir archivar y lo desmonta al cerrar.
export default function ArchivarProductoModal({ producto, onCerrar, onArchivado }) {
  const [archivando, setArchivando] = useState(false)
  const [error, setError] = useState(null)

  async function confirmar() {
    setArchivando(true)
    setError(null)
    try {
      await archivarProducto(producto.id)
      onArchivado(`${producto.nombre} se archivó.`)
    } catch (e) {
      setError(e.message)
    } finally {
      setArchivando(false)
    }
  }

  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      titulo="¿Archivar producto?"
      acciones={
        <>
          <Boton variante="secundario" onClick={onCerrar}>Cancelar</Boton>
          <Boton variante="peligro" icono="archive" cargando={archivando} onClick={confirmar}>
            Archivar
          </Boton>
        </>
      }
    >
      <p>
        <strong>{producto.nombre}</strong> ({producto.sku}) dejará de aparecer en el catálogo.
      </p>
      <p>No se borra: su historial se conserva y puedes restaurarlo desde «Ver archivados».</p>
      {/* Solo avisa; archivar con stock está permitido */}
      {producto.existencias > 0 && (
        <p className="productos-aviso productos-aviso-alerta">
          Este producto aún tiene {producto.existencias} en stock.
        </p>
      )}
      {error && <p role="alert" className="productos-aviso productos-aviso-error">No se pudo archivar: {error}</p>}
    </Modal>
  )
}
