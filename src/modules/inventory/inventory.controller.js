// Controlador del modulo de inventario y Kardex
// Procesa peticiones HTTP y conecta con el servicio de inventario

const inventoryService = require('./inventory.service');
const {
  queryStockSchema,
  setStockLevelsSchema,
  createCountSessionSchema,
  recordCountItemsSchema,
  requestAdjustmentSchema
} = require('./inventory.validation');

class InventoryController {
  // Consulta de stock con calculo dinamico de disponible y alertas
  async getStock(req, res) {
    try {
      const parsed = queryStockSchema.safeParse(req.query);
      if (!parsed.success) {
        return res.status(400).json({
          ok: false,
          error: 'Parametros de consulta invalidos',
          details: parsed.error.format()
        });
      }

      const businessId = req.user.business_id;
      const result = await inventoryService.listStock(businessId, parsed.data);

      return res.status(200).json({
        ok: true,
        ...result
      });
    } catch (error) {
      return res.status(500).json({
        ok: false,
        error: error.message || 'Error al consultar existencias de inventario'
      });
    }
  }

  // Consulta de linea de tiempo de Kardex con proteccion de costos
  async getKardex(req, res) {
    try {
      const productId = parseInt(req.params.productId, 10);
      if (isNaN(productId)) {
        return res.status(400).json({
          ok: false,
          error: 'El ID de producto debe ser un numero entero'
        });
      }

      const businessId = req.user.business_id;
      const warehouseId = req.query.warehouse_id ? parseInt(req.query.warehouse_id, 10) : null;
      const canReadCosts = req.user.permissions?.includes('costs.read') || false;

      const movements = await inventoryService.getKardex(businessId, productId, warehouseId, canReadCosts);

      return res.status(200).json({
        ok: true,
        product_id: productId,
        total_movements: movements.length,
        movements
      });
    } catch (error) {
      return res.status(500).json({
        ok: false,
        error: error.message || 'Error al consultar Kardex del producto'
      });
    }
  }

  // Establece stock minimo y maximo para control de reposicion
  async setLevels(req, res) {
    try {
      const parsed = setStockLevelsSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          ok: false,
          error: 'Datos invalidos para niveles de stock',
          details: parsed.error.format()
        });
      }

      const businessId = req.user.business_id;
      const result = await inventoryService.setStockLevels(businessId, parsed.data);

      return res.status(200).json({
        ok: true,
        message: 'Niveles de stock y ubicacion configurados con exito',
        data: result
      });
    } catch (error) {
      return res.status(500).json({
        ok: false,
        error: error.message || 'Error al configurar niveles de stock'
      });
    }
  }

  // Abre sesion de conteo ciclico para almacenistas
  async createCount(req, res) {
    try {
      const parsed = createCountSessionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          ok: false,
          error: 'Datos invalidos para la sesion de conteo',
          details: parsed.error.format()
        });
      }

      const businessId = req.user.business_id;
      const userId = req.user.id;
      const result = await inventoryService.createCountSession(
        businessId,
        parsed.data.warehouse_id,
        userId,
        parsed.data.notes
      );

      return res.status(201).json({
        ok: true,
        message: 'Sesion de conteo ciclico iniciada',
        data: result
      });
    } catch (error) {
      return res.status(500).json({
        ok: false,
        error: error.message || 'Error al iniciar conteo'
      });
    }
  }

  // Registra cantidades contadas y reporta diferencias contra el sistema
  async recordCountItems(req, res) {
    try {
      const countId = parseInt(req.params.id, 10);
      if (isNaN(countId)) {
        return res.status(400).json({
          ok: false,
          error: 'El ID de la sesion de conteo debe ser un numero entero'
        });
      }

      const parsed = recordCountItemsSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          ok: false,
          error: 'Formato de conteo invalido',
          details: parsed.error.format()
        });
      }

      const businessId = req.user.business_id;
      const result = await inventoryService.recordCountItems(businessId, countId, parsed.data.items);

      return res.status(200).json({
        ok: true,
        message: 'Conteo registrado y conciliado con el inventario del sistema',
        data: result
      });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({
        ok: false,
        error: error.message || 'Error al registrar resultados de conteo'
      });
    }
  }

  // Genera solicitud de ajuste de stock
  async requestAdjustment(req, res) {
    try {
      const parsed = requestAdjustmentSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          ok: false,
          error: 'Datos invalidos en la solicitud de ajuste',
          details: parsed.error.format()
        });
      }

      const businessId = req.user.business_id;
      const userId = req.user.id;
      const result = await inventoryService.requestAdjustment(businessId, parsed.data, userId);

      return res.status(201).json({
        ok: true,
        message: 'Solicitud de ajuste creada en estado pendiente de aprobacion',
        data: result
      });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({
        ok: false,
        error: error.message || 'Error al crear solicitud de ajuste'
      });
    }
  }

  // Aprueba ajuste de stock aplicando transaccion y registro en Kardex
  async approveAdjustment(req, res) {
    try {
      const adjustmentId = parseInt(req.params.id, 10);
      if (isNaN(adjustmentId)) {
        return res.status(400).json({
          ok: false,
          error: 'El ID de ajuste debe ser un numero entero'
        });
      }

      const businessId = req.user.business_id;
      const approverId = req.user.id;
      const result = await inventoryService.approveAdjustment(businessId, adjustmentId, approverId);

      return res.status(200).json({
        ok: true,
        ...result
      });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({
        ok: false,
        error: error.message || 'Error al aprobar ajuste de inventario'
      });
    }
  }
}

module.exports = new InventoryController();

