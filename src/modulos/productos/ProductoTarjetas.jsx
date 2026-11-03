import { Link } from 'react-router-dom'
import Badge from '../../components/Badge.jsx'
import PrecioVenta from './PrecioVenta.jsx'
import ProductoImagen from './ProductoImagen.jsx'
import { ESTADOS_STOCK, formatoDinero } from './productoFormato.js'
import './ProductoTarjetas.css'

// Vista alternativa a la tabla. Recibe los mismos productos y las mismas acciones que la tabla.
// filtrosLista: los filtros actuales, para que el detalle pueda regresar a esta misma vista
export default function ProductoTarjetas({ productos, mostrarCosto, filtrosLista, renderAcciones, mensajeVacio }) {
  if (productos.length === 0) return <p className="producto-tarjetas-vacio">{mensajeVacio}</p>

  return (
    <ul className="producto-tarjetas">
      {productos.map((p) => {
        const estado = ESTADOS_STOCK[p.estadoStock]
        return (
          <li key={p.id} className="producto-tarjeta">
            <ProductoImagen src={p.imagen} tamano="tarjeta" />
            <div className="producto-tarjeta-cuerpo">
              <Link to={`/productos/${p.id}`} state={{ filtrosLista }} className="producto-nombre">
                {p.nombre}
              </Link>
              <div className="producto-sku">{p.sku}</div>
              <div className="producto-tarjeta-badges">
                <Badge tono="info">{p.categoria}</Badge>
                <Badge tono={estado.tono} punto>{estado.texto}</Badge>
              </div>
              <dl className="producto-tarjeta-datos">
                <dt>Existencias</dt>
                <dd className="cifra">{p.existencias}</dd>
                <dt>Precio</dt>
                <dd className="cifra"><PrecioVenta valor={p.precioVenta} /></dd>
                {mostrarCosto && p.precioCompra != null && (
                  <>
                    <dt>Costo</dt>
                    <dd className="cifra">{formatoDinero.format(p.precioCompra)}</dd>
                  </>
                )}
              </dl>
            </div>
            {renderAcciones && <div className="producto-tarjeta-acciones">{renderAcciones(p)}</div>}
          </li>
        )
      })}
    </ul>
  )
}
