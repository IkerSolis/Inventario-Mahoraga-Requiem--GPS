import { useState } from 'react'
import { archivarProducto } from '../../api/productos.js'
import Boton from '../../components/Boton.jsx'
import Modal from '../../components/Modal.jsx'
import { resumirLote } from './productoLote.js'
import './productos.css'

// Confirmación antes de archivar uno o varios productos (acciones en lote).
// La página lo monta al pedir archivar y lo desmonta al cerrar.
export default function ArchivarProductoModal({ productos, onCerrar, onArchivado }) {
  const [archivando, setArchivando] = useState(false)
  const [error, setError] = useState(null)
  const uno = productos.length === 1 ? productos[0] : null
  const conStock = productos.filter((p) => p.existencias > 0)

  async function confirmar() {
    setArchivando(true)
    setError(null)
    // allSettled espera a todos aunque alguno falle, para saber cuáles sí se archivaron
    const resultados = await Promise.allSettled(productos.map((p) => archivarProducto(p.id)))
    const aviso = resumirLote(productos, resultados, { uno: 'se archivó', participio: 'archivado' })
    setArchivando(false)

    // Si no se archivó ninguno, el modal sigue abierto para reintentar
    if (aviso.tipo === 'error') setError(aviso.texto)
    else onArchivado(aviso.texto, aviso.tipo)
  }

  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      titulo={uno ? '¿Archivar producto?' : `¿Archivar ${productos.length} productos?`}
      acciones={
        <>
          <Boton variante="secundario" onClick={onCerrar}>Cancelar</Boton>
          <Boton variante="peligro" icono="archive" cargando={archivando} onClick={confirmar}>
            Archivar
          </Boton>
        </>
      }
    >
      {uno ? (
        <p>
          <strong>{uno.nombre}</strong> ({uno.sku}) dejará de aparecer en el catálogo.
        </p>
      ) : (
        <p>Los {productos.length} productos seleccionados dejarán de aparecer en el catálogo.</p>
      )}
      <p>No se borra nada: el historial se conserva y puedes restaurarlos desde «Ver archivados».</p>

      {/* Solo avisa; archivar con stock está permitido */}
      {uno && uno.existencias > 0 && (
        <p className="productos-aviso productos-aviso-alerta">Este producto aún tiene {uno.existencias} en stock.</p>
      )}
      {!uno && conStock.length > 0 && (
        <p className="productos-aviso productos-aviso-alerta">
          {conStock.length === 1
            ? `${conStock[0].nombre} aún tiene ${conStock[0].existencias} en stock.`
            : `${conStock.length} de estos productos aún tienen stock.`}
        </p>
      )}

      {error && <p role="alert" className="productos-aviso productos-aviso-error">{error}</p>}
    </Modal>
  )
}
