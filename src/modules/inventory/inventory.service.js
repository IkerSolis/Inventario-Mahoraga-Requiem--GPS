// Servicio del modulo de inventario y calculo dinamico de stock
// Incluye reglas de existencias, kardex, conteo ciclico y solicitudes de ajuste

const db = require('../../config/database');

class InventoryService {
  // Calcula dinamicamente el estado del stock y alertas segun cantidades
  calculateStockState(physicalQty, reservedQty, minStock) {
    const physical = Number(physicalQty || 0);
    const reserved = Number(reservedQty || 0);
    const min = Number(minStock || 0);

    const available = physical - reserved;

    let state = 'Optimo';
    let alert = 'verde';

    if (physical <= 0) {
      state = 'Agotado';
      alert = 'roja';
    } else if (physical <= min) {
      state = 'Stock Bajo';
      alert = 'amarilla';
    }

    return {
      available_qty: available,
      state,
      alert
    };
  }

  // Lista stock por almacen con calculo dinamico
  async listStock(businessId, filters = {}) {
    const { warehouse_id, product_id, state, search, page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;

    const query = db('warehouse_stock')
      .join('products', 'warehouse_stock.product_id', 'products.id')
      .where('warehouse_stock.business_id', businessId)
      .select(
        'warehouse_stock.*',
        'products.name as product_name',
        'products.sku as product_sku',
        'products.barcode as product_barcode',
        'products.unit as product_unit'
      );

    if (warehouse_id) {
      query.where('warehouse_stock.warehouse_id', warehouse_id);
    }
    if (product_id) {
      query.where('warehouse_stock.product_id', product_id);
    }
    if (search) {
      query.where((b) => {
        b.where('products.name', 'like', `%${search}%`)
          .orWhere('products.sku', 'like', `%${search}%`)
          .orWhere('products.barcode', 'like', `%${search}%`);
      });
    }

    const rows = await query.orderBy('warehouse_stock.id', 'desc');

    // Procesamos calculo dinamico de stock disponible y alertas
    const processed = rows.map((row) => {
      const dynamic = this.calculateStockState(
        row.physical_qty,
        row.reserved_qty,
        row.min_stock
      );

      return {
        ...row,
        available_qty: dynamic.available_qty,
        stock_state: dynamic.state,
        alert_level: dynamic.alert
      };
    });

    // Filtramos por estado si se especifico
    let filtered = processed;
    if (state && state !== 'todos') {
      const stateMap = {
        optimo: 'Optimo',
        bajo: 'Stock Bajo',
        agotado: 'Agotado'
      };
      const targetState = stateMap[state];
      if (targetState) {
        filtered = processed.filter(item => item.stock_state === targetState);
      }
    }

    const total = filtered.length;
    const paginated = filtered.slice(offset, offset + limit);

    return {
      data: paginated,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  // Consulta el Kardex de un producto reconstruyendo la linea de tiempo
  async getKardex(businessId, productId, warehouseId = null, canReadCosts = false) {
    const query = db('kardex_movements')
      .where({ business_id: businessId, product_id: productId });

    if (warehouseId) {
      query.where('warehouse_id', warehouseId);
    }

    const movements = await query.orderBy('id', 'asc');

    // Sanitizamos costos si el usuario no tiene permiso costs.read
    return movements.map((mov) => {
      const copy = { ...mov };
      if (!canReadCosts) {
        delete copy.unit_cost;
        delete copy.average_cost;
      }
      return copy;
    });
  }

  // Establece niveles de stock minimo, maximo y ubicaciones en almacen
  async setStockLevels(businessId, data) {
    const { product_id, warehouse_id = 1, min_stock, max_stock, aisle, rack, bin_location } = data;

    const existing = await db('warehouse_stock')
      .where({ business_id: businessId, warehouse_id, product_id })
      .first();

    if (existing) {
      await db('warehouse_stock')
        .where({ id: existing.id })
        .update({
          min_stock: min_stock !== undefined ? min_stock : existing.min_stock,
          max_stock: max_stock !== undefined ? max_stock : existing.max_stock,
          aisle: aisle !== undefined ? aisle : existing.aisle,
          rack: rack !== undefined ? rack : existing.rack,
          bin_location: bin_location !== undefined ? bin_location : existing.bin_location,
          updated_at: new Date()
        });

      return await db('warehouse_stock').where({ id: existing.id }).first();
    }

    const [newId] = await db('warehouse_stock').insert({
      business_id: businessId,
      warehouse_id,
      product_id,
      physical_qty: 0,
      reserved_qty: 0,
      min_stock: min_stock || 0,
      max_stock: max_stock || 0,
      aisle: aisle || null,
      rack: rack || null,
      bin_location: bin_location || null,
      created_at: new Date(),
      updated_at: new Date()
    });

    return await db('warehouse_stock').where({ id: newId }).first();
  }

  // Inicia una nueva sesion de conteo ciclico
  async createCountSession(businessId, warehouseId, userId, notes) {
    const [id] = await db('stock_counts').insert({
      business_id: businessId,
      warehouse_id: warehouseId || 1,
      status: 'in_progress',
      notes: notes || null,
      created_by: userId,
      created_at: new Date(),
      updated_at: new Date()
    });

    return await db('stock_counts').where({ id }).first();
  }

  // Registra las cantidades fisicas contadas y calcula diferencias
  async recordCountItems(businessId, countId, items) {
    const session = await db('stock_counts')
      .where({ id: countId, business_id: businessId })
      .first();

    if (!session) {
      const error = new Error('Sesion de conteo no encontrada');
      error.statusCode = 404;
      throw error;
    }

    if (session.status !== 'in_progress') {
      const error = new Error('Esta sesion de conteo ya se encuentra cerrada o completada');
      error.statusCode = 400;
      throw error;
    }

    const processedItems = [];

    for (const item of items) {
      const stock = await db('warehouse_stock')
        .where({
          business_id: businessId,
          warehouse_id: session.warehouse_id,
          product_id: item.product_id
        })
        .first();

      const systemQty = stock ? Number(stock.physical_qty) : 0;
      const countedQty = Number(item.counted_qty);
      const differenceQty = countedQty - systemQty;

      const [itemId] = await db('stock_count_items').insert({
        stock_count_id: countId,
        product_id: item.product_id,
        system_qty: systemQty,
        counted_qty: countedQty,
        difference_qty: differenceQty,
        created_at: new Date(),
        updated_at: new Date()
      });

      processedItems.push({
        id: itemId,
        product_id: item.product_id,
        system_qty: systemQty,
        counted_qty: countedQty,
        difference_qty: differenceQty
      });
    }

    await db('stock_counts')
      .where({ id: countId })
      .update({ status: 'completed', updated_at: new Date() });

    return {
      count_session_id: countId,
      status: 'completed',
      items: processedItems
    };
  }

  // Genera solicitud de ajuste de existencias
  async requestAdjustment(businessId, data, userId) {
    const { warehouse_id = 1, product_id, adjustment_type, qty, reason, evidence_url } = data;

    const [id] = await db('stock_adjustments').insert({
      business_id: businessId,
      warehouse_id,
      product_id,
      adjustment_type,
      qty,
      reason,
      evidence_url: evidence_url || null,
      status: 'pending',
      requested_by: userId,
      created_at: new Date(),
      updated_at: new Date()
    });

    return await db('stock_adjustments').where({ id }).first();
  }

  // Aprueba solicitud de ajuste con transaccion y registro en Kardex
  async approveAdjustment(businessId, adjustmentId, approverId) {
    const adjustment = await db('stock_adjustments')
      .where({ id: adjustmentId, business_id: businessId })
      .first();

    if (!adjustment) {
      const error = new Error('Solicitud de ajuste no encontrada');
      error.statusCode = 404;
      throw error;
    }

    if (adjustment.status !== 'pending') {
      const error = new Error('El ajuste ya fue procesado con estatus: ' + adjustment.status);
      error.statusCode = 400;
      throw error;
    }

    const trx = await db.transaction();

    try {
      let currentStock = await trx('warehouse_stock')
        .where({
          business_id: businessId,
          warehouse_id: adjustment.warehouse_id,
          product_id: adjustment.product_id
        })
        .first();

      if (!currentStock) {
        const [newStockId] = await trx('warehouse_stock').insert({
          business_id: businessId,
          warehouse_id: adjustment.warehouse_id,
          product_id: adjustment.product_id,
          physical_qty: 0,
          reserved_qty: 0,
          min_stock: 0,
          max_stock: 0,
          created_at: new Date(),
          updated_at: new Date()
        });
        currentStock = await trx('warehouse_stock').where({ id: newStockId }).first();
      }

      const initialQty = Number(currentStock.physical_qty);
      const adjustmentQty = Number(adjustment.qty);
      let resultingQty = initialQty;

      if (adjustment.adjustment_type === 'positive') {
        resultingQty = initialQty + adjustmentQty;
      } else {
        resultingQty = initialQty - adjustmentQty;
        if (resultingQty < 0) {
          throw new Error('El ajuste negativo dejaria existencias en numeros negativos');
        }
      }

      await trx('warehouse_stock')
        .where({ id: currentStock.id })
        .update({
          physical_qty: resultingQty,
          updated_at: new Date()
        });

      // Registramos movimiento en kardex_movements
      await trx('kardex_movements').insert({
        business_id: businessId,
        warehouse_id: adjustment.warehouse_id,
        product_id: adjustment.product_id,
        movement_type: 'adjustment',
        qty: adjustmentQty,
        initial_qty: initialQty,
        resulting_qty: resultingQty,
        unit_cost: 0,
        average_cost: 0,
        reference_doc: 'Ajuste ID ' + adjustment.id + ': ' + adjustment.reason,
        user_id: approverId,
        created_at: new Date()
      });

      await trx('stock_adjustments')
        .where({ id: adjustment.id })
        .update({
          status: 'approved',
          approved_by: approverId,
          updated_at: new Date()
        });

      await trx.commit();

      return {
        message: 'Ajuste de inventario aprobado y aplicado al stock con exito',
        adjustment_id: adjustment.id,
        initial_qty: initialQty,
        resulting_qty: resultingQty,
        status: 'approved'
      };
    } catch (err) {
      await trx.rollback();
      throw err;
    }
  }
}

module.exports = new InventoryService();

