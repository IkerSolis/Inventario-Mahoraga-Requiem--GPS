/**
 * Esquemas de validación con Zod para el módulo de Productos.
 * 
 * Reglas de los requerimientos:
 * - Un esquema Zod por recurso antes de tocar la base de datos.
 * - Verificar precios >= 0 (cost_price >= 0, sale_price >= 0).
 * - Uso de z.coerce para soportar tanto JSON como peticiones multipart/form-data (Multer).
 */
const { z } = require('zod');

// Esquema para la creación de un nuevo producto
const createProductSchema = z.object({
  sku: z.string({
    required_error: 'El SKU es obligatorio.'
  }).trim().min(2, 'El SKU debe tener al menos 2 caracteres.').max(64),

  name: z.string({
    required_error: 'El nombre del producto es obligatorio.'
  }).trim().min(2, 'El nombre debe tener al menos 2 caracteres.').max(255),

  description: z.string().trim().max(1000).optional().nullable(),

  cost_price: z.coerce.number({
    invalid_type_error: 'El precio de costo debe ser un número válido.'
  }).min(0, 'El precio de costo debe ser mayor o igual a 0.').default(0),

  sale_price: z.coerce.number({
    invalid_type_error: 'El precio de venta debe ser un número válido.'
  }).min(0, 'El precio de venta debe ser mayor o igual a 0.').default(0),

  unit: z.string().trim().default('pieza'),

  supplier_id: z.coerce.number().int().positive().optional().nullable(),
  category_id: z.coerce.number().int().positive().optional().nullable(),
  brand_id: z.coerce.number().int().positive().optional().nullable(),

  barcode: z.string().trim().max(100).optional().nullable(),
  qr_code: z.string().trim().optional().nullable(),
  location: z.string().trim().max(255).optional().nullable(),

  // Variantes opcionales (talla, color, lote, IMEI)
  variants: z.union([
    z.string().transform((val, ctx) => {
      try {
        return JSON.parse(val);
      } catch (e) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'variants debe ser un JSON válido.' });
        return z.NEVER;
      }
    }),
    z.record(z.any()),
    z.array(z.any())
  ]).optional().nullable(),

  status: z.enum(['active', 'archived']).default('active')
});

// Esquema para actualización parcial de producto
const updateProductSchema = createProductSchema.partial();

// Esquema para filtrar y paginar productos (GET /api/products)
const queryProductsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional(),
  category_id: z.coerce.number().int().positive().optional(),
  brand_id: z.coerce.number().int().positive().optional(),
  status: z.enum(['active', 'archived', 'all']).default('active')
});

module.exports = {
  createProductSchema,
  updateProductSchema,
  queryProductsSchema
};

