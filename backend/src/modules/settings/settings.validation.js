const { z } = require('zod');

const hexColorRegex = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
const passwordComplexityRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,64}$/;

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
  mode: z.enum(['light', 'dark']).optional(),
  colorPrimary: z.string().regex(hexColorRegex, 'Color primario hexadecimal inválido').optional(),
  colorBg: z.string().regex(hexColorRegex, 'Color de fondo hexadecimal inválido').optional(),
  colorSurface: z
    .string()
    .regex(hexColorRegex, 'Color de superficie hexadecimal inválido')
    .optional(),
  colorSuccess: z.string().regex(hexColorRegex, 'Color de éxito hexadecimal inválido').optional(),
  colorWarning: z
    .string()
    .regex(hexColorRegex, 'Color de advertencia hexadecimal inválido')
    .optional(),
  colorDanger: z.string().regex(hexColorRegex, 'Color de peligro hexadecimal inválido').optional(),
  borderRadius: z.string().max(20).optional(),
  tableDensity: z.enum(['compact', 'comfortable']).optional()
});

const updateRegionalSchema = z.object({
  locale: z.enum(['es-MX', 'es-ES', 'en-US', 'en-GB', 'pt-BR']).optional(),
  currency: z.string().trim().min(3).max(5).toUpperCase().optional(),
  currencySymbol: z.string().trim().min(1).max(5).optional(),
  decimals: z.number().int().min(0).max(4).optional(),
  dateFormat: z.enum(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']).optional(),
  timezone: z.string().trim().min(3).max(80).optional()
});

const updateNotificationsSchema = z.object({
  lowStockAlert: z.boolean().optional(),
  pendingApprovalAlert: z.boolean().optional(),
  fifoExpirationAlertDays: z.number().int().min(1).max(365).optional(),
  dailySummaryEmail: z.boolean().optional(),
  pushEnabled: z.boolean().optional(),
  emailEnabled: z.boolean().optional()
});

const updateSmtpSchema = z.object({
  host: z.string().trim().min(3, 'Servidor SMTP requerido').max(150),
  port: z.number().int().min(1).max(65535),
  secure: z.boolean().optional().default(false),
  user: z.string().trim().max(150).optional().default(''),
  pass: z.string().max(200).optional(),
  from: z.string().trim().min(3, 'Remitente requerido').max(150)
});

const testSmtpSchema = z.object({
  to: z.string().trim().email('Correo destino inválido')
});

const createBranchSchema = z.object({
  code: z.string().trim().min(2).max(50),
  name: z.string().trim().min(2).max(150),
  address: z.string().trim().max(500).optional()
});

const updateBranchSchema = z.object({
  code: z.string().trim().min(2).max(50).optional(),
  name: z.string().trim().min(2).max(150).optional(),
  address: z.string().trim().max(500).nullable().optional(),
  isActive: z.boolean().optional()
});

const createWarehouseSchema = z.object({
  branchId: z.string().min(1, 'ID de sucursal requerido'),
  code: z.string().trim().min(2).max(50),
  name: z.string().trim().min(2).max(150)
});

const updateWarehouseSchema = z.object({
  branchId: z.string().min(1).optional(),
  code: z.string().trim().min(2).max(50).optional(),
  name: z.string().trim().min(2).max(150).optional(),
  isActive: z.boolean().optional()
});

const onboardingSchema = z.object({
  companyName: z.string().trim().min(2).max(150),
  legalName: z.string().trim().max(200).optional(),
  taxId: z.string().trim().max(50).optional(),
  branchCode: z.string().trim().min(2).max(50).optional().default('MAT-01'),
  branchName: z.string().trim().min(2).max(150).optional().default('Sucursal Matriz'),
  warehouseCode: z.string().trim().min(2).max(50).optional().default('ALM-01'),
  warehouseName: z.string().trim().min(2).max(150).optional().default('Almacén General'),
  ownerName: z.string().trim().min(2).max(150),
  ownerEmail: z.string().trim().email('Correo de propietario inválido').toLowerCase(),
  ownerPassword: z
    .string()
    .regex(
      passwordComplexityRegex,
      'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial.'
    )
});

module.exports = {
  updateCompanySchema,
  updateThemeSchema,
  updateRegionalSchema,
  updateNotificationsSchema,
  updateSmtpSchema,
  testSmtpSchema,
  createBranchSchema,
  updateBranchSchema,
  createWarehouseSchema,
  updateWarehouseSchema,
  onboardingSchema
};
