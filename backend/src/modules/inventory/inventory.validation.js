// Esquemas de validacion con Zod para el modulo de inventario
// Validacion de consultas de stock, conteos y solicitudes de ajuste

const { z } = require('zod');

const decimalAmount = z.coerce.number()
  .finite()
  .max(9999999999)
  .refine((value) => Math.abs((value * 100) - Math.round(value * 100)) < 1e-8, {
    message: 'La cantidad admite como máximo dos decimales'
  });
const nonNegativeAmount = decimalAmount.refine((value) => value >= 0);
const positiveAmount = decimalAmount.refine((value) => value > 0);

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
  min_stock: nonNegativeAmount.optional(),
  max_stock: nonNegativeAmount.optional(),
  aisle: z.string().trim().optional().nullable(),
  rack: z.string().trim().optional().nullable(),
  bin_location: z.string().trim().optional().nullable()
}).refine((data) => data.min_stock === undefined || data.max_stock === undefined ||
  data.max_stock === 0 || data.max_stock >= data.min_stock, {
  path: ['max_stock'],
  message: 'El stock máximo debe ser mayor o igual al stock mínimo'
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
    lot_number: z.string().trim().max(100).optional().nullable(),
    counted_qty: nonNegativeAmount
  })).min(1, 'Debes enviar al menos un producto contado')
});

// Esquema para solicitar ajuste de stock con motivo y evidencia
const requestAdjustmentSchema = z.object({
  warehouse_id: z.coerce.number().int().positive().default(1),
  product_id: z.coerce.number().int().positive(),
  lot_number: z.string().trim().max(100).optional().nullable(),
  adjustment_type: z.enum(['positive', 'negative']),
  qty: positiveAmount,
  reason: z.string().trim().min(5, 'El motivo del ajuste debe tener al menos 5 caracteres'),
  evidence_url: z.string().trim().optional().nullable()
});

const createMovementSchema = z.object({
  type: z.enum(['receive', 'issue', 'transfer', 'return']),
  warehouse_id: z.coerce.number().int().positive(),
  destination_warehouse_id: z.coerce.number().int().positive().optional(),
  product_id: z.coerce.number().int().positive(),
  lot_number: z.string().trim().max(100).optional().nullable(),
  qty: positiveAmount,
  unit_cost: nonNegativeAmount.default(0),
  reference_doc: z.string().trim().max(150).optional().nullable(),
  return_direction: z.enum(['customer', 'supplier']).optional(),
  disposition: z.enum(['available', 'quarantine']).optional(),
  idempotency_key: z.string().trim().min(1).max(128)
}).superRefine((data, ctx) => {
  if (data.type === 'transfer' && !data.destination_warehouse_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['destination_warehouse_id'],
      message: 'El almacén destino es obligatorio para transferencias'
    });
  }
  if (data.type !== 'transfer' && data.destination_warehouse_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['destination_warehouse_id'],
      message: 'El almacén destino solo aplica a transferencias'
    });
  }
  if (data.type === 'return' && !data.return_direction) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['return_direction'],
      message: 'Indica si la devolución es de cliente o a proveedor'
    });
  }
  if (data.type !== 'return' && (data.return_direction || data.disposition)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['return_direction'],
      message: 'Los datos de devolución solo aplican a movimientos de tipo return'
    });
  }
  if (data.return_direction === 'supplier' && data.disposition) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['disposition'],
      message: 'La disposición solo aplica a devoluciones recibidas de clientes'
    });
  }
});

const queryMovementsSchema = z.object({
  type: z.enum(['receive', 'issue', 'transfer', 'return']).optional(),
  status: z.enum(['in_transit', 'completed']).optional(),
  product_id: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

const queryAdjustmentsSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']).default('pending'),
  warehouse_id: z.coerce.number().int().positive().optional(),
  product_id: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

module.exports = {
  queryStockSchema,
  setStockLevelsSchema,
  createCountSessionSchema,
  recordCountItemsSchema,
  requestAdjustmentSchema,
  createMovementSchema,
  queryMovementsSchema,
  queryAdjustmentsSchema
};
