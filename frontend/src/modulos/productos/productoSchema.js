import { z } from 'zod'

export const UNIDADES = ['pieza', 'par', 'paquete', 'caja', 'kg', 'litro']

// Los <input> siempre entregan texto; preprocess lo convierte a número antes de validar.
// El texto vacío se vuelve undefined para que salga el mensaje de "escribe un número".
function numero(validacion) {
  return z.preprocess((valor) => (valor === '' ? undefined : Number(valor)), validacion)
}

// Los límites son los del servidor (Backend 2). El stock mínimo, el máximo y la ubicación (pasillo, rack,
// gaveta) no son del producto: son por bodega y se editan en Inventario > Existencias.
// La marca queda fuera hasta que el backend tenga catálogo de marcas.
export const productoSchema = z.object({
  sku: z.string().trim().min(2, 'Mínimo 2 caracteres').max(64, 'Máximo 64 caracteres'),
  // Opcional; si se escribe, se valida que sea texto corto (el servidor acepta EAN-13, CODE-128...)
  codigoBarras: z.string().trim().max(100, 'Máximo 100 caracteres'),
  nombre: z.string().trim().min(2, 'Mínimo 2 caracteres').max(120, 'Máximo 120 caracteres'),
  descripcion: z.string().trim().max(500, 'Máximo 500 caracteres'),
  categoriaId: numero(z.number({ error: 'Elige una categoría' }).int().positive('Elige una categoría')),
  unidad: z.enum(UNIDADES, { error: 'Elige una unidad' }),
  precioCompra: numero(z.number({ error: 'Escribe un número' }).min(0, 'No puede ser negativo')),
  precioVenta: numero(z.number({ error: 'Escribe un número' }).positive('Debe ser mayor a 0')),
})

// Quita del esquema los campos que el usuario no puede editar.
// Zod descarta las claves que no están en el esquema, así que esos campos tampoco se envían.
export function esquemaSegunPermisos({ puedeEditarCosto, puedeEditarPrecio }) {
  let esquema = productoSchema
  if (!puedeEditarCosto) esquema = esquema.omit({ precioCompra: true })
  if (!puedeEditarPrecio) esquema = esquema.omit({ precioVenta: true })
  return esquema
}

export const TIPOS_IMAGEN = ['image/png', 'image/jpeg']
export const TAMANO_MAXIMO_IMAGEN = 5 * 1024 * 1024 // 5 MB, el límite de Multer en el servidor

// La imagen es un archivo (File), no texto, así que se valida aparte del esquema.
// Devuelve el mensaje de error, o null si la imagen es válida.
export function validarImagen(archivo) {
  if (!TIPOS_IMAGEN.includes(archivo.type)) return 'Solo se aceptan imágenes PNG o JPG'
  if (archivo.size > TAMANO_MAXIMO_IMAGEN) return 'La imagen no puede pesar más de 5 MB'
  return null
}

// Convierte los errores de Zod en { campo: 'mensaje' } (el primer error de cada campo)
export function erroresPorCampo(error) {
  const errores = {}
  for (const problema of error.issues) {
    const campo = problema.path[0]
    if (!(campo in errores)) errores[campo] = problema.message
  }
  return errores
}
