// Controlador del modulo de inventario y Kardex
// Procesa peticiones HTTP y conecta con el servicio de inventario

const inventoryService = require('./inventory.service');
const inventoryMovements = require('./inventory.movements');
const {
  queryStockSchema,
  setStockLevelsSchema,
  createCountSessionSchema,
  recordCountItemsSchema,
  requestAdjustmentSchema,
  createMovementSchema,
  queryMovementsSchema,
  queryAdjustmentsSchema
} = require('./inventory.validation');

class InventoryController {
  protectMovementCosts(result, canReadCosts) {
    const hideCost = (record) => {
      if (!record) return record;
      const copy = { ...record };
      delete copy.request_hash;
      if (!canReadCosts) {
        delete copy.unit_cost;
        delete copy.average_cost;
      }
      return copy;
    };

    return {
      ...result,
      operation: hideCost(result.operation),
      movements: result.movements?.map(hideCost),
      data: result.data?.map(hideCost)
    };
  }

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
      if (!req.user.permissions?.includes('costs.read')) {
        result.data = result.data.map((row) => {
          const copy = { ...row };
          delete copy.average_cost;
          return copy;
        });
      }

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
      const productId = Number(req.params.productId);
      if (!Number.isInteger(productId) || productId <= 0) {
        return res.status(400).json({
          ok: false,
          error: 'El ID de producto debe ser un entero positivo'
        });
      }

      const businessId = req.user.business_id;
      const warehouseId = req.query.warehouse_id ? Number(req.query.warehouse_id) : null;
      if (warehouseId !== null && (!Number.isInteger(warehouseId) || warehouseId <= 0)) {
        return res.status(400).json({ ok: false, error: 'El ID de almacén debe ser un entero positivo' });
      }
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
      if (!req.user.permissions?.includes('costs.read')) {
        delete result.average_cost;
      }

      return res.status(200).json({
        ok: true,
        message: 'Niveles de stock y ubicacion configurados con exito',
        data: result
      });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({
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
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({
        ok: false,
        error: error.message || 'Error al iniciar conteo'
      });
    }
  }

  // Registra cantidades contadas y reporta diferencias contra el sistema
  async recordCountItems(req, res) {
    try {
      const countId = Number(req.params.id);
      if (!Number.isInteger(countId) || countId <= 0) {
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
        message: 'Conteo registrado; las diferencias requieren aprobación antes de modificar el stock',
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

  async listAdjustments(req, res) {
    try {
      const parsed = queryAdjustmentsSchema.safeParse(req.query);
      if (!parsed.success) {
        return res.status(400).json({
          ok: false,
          error: 'Parametros de consulta invalidos',
          details: parsed.error.format()
        });
      }

      const result = await inventoryService.listAdjustments(req.user.business_id, parsed.data);
      return res.status(200).json({ ok: true, ...result });
    } catch (error) {
      return res.status(500).json({
        ok: false,
        error: error.message || 'Error al consultar solicitudes de ajuste'
      });
    }
  }

  // Aprueba ajuste de stock aplicando transaccion y registro en Kardex
  async approveAdjustment(req, res) {
    try {
      const adjustmentId = Number(req.params.id);
      if (!Number.isInteger(adjustmentId) || adjustmentId <= 0) {
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

  async listMovements(req, res) {
    try {
      const parsed = queryMovementsSchema.safeParse(req.query);
      if (!parsed.success) {
        return res.status(400).json({
          ok: false,
          error: 'Parametros de consulta invalidos',
          details: parsed.error.format()
        });
      }

      const result = await inventoryMovements.list(req.user.business_id, parsed.data);
      const canReadCosts = req.user.permissions?.includes('costs.read') || false;
      if (!canReadCosts) {
        result.data = result.data.map((operation) => {
          const copy = { ...operation };
          delete copy.unit_cost;
          return copy;
        });
      }
      return res.status(200).json({ ok: true, ...result });
    } catch (error) {
      return res.status(500).json({
        ok: false,
        error: error.message || 'Error al consultar movimientos'
      });
    }
  }

  async createMovement(req, res) {
    try {
      const parsed = createMovementSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          ok: false,
          error: 'Datos invalidos para el movimiento',
          details: parsed.error.format()
        });
      }

      const result = await inventoryMovements.create(
        req.user.business_id,
        req.user.id,
        parsed.data
      );
      const canReadCosts = req.user.permissions?.includes('costs.read') || false;
      return res
        .status(result.duplicate ? 200 : 201)
        .json({ ok: true, ...this.protectMovementCosts(result, canReadCosts) });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        ok: false,
        error: error.message || 'Error al registrar movimiento'
      });
    }
  }

  async receiveTransfer(req, res) {
    try {
      const operationId = Number(req.params.id);
      if (!Number.isInteger(operationId) || operationId <= 0) {
        return res.status(400).json({ ok: false, error: 'El ID de transferencia debe ser un entero positivo' });
      }

      const result = await inventoryMovements.receiveTransfer(
        req.user.business_id,
        operationId,
        req.user.id
      );
      const canReadCosts = req.user.permissions?.includes('costs.read') || false;
      return res.status(200).json({ ok: true, ...this.protectMovementCosts(result, canReadCosts) });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        ok: false,
        error: error.message || 'Error al recibir transferencia'
      });
    }
  }
}

module.exports = new InventoryController();
