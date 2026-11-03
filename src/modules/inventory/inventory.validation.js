// Esquemas de validacion con Zod para el modulo de inventario
// Validacion de consultas de stock, conteos y solicitudes de ajuste

const { z } = require('zod');

// Esquema para consultar existencias de stock con filtros
const queryStockSchema = z.object({
  warehouse_id: z.coerce.number().int().positive().optional(),
  product_id: z.coerce.number().int().positive().optional(),
  state: z.enum(['optimo', 'bajo', 'agotado', 'todos']).default('todos'),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

// Esquema para inicializar o actualizar niveles de stock minimo y maximo
const setStockLevelsSchema = z.object({
  product_id: z.coerce.number().int().positive(),
  warehouse_id: z.coerce.number().int().positive().default(1),
  min_stock: z.coerce.number().min(0).default(0),
  max_stock: z.coerce.number().min(0).default(0),
  aisle: z.string().trim().optional().nullable(),
  rack: z.string().trim().optional().nullable(),
  bin_location: z.string().trim().optional().nullable()
});

// Esquema para abrir una nueva sesion de conteo ciclico
const createCountSessionSchema = z.object({
  warehouse_id: z.coerce.number().int().positive().default(1),
  notes: z.string().trim().max(500).optional().nullable()
});

// Esquema para registrar cantidades contadas por el almacenista
const recordCountItemsSchema = z.object({
  items: z.array(z.object({
    product_id: z.coerce.number().int().positive(),
    counted_qty: z.coerce.number().min(0)
  })).min(1, 'Debes enviar al menos un producto contado')
});

// Esquema para solicitar ajuste de stock con motivo y evidencia
const requestAdjustmentSchema = z.object({
  warehouse_id: z.coerce.number().int().positive().default(1),
  product_id: z.coerce.number().int().positive(),
  adjustment_type: z.enum(['positive', 'negative']),
  qty: z.coerce.number().positive('La cantidad a ajustar debe ser mayor a cero'),
  reason: z.string().trim().min(5, 'El motivo del ajuste debe tener al menos 5 caracteres'),
  evidence_url: z.string().trim().optional().nullable()
});

module.exports = {
  queryStockSchema,
  setStockLevelsSchema,
  createCountSessionSchema,
  recordCountItemsSchema,
  requestAdjustmentSchema
};
