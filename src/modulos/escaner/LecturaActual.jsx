import Badge from '../../components/Badge.jsx'
import Boton from '../../components/Boton.jsx'
import ProductoImagen from '../productos/ProductoImagen.jsx'

// Tarjeta del producto recién leído. lectura: { producto, cantidad }
export default function LecturaActual({ lectura, onDescartar }) {
  const { producto, cantidad } = lectura

  return (
    <article className="lectura" aria-label="Producto leído">
      <ProductoImagen src={producto.imagen} tamano="grande" />
      <div className="lectura-datos">
        <div className="producto-sku">
          {producto.sku} · {producto.codigoBarras}
        </div>
        <h2>{producto.nombre}</h2>
        <Badge tono="info">{producto.categoria}</Badge>
        <dl className="lectura-detalle">
          <dt>Stock en sistema</dt>
          <dd className="cifra">{producto.existencias}</dd>
          <dt>Ubicación actual</dt>
          <dd>
            Pasillo {producto.pasillo} · Rack {producto.rack} · Gaveta {producto.gaveta}
          </dd>
          <dt>Cantidad leída</dt>
          <dd className="cifra">{cantidad}</dd>
        </dl>
        <p className="lectura-ayuda">Leer otra vez el mismo código suma 1.</p>
      </div>
      <div className="lectura-acciones">
        <Boton variante="secundario" icono="close" onClick={onDescartar}>
          Descartar <kbd>Esc</kbd>
        </Boton>
      </div>
    </article>
  )
}
