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

    const movements = await query
      .leftJoin('inventory_operations', 'kardex_movements.operation_id', 'inventory_operations.id')
      .select(
        'kardex_movements.*',
        'inventory_operations.status as operation_status',
        'inventory_operations.source_warehouse_id',
        'inventory_operations.destination_warehouse_id',
        'inventory_operations.return_direction',
        'inventory_operations.disposition'
      )
      .orderBy('kardex_movements.created_at', 'asc')
      .orderBy('kardex_movements.id', 'asc');

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

    return db.transaction(async (trx) => {
      const product = await trx('products')
        .where({ id: product_id, business_id: businessId })
        .first();
      if (!product) {
        const error = new Error('El producto no existe o no pertenece a este negocio');
        error.statusCode = 404;
        throw error;
      }

      const existing = await trx('warehouse_stock')
        .where({ business_id: businessId, warehouse_id, product_id })
        .where((builder) => builder.whereNull('lot_number').orWhere('lot_number', ''))
        .forUpdate()
        .first();

      if (existing) {
        const nextMin = min_stock !== undefined ? min_stock : Number(existing.min_stock);
        const nextMax = max_stock !== undefined ? max_stock : Number(existing.max_stock);
        if (nextMax > 0 && nextMax < nextMin) {
          const error = new Error('El stock máximo debe ser mayor o igual al stock mínimo');
          error.statusCode = 400;
          throw error;
        }

        await trx('warehouse_stock')
          .where({ id: existing.id })
          .update({
            min_stock: nextMin,
            max_stock: nextMax,
            aisle: aisle !== undefined ? aisle : existing.aisle,
            rack: rack !== undefined ? rack : existing.rack,
            bin_location: bin_location !== undefined ? bin_location : existing.bin_location,
            updated_at: new Date()
          });

        return trx('warehouse_stock').where({ id: existing.id }).first();
      }

      const newMin = min_stock || 0;
      const newMax = max_stock || 0;
      if (newMax > 0 && newMax < newMin) {
        const error = new Error('El stock máximo debe ser mayor o igual al stock mínimo');
        error.statusCode = 400;
        throw error;
      }

      await trx('warehouse_stock').insert({
        business_id: businessId,
        warehouse_id,
        product_id,
        lot_number: '',
        physical_qty: 0,
        reserved_qty: 0,
        quarantine_qty: 0,
        min_stock: newMin,
        max_stock: newMax,
        aisle: aisle || null,
        rack: rack || null,
        bin_location: bin_location || null,
        created_at: new Date(),
        updated_at: new Date()
      }).onConflict(['business_id', 'warehouse_id', 'product_id', 'lot_number']).ignore();

      return trx('warehouse_stock')
        .where({ business_id: businessId, warehouse_id, product_id, lot_number: '' })
        .first();
    });
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
    return db.transaction(async (trx) => {
      const session = await trx('stock_counts')
        .where({ id: countId, business_id: businessId })
        .forUpdate()
        .first();

      if (!session) {
        const error = new Error('Sesion de conteo no encontrada');
        error.statusCode = 404;
        throw error;
      }

      if (session.status !== 'in_progress') {
        const error = new Error('Esta sesion de conteo ya se encuentra cerrada o completada');
        error.statusCode = 409;
        throw error;
      }

      const processedItems = [];
      const seenProducts = new Set();
      for (const item of items) {
        const lotNumber = item.lot_number || '';
        const countKey = `${item.product_id}:${lotNumber}`;
        if (seenProducts.has(countKey)) {
          const error = new Error('No se puede contar el mismo producto y lote más de una vez en una sesión');
          error.statusCode = 400;
          throw error;
        }
        seenProducts.add(countKey);

        const product = await trx('products')
          .where({ id: item.product_id, business_id: businessId })
          .first();
        if (!product) {
          const error = new Error(`El producto ${item.product_id} no existe o no pertenece a este negocio`);
          error.statusCode = 404;
          throw error;
        }

        const stockQuery = trx('warehouse_stock')
          .where({
            business_id: businessId,
            warehouse_id: session.warehouse_id,
            product_id: item.product_id
          });
        if (lotNumber) {
          stockQuery.where('lot_number', lotNumber);
        } else {
          stockQuery.where((builder) => builder.whereNull('lot_number').orWhere('lot_number', ''));
        }
        const stock = await stockQuery.forUpdate().first();
        const systemQty = stock ? Number(stock.physical_qty) : 0;
        const countedQty = Number(item.counted_qty);
        const differenceQty = countedQty - systemQty;

        const [itemId] = await trx('stock_count_items').insert({
          stock_count_id: countId,
          product_id: item.product_id,
          lot_number: lotNumber,
          system_qty: systemQty,
          counted_qty: countedQty,
          difference_qty: differenceQty,
          created_at: new Date(),
          updated_at: new Date()
        });

        let adjustmentId = null;
        if (differenceQty !== 0) {
          [adjustmentId] = await trx('stock_adjustments').insert({
            business_id: businessId,
            warehouse_id: session.warehouse_id,
            product_id: item.product_id,
            lot_number: lotNumber,
            adjustment_type: differenceQty > 0 ? 'positive' : 'negative',
            qty: Math.abs(differenceQty),
            reason: `Diferencia detectada en conteo cíclico #${countId}`,
            status: 'pending',
            requested_by: session.created_by,
            created_at: new Date(),
            updated_at: new Date()
          });
        }

        processedItems.push({
          id: itemId,
          product_id: item.product_id,
          system_qty: systemQty,
          counted_qty: countedQty,
          difference_qty: differenceQty,
          adjustment_id: adjustmentId
        });
      }

      await trx('stock_counts')
        .where({ id: countId, status: 'in_progress' })
        .update({ status: 'completed', updated_at: new Date() });

      return {
        count_session_id: countId,
        status: 'completed',
        items: processedItems
      };
    });
  }

  // Genera solicitud de ajuste de existencias
  async requestAdjustment(businessId, data, userId) {
    const {
      warehouse_id = 1,
      product_id,
      lot_number,
      adjustment_type,
      qty,
      reason,
      evidence_url
    } = data;

    const product = await db('products').where({ id: product_id, business_id: businessId }).first();
    if (!product) {
      const error = new Error('El producto no existe o no pertenece a este negocio');
      error.statusCode = 404;
      throw error;
    }

    const [id] = await db('stock_adjustments').insert({
      business_id: businessId,
      warehouse_id,
      product_id,
      lot_number: lot_number || '',
      adjustment_type,
      qty,
      reason,
      evidence_url: evidence_url || null,
      status: 'pending',
      requested_by: userId,
      created_at: new Date(),
      updated_at: new Date()
    });

    return db('stock_adjustments').where({ id }).first();
  }

  async listAdjustments(businessId, filters) {
    const query = db('stock_adjustments').where('business_id', businessId);
    if (filters.status) query.where('status', filters.status);
    if (filters.warehouse_id) query.where('warehouse_id', filters.warehouse_id);
    if (filters.product_id) query.where('product_id', filters.product_id);

    const countResult = await query.clone().count({ total: '*' }).first();
    const total = Number(countResult.total);
    const data = await query.clone()
      .orderBy('created_at', 'desc')
      .orderBy('id', 'desc')
      .limit(filters.limit)
      .offset((filters.page - 1) * filters.limit);

    return {
      data,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit)
      }
    };
  }

  // Aprueba solicitud de ajuste con transaccion y registro en Kardex
  async approveAdjustment(businessId, adjustmentId, approverId) {
    return db.transaction(async (trx) => {
      const adjustment = await trx('stock_adjustments')
        .where({ id: adjustmentId, business_id: businessId })
        .forUpdate()
        .first();
      if (!adjustment) {
        const error = new Error('Solicitud de ajuste no encontrada');
        error.statusCode = 404;
        throw error;
      }
      if (adjustment.status !== 'pending') {
        const error = new Error('El ajuste ya fue procesado con estatus: ' + adjustment.status);
        error.statusCode = 409;
        throw error;
      }
      if (adjustment.requested_by === approverId) {
        const error = new Error('La persona que solicita el ajuste no puede aprobarlo');
        error.statusCode = 403;
        throw error;
      }

      const currentStockQuery = trx('warehouse_stock')
        .where({
          business_id: businessId,
          warehouse_id: adjustment.warehouse_id,
          product_id: adjustment.product_id
        });
      if (adjustment.lot_number) {
        currentStockQuery.where('lot_number', adjustment.lot_number);
      } else {
        currentStockQuery.where((builder) => builder.whereNull('lot_number').orWhere('lot_number', ''));
      }
      let currentStock = await currentStockQuery.forUpdate().first();

      if (!currentStock) {
        await trx('warehouse_stock').insert({
          business_id: businessId,
          warehouse_id: adjustment.warehouse_id,
          product_id: adjustment.product_id,
          lot_number: adjustment.lot_number || '',
          physical_qty: 0,
          reserved_qty: 0,
          quarantine_qty: 0,
          min_stock: 0,
          max_stock: 0,
          average_cost: 0,
          created_at: new Date(),
          updated_at: new Date()
        }).onConflict(['business_id', 'warehouse_id', 'product_id', 'lot_number']).ignore();
        currentStock = await trx('warehouse_stock')
          .where({
            business_id: businessId,
            warehouse_id: adjustment.warehouse_id,
            product_id: adjustment.product_id,
            lot_number: adjustment.lot_number || ''
          })
          .first();
      }

      const initialQty = Number(currentStock.physical_qty);
      const adjustmentQty = Number(adjustment.qty);
      let resultingQty = initialQty;

      if (adjustment.adjustment_type === 'positive') {
        resultingQty = initialQty + adjustmentQty;
      } else {
        resultingQty = initialQty - adjustmentQty;
        if (resultingQty < 0) {
          const error = new Error('El ajuste negativo dejaría existencias en números negativos');
          error.statusCode = 409;
          throw error;
        }
      }

      if (adjustment.adjustment_type === 'negative' &&
          initialQty - Number(currentStock.reserved_qty || 0) < adjustmentQty) {
        const error = new Error('El ajuste negativo no puede reducir existencias reservadas');
        error.statusCode = 409;
        throw error;
      }

      await trx('warehouse_stock')
        .where({ id: currentStock.id })
        .update({
          physical_qty: resultingQty,
          average_cost: Number(currentStock.average_cost || 0),
          updated_at: new Date()
        });

      // Registramos movimiento en kardex_movements
      await trx('kardex_movements').insert({
        business_id: businessId,
        warehouse_id: adjustment.warehouse_id,
        product_id: adjustment.product_id,
        lot_number: adjustment.lot_number || '',
        movement_type: adjustment.adjustment_type === 'positive' ? 'adjustment_in' : 'adjustment_out',
        operation_id: null,
        qty: adjustmentQty,
        initial_qty: initialQty,
        resulting_qty: resultingQty,
        unit_cost: Number(currentStock.average_cost || 0),
        average_cost: Number(currentStock.average_cost || 0),
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

      return {
        message: 'Ajuste de inventario aprobado y aplicado al stock con exito',
        adjustment_id: adjustment.id,
        initial_qty: initialQty,
        resulting_qty: resultingQty,
        status: 'approved'
      };
    });
  }
}

module.exports = new InventoryService();
