// Imagen del producto, o un ícono gris si no tiene.
// tamano: 'chica' (tabla), 'tarjeta' (ancho completo) o 'grande' (detalle y formulario)
// alt: vacío cuando el nombre ya está escrito al lado, para que el lector de pantalla no lo repita
export default function ProductoImagen({ src, alt = '', tamano = 'chica' }) {
  if (!src) {
    return (
      <div className={`producto-imagen producto-imagen-${tamano} producto-imagen-vacia`}>
        <span className="material-symbols-outlined" aria-hidden="true">image</span>
      </div>
    )
  }
  return <img src={src} alt={alt} className={`producto-imagen producto-imagen-${tamano}`} loading="lazy" />
}
