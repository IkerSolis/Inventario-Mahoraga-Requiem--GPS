const { z } = require('zod');

const createUserSchema = z.object({
  name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(150),
  email: z.string().trim().email('Formato de correo no válido').toLowerCase(),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .optional()
    .nullable(),
  status: z.enum(['active', 'pending', 'disabled']).optional().default('active'),
  roleIds: z.array(z.string()).optional().default([]),
  scopes: z
    .array(
      z.object({
        branch_id: z.string().nullable().optional(),
        warehouse_id: z.string().nullable().optional()
      })
    )
    .optional()
    .default([])
});

const updateUserSchema = z.object({
  name: z.string().trim().min(2).max(150).optional(),
  email: z.string().trim().email().toLowerCase().optional(),
  status: z.enum(['active', 'pending', 'disabled']).optional(),
  roleIds: z.array(z.string()).optional(),
  scopes: z
    .array(
      z.object({
        branch_id: z.string().nullable().optional(),
        warehouse_id: z.string().nullable().optional()
      })
    )
    .optional()
});

const userStatusSchema = z.object({
  status: z.enum(['active', 'disabled'], {
    errorMap: () => ({ message: 'El estado debe ser "active" o "disabled"' })
  })
});

const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
  search: z.string().trim().optional(),
  status: z.enum(['active', 'pending', 'disabled']).optional(),
  role: z.string().trim().optional()
});

module.exports = {
  createUserSchema,
  updateUserSchema,
  userStatusSchema,
  listUsersQuerySchema
};
