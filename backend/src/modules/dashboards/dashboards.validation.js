const { z } = require('zod');

// Validación de widgets en el Grid Dinámico de 16 slots de OmniStock Pulse
const widgetSchema = z.object({
  id: z.string().optional(),
  widgetType: z.string().min(2).max(80),
  title: z.string().min(2).max(150),
  config: z.record(z.any()).optional().default({}),
  posX: z.number().int().min(0).max(3), // Columnas 0 a 3 (Grid de 4 columnas)
  posY: z.number().int().min(0).max(10), // Filas
  width: z.number().int().min(1).max(4), // Ancho en columnas: 1, 2, 3 o 4
  height: z.number().int().min(1).max(2), // Alto en filas: 1 o 2
  sortOrder: z.number().int().min(0).optional().default(0),
  isFavorite: z.boolean().optional().default(false)
});

const createDashboardSchema = z.object({
  name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(150),
  isDefault: z.boolean().optional().default(false),
  isShared: z.boolean().optional().default(false),
  sharedScope: z.enum(['private', 'business', 'role']).optional().default('private'),
  widgets: z.array(widgetSchema).optional().default([])
});

const updateDashboardSchema = z.object({
  name: z.string().trim().min(2).max(150).optional(),
  isDefault: z.boolean().optional(),
  isShared: z.boolean().optional(),
  sharedScope: z.enum(['private', 'business', 'role']).optional(),
  widgets: z.array(widgetSchema).optional()
});

module.exports = {
  createDashboardSchema,
  updateDashboardSchema
};
