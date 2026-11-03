const { z } = require('zod');

const permissionAssignmentSchema = z.object({
  permissionId: z.string().min(1, 'ID de permiso requerido'),
  approvalLimitAmount: z.number().nonnegative().nullable().optional(),
  approvalLimitQty: z.number().int().nonnegative().nullable().optional(),
  requiresSecondApprover: z.boolean().optional().default(false)
});

const createRoleSchema = z.object({
  code: z
    .string()
    .trim()
    .min(3, 'El código debe tener al menos 3 caracteres')
    .max(50)
    .regex(
      /^[a-z0-9_]+$/,
      'El código solo puede contener letras minúsculas, números y guiones bajos'
    ),
  name: z.string().trim().min(3, 'El nombre debe tener al menos 3 caracteres').max(100),
  description: z.string().trim().max(500).optional(),
  permissions: z.array(permissionAssignmentSchema).optional().default([])
});

const updateRoleSchema = z.object({
  name: z.string().trim().min(3).max(100).optional(),
  description: z.string().trim().max(500).optional(),
  permissions: z.array(permissionAssignmentSchema).optional()
});

module.exports = {
  createRoleSchema,
  updateRoleSchema
};
