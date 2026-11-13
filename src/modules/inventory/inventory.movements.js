const db = require('../../config/database');
const crypto = require('crypto');

class InventoryMovements {
  stockQuery(trx, businessId, warehouseId, productId, lotNumber) {
    const query = trx('warehouse_stock')
      .where({ business_id: businessId, warehouse_id: warehouseId, product_id: productId });

    return lotNumber
      ? query.where({ lot_number: lotNumber })
      : query.where((builder) => builder.whereNull('lot_number').orWhere('lot_number', ''));
  }

  async getOrCreateStock(trx, businessId, warehouseId, productId, lotNumber = null) {
    let stock = await this.stockQuery(trx, businessId, warehouseId, productId, lotNumber)
      .forUpdate()
      .first();

    if (!stock) {
      await trx('warehouse_stock').insert({
        business_id: businessId,
        warehouse_id: warehouseId,
        product_id: productId,
        lot_number: lotNumber || '',
        physical_qty: 0,
        reserved_qty: 0,
        quarantine_qty: 0,
        min_stock: 0,
        max_stock: 0,
        created_at: new Date(),
        updated_at: new Date()
      }).onConflict(['business_id', 'warehouse_id', 'product_id', 'lot_number']).ignore();
      stock = await this.stockQuery(trx, businessId, warehouseId, productId, lotNumber).first();
    }

    return stock;
  }

  async record(trx, operation, warehouseId, movementType, userId) {
    const stock = await this.getOrCreateStock(
      trx,
      operation.business_id,
      warehouseId,
      operation.product_id,
      operation.lot_number
    );
    const initialQty = Number(stock.physical_qty);
    const quantity = Number(operation.qty);
    const inbound = ['receive', 'return_in', 'transfer_in'].includes(movementType);
    const quarantineQty = Number(stock.quarantine_qty || 0);
    const reservedQty = Number(stock.reserved_qty || 0);
    let resultingQty = initialQty + (inbound ? quantity : -quantity);

    if (resultingQty < 0) {
      const error = new Error('No hay existencias disponibles suficientes para realizar este movimiento');
      error.statusCode = 409;
      throw error;
    }

    if (!inbound && initialQty - reservedQty < quantity) {
      const error = new Error('La cantidad solicitada supera el stock disponible');
      error.statusCode = 409;
      throw error;
    }

    const unitCost = movementType === 'transfer_out'
      ? Number(stock.average_cost || 0)
      : Number(operation.unit_cost || 0);
    if (movementType === 'transfer_out') {
      operation.unit_cost = unitCost;
      await trx('inventory_operations')
        .where({ id: operation.id })
        .update({ unit_cost: unitCost, updated_at: new Date() });
    }
    const nextAverage = inbound && resultingQty > 0
      ? ((initialQty * Number(stock.average_cost || 0)) + (quantity * unitCost)) / resultingQty
      : Number(stock.average_cost || 0);
    const nextQuarantineQty = movementType === 'return_in' && operation.disposition === 'quarantine'
      ? quarantineQty + quantity
      : quarantineQty;
    const nextReservedQty = movementType === 'return_in' && operation.disposition === 'quarantine'
      ? reservedQty + quantity
      : reservedQty;

    await trx('warehouse_stock')
      .where({ id: stock.id })
      .update({
        physical_qty: resultingQty,
        reserved_qty: nextReservedQty,
        quarantine_qty: nextQuarantineQty,
        average_cost: nextAverage,
        updated_at: new Date()
      });

    const [movementId] = await trx('kardex_movements').insert({
      business_id: operation.business_id,
      warehouse_id: warehouseId,
      product_id: operation.product_id,
      lot_number: operation.lot_number,
      operation_id: operation.id,
      movement_type: movementType,
      qty: quantity,
      initial_qty: initialQty,
      resulting_qty: resultingQty,
      unit_cost: unitCost,
      average_cost: nextAverage,
      reference_doc: operation.reference_doc,
      user_id: userId,
      created_at: new Date()
    });

    return { id: movementId, initial_qty: initialQty, resulting_qty: resultingQty };
  }

  requestHash(data) {
    return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
  }

  async create(businessId, userId, data) {
    const requestHash = this.requestHash(data);
    const existing = await db('inventory_operations')
      .where({ business_id: businessId, idempotency_key: data.idempotency_key })
      .first();

    if (existing) {
      return this.resolveDuplicate(existing, requestHash);
    }

    try {
      return await db.transaction(async (trx) => {
        const product = await trx('products')
          .where({ id: data.product_id, business_id: businessId, status: 'active' })
          .first();
        if (!product) {
          const error = new Error('El producto no existe o no pertenece a este negocio');
          error.statusCode = 404;
          throw error;
        }

        if (data.destination_warehouse_id === data.warehouse_id) {
          const error = new Error('El almacén de origen y destino deben ser distintos');
          error.statusCode = 400;
          throw error;
        }

        const isTransfer = data.type === 'transfer';
        const [operationId] = await trx('inventory_operations').insert({
          business_id: businessId,
          movement_type: data.type,
          status: isTransfer ? 'in_transit' : 'completed',
          source_warehouse_id: data.warehouse_id,
          destination_warehouse_id: isTransfer ? data.destination_warehouse_id : null,
          product_id: data.product_id,
          lot_number: data.lot_number || '',
          qty: data.qty,
          unit_cost: data.unit_cost || 0,
          reference_doc: data.reference_doc || null,
          return_direction: data.return_direction || null,
          disposition: data.disposition || null,
          idempotency_key: data.idempotency_key,
          request_hash: requestHash,
          actor_id: userId,
          completed_at: isTransfer ? null : new Date(),
          created_at: new Date(),
          updated_at: new Date()
        });
        const operation = await trx('inventory_operations').where({ id: operationId }).first();

        let movement;
        switch (data.type) {
          case 'receive':
            movement = await this.record(trx, operation, data.warehouse_id, 'receive', userId);
            break;
          case 'issue':
            movement = await this.record(trx, operation, data.warehouse_id, 'issue', userId);
            break;
          case 'return':
            movement = await this.record(
              trx,
              operation,
              data.warehouse_id,
              data.return_direction === 'customer' ? 'return_in' : 'return_out',
              userId
            );
            break;
          case 'transfer':
            movement = await this.record(trx, operation, data.warehouse_id, 'transfer_out', userId);
            break;
          default: {
            const error = new Error('Tipo de movimiento no soportado');
            error.statusCode = 400;
            throw error;
          }
        }

        return { operation, movements: [movement] };
      });
    } catch (error) {
      if (error.code === '23505' || String(error.code || '').startsWith('SQLITE_CONSTRAINT')) {
        const duplicate = await db('inventory_operations')
          .where({ business_id: businessId, idempotency_key: data.idempotency_key })
          .first();
        if (duplicate) {
          return this.resolveDuplicate(duplicate, requestHash);
        }
      }
      throw error;
    }
  }

  async resolveDuplicate(operation, requestHash) {
    if (operation.request_hash !== requestHash) {
      const error = new Error('La clave de idempotencia ya se utilizó con datos diferentes');
      error.statusCode = 409;
      throw error;
    }
    return {
      operation,
      movements: await db('kardex_movements').where({ operation_id: operation.id }).orderBy('id', 'asc'),
      duplicate: true
    };
  }

  async receiveTransfer(businessId, operationId, userId) {
    return db.transaction(async (trx) => {
      const operation = await trx('inventory_operations')
        .where({ id: operationId, business_id: businessId, movement_type: 'transfer' })
        .forUpdate()
        .first();

      if (!operation) {
        const error = new Error('Transferencia no encontrada');
        error.statusCode = 404;
        throw error;
      }

      if (operation.status === 'completed') {
        return {
          operation,
          movements: await trx('kardex_movements').where({ operation_id: operation.id }).orderBy('id', 'asc'),
          duplicate: true
        };
      }

      if (operation.status !== 'in_transit') {
        const error = new Error('La transferencia no se encuentra en tránsito');
        error.statusCode = 409;
        throw error;
      }

      const movement = await this.record(
        trx,
        operation,
        operation.destination_warehouse_id,
        'transfer_in',
        userId
      );
      await trx('inventory_operations')
        .where({ id: operation.id, status: 'in_transit' })
        .update({
          status: 'completed',
          received_by: userId,
          completed_at: new Date(),
          updated_at: new Date()
        });

      return {
        operation: await trx('inventory_operations').where({ id: operation.id }).first(),
        movements: [movement]
      };
    });
  }

  async list(businessId, filters) {
    const query = db('inventory_operations').where('business_id', businessId);
    if (filters.status) query.where('status', filters.status);
    if (filters.type) query.where('movement_type', filters.type);
    if (filters.product_id) query.where('product_id', filters.product_id);

    const countResult = await query.clone().count({ total: '*' }).first();
    const total = Number(countResult.total);
    const data = await query.clone()
      .select(
        'id',
        'business_id',
        'movement_type',
        'status',
        'source_warehouse_id',
        'destination_warehouse_id',
        'product_id',
        'lot_number',
        'qty',
        'unit_cost',
        'reference_doc',
        'return_direction',
        'disposition',
        'actor_id',
        'received_by',
        'completed_at',
        'created_at',
        'updated_at'
      )
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
}

module.exports = new InventoryMovements();
