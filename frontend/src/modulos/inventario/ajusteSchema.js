import { z } from 'zod'

// Solicitud de ajuste. Los límites son los del servidor (motivo de 5+ caracteres, cantidad mayor a 0);
// en la UI la cantidad es entera, como en el escáner.
export const ajusteSchema = z.object({
  bodegaId: z.preprocess(
    (valor) => (valor === '' ? undefined : Number(valor)),
    z.number({ error: 'Elige una bodega' }).int().positive('Elige una bodega'),
  ),
  tipo: z.enum(['positivo', 'negativo'], { error: 'Elige el tipo de ajuste' }),
  cantidad: z.preprocess(
    (valor) => (valor === '' ? undefined : Number(valor)),
    z.number({ error: 'Escribe una cantidad' }).int('Debe ser un número entero').min(1, 'Debe ser al menos 1'),
  ),
  motivo: z.string().trim().min(5, 'Explica el motivo (mínimo 5 caracteres)').max(500, 'Máximo 500 caracteres'),
  evidencia: z.string().trim().max(500, 'Máximo 500 caracteres'),
})
