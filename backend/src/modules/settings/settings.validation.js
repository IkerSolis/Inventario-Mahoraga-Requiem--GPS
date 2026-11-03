const { z } = require('zod');

const updateCompanySchema = z.object({
  name: z.string().trim().min(2).max(150).optional(),
  legalName: z.string().trim().max(200).optional(),
  taxId: z.string().trim().max(50).optional(),
  phone: z.string().trim().max(50).optional(),
  email: z.string().trim().email().optional(),
  address: z.string().trim().max(500).optional(),
  approvalLimits: z
    .object({
      maxUnapprovedAdjustmentAmount: z.number().nonnegative().optional(),
      maxUnapprovedAdjustmentQty: z.number().int().nonnegative().optional()
    })
    .optional()
});

const updateThemeSchema = z.object({
  colorPrimary: z
    .string()
    .regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, 'Color primario hexadecimal inválido')
    .optional(),
  colorBg: z
    .string()
    .regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, 'Color de fondo hexadecimal inválido')
    .optional(),
  colorSurface: z
    .string()
    .regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, 'Color de superficie hexadecimal inválido')
    .optional(),
  borderRadius: z.string().max(20).optional(),
  tableDensity: z.enum(['compact', 'comfortable']).optional()
});

const createBranchSchema = z.object({
  code: z.string().trim().min(2).max(50),
  name: z.string().trim().min(2).max(150),
  address: z.string().trim().max(500).optional()
});

const createWarehouseSchema = z.object({
  branchId: z.string().min(1, 'ID de sucursal requerido'),
  code: z.string().trim().min(2).max(50),
  name: z.string().trim().min(2).max(150)
});

module.exports = {
  updateCompanySchema,
  updateThemeSchema,
  createBranchSchema,
  createWarehouseSchema
};
