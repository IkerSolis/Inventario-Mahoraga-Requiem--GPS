import { z } from 'zod'

export const UNIDADES = ['pieza', 'par', 'paquete', 'caja', 'kg', 'litro']

const obligatorio = 'Este campo es obligatorio'

// Los <input> siempre entregan texto; preprocess lo convierte a número antes de validar.
// El texto vacío se vuelve undefined para que salga el mensaje de "escribe un número".
function numero(validacion) {
  return z.preprocess((valor) => (valor === '' ? undefined : Number(valor)), validacion)
}

export const productoSchema = z.object({
  nombre: z.string().trim().min(1, obligatorio).max(120, 'Máximo 120 caracteres'),
  descripcion: z.string().trim().max(500, 'Máximo 500 caracteres'),
  categoria: z.string().min(1, 'Elige una categoría'),
  marca: z.string().trim().max(60, 'Máximo 60 caracteres'),
  unidad: z.enum(UNIDADES, { error: 'Elige una unidad' }),
  precioCompra: numero(z.number({ error: 'Escribe un número' }).min(0, 'No puede ser negativo')),
  precioVenta: numero(z.number({ error: 'Escribe un número' }).positive('Debe ser mayor a 0')),
  stockMinimo: numero(
    z.number({ error: 'Escribe un número' }).int('Debe ser un número entero').min(0, 'No puede ser negativo'),
  ),
  pasillo: z.string().trim().min(1, obligatorio).max(10, 'Máximo 10 caracteres'),
  rack: z.string().trim().min(1, obligatorio).max(10, 'Máximo 10 caracteres'),
  gaveta: z.string().trim().min(1, obligatorio).max(10, 'Máximo 10 caracteres'),
})

// Quita del esquema los campos que el usuario no puede editar.
// Zod descarta las claves que no están en el esquema, así que esos campos tampoco se envían.
export function esquemaSegunPermisos({ puedeEditarCosto, puedeEditarPrecio }) {
  let esquema = productoSchema
  if (!puedeEditarCosto) esquema = esquema.omit({ precioCompra: true })
  if (!puedeEditarPrecio) esquema = esquema.omit({ precioVenta: true })
  return esquema
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
