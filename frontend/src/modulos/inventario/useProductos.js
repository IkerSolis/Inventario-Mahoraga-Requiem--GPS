import { useEffect, useState } from 'react'
import { obtenerProducto } from '../../api/productos.js'

// Movimientos, kardex y ajustes solo traen product_id. Este hook pide el nombre y SKU de cada producto
// que aparece (una vez por producto) y los guarda: { 7: { nombre, sku }, ... }.
// Si uno falla (por ejemplo, sin products.read), se muestra "Producto 7".
export function useProductos(ids) {
  const [productos, setProductos] = useState({})
  const faltantes = [...new Set(ids)].filter((id) => !(id in productos))
  const claveFaltantes = faltantes.join(',')

  useEffect(() => {
    if (faltantes.length === 0) return
    let vigente = true
    Promise.all(
      faltantes.map((id) =>
        obtenerProducto(id)
          .then((p) => [id, { nombre: p.nombre, sku: p.sku }])
          .catch(() => [id, { nombre: `Producto ${id}`, sku: '' }]),
      ),
    ).then((pares) => {
      if (vigente) setProductos((anteriores) => ({ ...anteriores, ...Object.fromEntries(pares) }))
    })
    return () => {
      vigente = false
    }
    // Solo cuando aparecen productos nuevos
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claveFaltantes])

  return (id) => productos[id] ?? { nombre: '…', sku: '' }
}
