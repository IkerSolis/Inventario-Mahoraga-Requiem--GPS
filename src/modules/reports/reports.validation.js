const { z } = require('zod');

const reportNames = [
  'inventory-valuation',
  'movement-history',
  'supplier-receipts',
  'sales-dispatches',
  'low-stock',
  'product-margins',
  'category-performance',
  'top-selling',
  'slow-moving',
  'product-catalog'
];

const reportFiltersSchema = z.object({
  from: z.string().date().optional(),
  to: z.string().date().optional(),
  warehouse_id: z.coerce.number().int().positive().optional(),
  product_id: z.coerce.number().int().positive().optional(),
  supplier_id: z.coerce.number().int().positive().optional(),
  category_id: z.coerce.number().int().positive().optional(),
  threshold_days: z.coerce.number().int().min(1).max(3650).default(30),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(100)
}).superRefine((filters, ctx) => {
  if (filters.from && filters.to && filters.from > filters.to) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['from'],
      message: 'La fecha inicial debe ser anterior o igual a la fecha final'
    });
  }
});

const exportFormatSchema = z.enum(['csv', 'xlsx', 'pdf']);
const exportAuditFiltersSchema = z.object({
  report_name: z.enum(reportNames).optional(),
  format: exportFormatSchema.optional(),
  user_id: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

module.exports = {
  reportNames,
  reportFiltersSchema,
  exportFormatSchema,
  exportAuditFiltersSchema
};
