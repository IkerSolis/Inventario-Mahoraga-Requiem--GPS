/**
 * Esquemas de validación con Zod para el módulo de Categorías.
 */
const { z } = require('zod');

// Regex para validar colores hexadecimales (#RGB, #RRGGBB o #RRGGBBAA)
const hexColorRegex = /^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/;

// Esquema para creación de categoría o subcategoría
const createCategorySchema = z.object({
  name: z.string({
    required_error: 'El nombre de la categoría es obligatorio.'
  }).trim().min(2, 'El nombre debe tener al menos 2 caracteres.').max(150),

  slug: z.string().trim().toLowerCase().regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'El slug solo puede contener letras minúsculas, números y guiones (ej. electronica-audio).'
  ).optional(),

  parent_id: z.coerce.number().int().positive().optional().nullable(),

  description: z.string().trim().max(500).optional().nullable(),

  icon_name: z.string().trim().max(100).optional().default('category'),

  color_hex: z.string().trim().regex(
    hexColorRegex,
    'El color debe ser un valor hexadecimal válido (ej. #4F46E5).'
  ).optional().default('#4F46E5'),

  status: z.enum(['active', 'inactive']).default('active')
});

// Esquema para actualización parcial
const updateCategorySchema = createCategorySchema.partial();

// Esquema para listar categorías con filtros
const queryCategoriesSchema = z.object({
  status: z.enum(['active', 'inactive', 'all']).default('all'),
  parent_id: z.union([
    z.coerce.number().int().positive(),
    z.literal('null')
  ]).optional(),
  tree: z.coerce.boolean().default(false), // true para devolver estructura jerárquica anidada
  search: z.string().trim().optional()
});

module.exports = {
  createCategorySchema,
  updateCategorySchema,
  queryCategoriesSchema
};

