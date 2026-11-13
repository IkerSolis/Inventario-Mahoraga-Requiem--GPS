import Badge from '../../components/Badge.jsx'
import Boton from '../../components/Boton.jsx'
import ProductoImagen from '../productos/ProductoImagen.jsx'
import { SIN_DATO } from '../productos/productoFormato.js'

// Tarjeta del producto recién leído. La cantidad se edita en ConfirmacionMovimiento.
// Existencias y ubicación son las de la bodega elegida; "—" si no se pudieron consultar o no tiene.
export default function LecturaActual({ lectura, bodega, onDescartar }) {
  const { producto } = lectura
  const { pasillo, rack, gaveta } = producto
  const hayUbicacion = pasillo || rack || gaveta

  return (
    <article className="lectura" aria-label="Producto leído">
      <ProductoImagen src={producto.imagen} tamano="grande" />
      <div className="lectura-datos">
        <div className="producto-sku">
          {producto.sku}
          {producto.codigoBarras && ` · ${producto.codigoBarras}`}
        </div>
        <h2>{producto.nombre}</h2>
        <Badge tono="info">{bodega.nombre}</Badge>
        <dl className="lectura-detalle">
          <dt>Stock en sistema</dt>
          <dd className="cifra">{producto.existencias ?? SIN_DATO}</dd>
          <dt>Disponible</dt>
          <dd className="cifra">{producto.disponible ?? SIN_DATO}</dd>
          <dt>Ubicación</dt>
          <dd>
            {hayUbicacion
              ? `Pasillo ${pasillo ?? SIN_DATO} · Rack ${rack ?? SIN_DATO} · Gaveta ${gaveta ?? SIN_DATO}`
              : SIN_DATO}
          </dd>
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
