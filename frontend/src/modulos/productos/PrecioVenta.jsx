import Badge from '../../components/Badge.jsx'
import { formatoDinero } from './productoFormato.js'

// Precio 0 = lo creó alguien sin prices.manage y falta asignarlo; se marca para que no pase desapercibido
export default function PrecioVenta({ valor }) {
  if (valor === 0) return <Badge tono="alerta">Sin precio</Badge>
  return formatoDinero.format(valor)
}
