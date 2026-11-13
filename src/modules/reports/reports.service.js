const db = require('../../config/database');

const DAY_MS = 24 * 60 * 60 * 1000;

const titles = {
  'inventory-valuation': 'Valuacion del inventario',
  'movement-history': 'Historial de movimientos',
  'supplier-receipts': 'Entradas por proveedor',
  'sales-dispatches': 'Ventas y despachos',
  'low-stock': 'Stock bajo y riesgo de quiebre',
  'product-margins': 'Productos y margenes',
  'category-performance': 'Desempeno por categoria',
  'top-selling': 'Productos con mayor rotacion',
  'slow-moving': 'Productos con menor rotacion',
  'product-catalog': 'Catalogo de productos'
};

const moneyColumns = new Set([
  'unit_cost',
  'average_cost',
  'cost_price',
  'inventory_value',
  'receipt_value',
  'estimated_revenue',
  'estimated_cost',
  'estimated_gross_profit',
  'gross_profit_per_unit',
  'gross_margin_percent'
]);

const columns = {
  'inventory-valuation': [
    ['product_id', 'Producto ID'],
    ['sku', 'SKU'],
    ['product_name', 'Producto'],
    ['warehouse_id', 'Almacen'],
    ['lot_number', 'Lote'],
    ['physical_qty', 'Existencia fisica'],
    ['reserved_qty', 'Reservado'],
    ['available_qty', 'Disponible'],
    ['average_cost', 'Costo promedio'],
    ['inventory_value', 'Valor inventario']
  ],
  'movement-history': [
    ['movement_id', 'Movimiento ID'],
    ['created_at', 'Fecha UTC'],
    ['movement_type', 'Tipo'],
    ['product_id', 'Producto ID'],
    ['sku', 'SKU'],
    ['product_name', 'Producto'],
    ['warehouse_id', 'Almacen'],
    ['lot_number', 'Lote'],
    ['qty', 'Cantidad'],
    ['initial_qty', 'Saldo inicial'],
    ['resulting_qty', 'Saldo resultante'],
    ['average_cost', 'Costo promedio'],
    ['reference_doc', 'Documento'],
    ['operation_status', 'Estado']
  ],
  'supplier-receipts': [
    ['supplier_id', 'Proveedor ID'],
    ['receipt_count', 'Entradas'],
    ['total_qty', 'Cantidad recibida'],
    ['receipt_value', 'Costo de entradas']
  ],
  'sales-dispatches': [
    ['product_id', 'Producto ID'],
    ['sku', 'SKU'],
    ['product_name', 'Producto'],
    ['category_name', 'Categoria'],
    ['warehouse_id', 'Almacen'],
    ['dispatch_count', 'Despachos'],
    ['quantity_sold', 'Cantidad despachada'],
    ['estimated_revenue', 'Venta estimada'],
    ['estimated_cost', 'Costo estimado'],
    ['estimated_gross_profit', 'Margen bruto estimado']
  ],
  'low-stock': [
    ['product_id', 'Producto ID'],
    ['sku', 'SKU'],
    ['product_name', 'Producto'],
    ['warehouse_id', 'Almacen'],
    ['lot_number', 'Lote'],
    ['physical_qty', 'Existencia fisica'],
    ['reserved_qty', 'Reservado'],
    ['available_qty', 'Disponible'],
    ['min_stock', 'Minimo'],
    ['average_daily_outflow', 'Salida diaria promedio (periodo)'],
    ['estimated_days_remaining', 'Dias estimados restantes'],
    ['risk_within_24h', 'Riesgo en 24 horas']
  ],
  'product-margins': [
    ['product_id', 'Producto ID'],
    ['sku', 'SKU'],
    ['product_name', 'Producto'],
    ['sale_price', 'Precio venta actual'],
    ['cost_price', 'Costo actual'],
    ['gross_profit_per_unit', 'Margen bruto unitario'],
    ['gross_margin_percent', 'Margen bruto (%)'],
    ['status', 'Estado']
  ],
  'category-performance': [
    ['category_id', 'Categoria ID'],
    ['category_name', 'Categoria'],
    ['product_count', 'Productos activos'],
    ['quantity_sold', 'Cantidad despachada'],
    ['estimated_revenue', 'Venta estimada'],
    ['estimated_cost', 'Costo estimado'],
    ['estimated_gross_profit', 'Margen bruto estimado']
  ],
  'top-selling': [
    ['product_id', 'Producto ID'],
    ['sku', 'SKU'],
    ['product_name', 'Producto'],
    ['quantity_sold', 'Cantidad despachada'],
    ['estimated_revenue', 'Venta estimada']
  ],
  'slow-moving': [
    ['product_id', 'Producto ID'],
    ['sku', 'SKU'],
    ['product_name', 'Producto'],
    ['warehouse_id', 'Almacen'],
    ['physical_qty', 'Existencia fisica'],
    ['last_dispatch_at', 'Ultimo despacho'],
    ['days_since_dispatch', 'Dias sin despacho']
  ],
  'product-catalog': [
    ['product_id', 'Producto ID'],
    ['sku', 'SKU'],
    ['product_name', 'Producto'],
    ['category_name', 'Categoria'],
    ['supplier_id', 'Proveedor ID'],
    ['unit', 'Unidad'],
    ['sale_price', 'Precio venta'],
    ['cost_price', 'Costo'],
    ['status', 'Estado'],
    ['created_at', 'Fecha alta']
  ]
};

class ReportsService {
  applyDateRange(query, column, filters) {
    if (filters.from) query.where(column, '>=', `${filters.from} 00:00:00`);
    if (filters.to) {
      const exclusiveEnd = new Date(`${filters.to}T00:00:00.000Z`);
      exclusiveEnd.setUTCDate(exclusiveEnd.getUTCDate() + 1);
      query.where(column, '<', exclusiveEnd.toISOString().slice(0, 10) + ' 00:00:00');
    }
    return query;
  }

  applyProductFilters(query, filters, productAlias = 'products') {
    if (filters.product_id) query.where(`${productAlias}.id`, filters.product_id);
    if (filters.category_id) query.where(`${productAlias}.category_id`, filters.category_id);
    if (filters.supplier_id) query.where(`${productAlias}.supplier_id`, filters.supplier_id);
    return query;
  }

  applyMovementFilters(query, businessId, filters) {
    query.where('kardex_movements.business_id', businessId);
    if (filters.warehouse_id) query.where('kardex_movements.warehouse_id', filters.warehouse_id);
    this.applyDateRange(query, 'kardex_movements.created_at', filters);
    return this.applyProductFilters(query, filters);
  }

  async paginate(query, filters, orderBy = 'products.id') {
    const countResult = await query.clone().count({ total: '*' }).first();
    const total = Number(countResult.total);
    const rows = await query.clone()
      .orderBy(orderBy, 'asc')
      .limit(filters.limit)
      .offset((filters.page - 1) * filters.limit);
    return {
      rows,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit)
      }
    };
  }

  paginateRows(rows, filters, sort) {
    const sorted = rows.sort(sort);
    const start = (filters.page - 1) * filters.limit;
    return {
      rows: sorted.slice(start, start + filters.limit),
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total: sorted.length,
        totalPages: Math.ceil(sorted.length / filters.limit)
      }
    };
  }

  async inventoryValuation(businessId, filters) {
    const query = this.applyProductFilters(
      db('warehouse_stock')
        .join('products', function () {
          this.on('products.id', '=', 'warehouse_stock.product_id')
            .andOn('products.business_id', '=', 'warehouse_stock.business_id');
        })
        .where('warehouse_stock.business_id', businessId),
      filters
    );
    if (filters.warehouse_id) query.where('warehouse_stock.warehouse_id', filters.warehouse_id);
    query.select(
      'products.id as product_id',
      'products.sku',
      'products.name as product_name',
      'warehouse_stock.warehouse_id',
      'warehouse_stock.lot_number',
      'warehouse_stock.physical_qty',
      'warehouse_stock.reserved_qty',
      'warehouse_stock.average_cost'
    );

    const result = await this.paginate(query, filters, 'products.id');
    result.rows = result.rows.map((row) => {
      const qty = Number(row.physical_qty || 0);
      const reserved = Number(row.reserved_qty || 0);
      const average = Number(row.average_cost || 0);
      return {
        ...row,
        physical_qty: qty,
        reserved_qty: reserved,
        available_qty: qty - reserved,
        average_cost: average,
        inventory_value: qty * average
      };
    });
    return result;
  }

  async movementHistory(businessId, filters) {
    const query = this.applyMovementFilters(
      db('kardex_movements')
        .join('products', function () {
          this.on('products.id', '=', 'kardex_movements.product_id')
            .andOn('products.business_id', '=', 'kardex_movements.business_id');
        })
        .leftJoin('inventory_operations', 'inventory_operations.id', 'kardex_movements.operation_id'),
      businessId,
      filters
    );
    query.select(
      'kardex_movements.id as movement_id',
      'kardex_movements.created_at',
      'kardex_movements.movement_type',
      'products.id as product_id',
      'products.sku',
      'products.name as product_name',
      'kardex_movements.warehouse_id',
      'kardex_movements.lot_number',
      'kardex_movements.qty',
      'kardex_movements.initial_qty',
      'kardex_movements.resulting_qty',
      'kardex_movements.unit_cost',
      'kardex_movements.average_cost',
      'kardex_movements.reference_doc',
      'inventory_operations.status as operation_status'
    );
    const countResult = await query.clone().count({ total: '*' }).first();
    const total = Number(countResult.total);
    const rows = await query.clone()
      .orderBy('kardex_movements.id', 'desc')
      .limit(filters.limit)
      .offset((filters.page - 1) * filters.limit);
    return {
      rows,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit)
      }
    };
  }

  async supplierReceipts(businessId, filters) {
    const query = this.applyProductFilters(
      db('inventory_operations')
        .join('products', function () {
          this.on('products.id', '=', 'inventory_operations.product_id')
            .andOn('products.business_id', '=', 'inventory_operations.business_id');
        })
        .where({
          'inventory_operations.business_id': businessId,
          'inventory_operations.movement_type': 'receive',
          'inventory_operations.status': 'completed'
        }),
      filters
    );
    if (filters.warehouse_id) query.where('inventory_operations.source_warehouse_id', filters.warehouse_id);
    this.applyDateRange(query, 'inventory_operations.completed_at', filters);
    query.select(
      'products.supplier_id',
      db.raw('COUNT(inventory_operations.id) as receipt_count'),
      db.raw('SUM(inventory_operations.qty) as total_qty'),
      db.raw('SUM(inventory_operations.qty * inventory_operations.unit_cost) as receipt_value')
    ).groupBy('products.supplier_id');

    const rows = (await query).map((row) => ({
      ...row,
      receipt_count: Number(row.receipt_count || 0),
      total_qty: Number(row.total_qty || 0),
      receipt_value: Number(row.receipt_value || 0)
    }));
    return this.paginateRows(rows, filters, (left, right) =>
      Number(left.supplier_id || 0) - Number(right.supplier_id || 0)
    );
  }

  async salesQuery(businessId, filters) {
    const query = this.applyMovementFilters(
      db('kardex_movements')
        .join('products', function () {
          this.on('products.id', '=', 'kardex_movements.product_id')
            .andOn('products.business_id', '=', 'kardex_movements.business_id');
        })
        .leftJoin('categories', function () {
          this.on('categories.id', '=', 'products.category_id')
            .andOn('categories.business_id', '=', 'products.business_id');
        })
        .where('kardex_movements.movement_type', 'issue'),
      businessId,
      filters
    );
    return query;
  }

  async salesDispatches(businessId, filters) {
    const query = this.salesQuery(businessId, filters);
    query.select(
      'products.id as product_id',
      'products.sku',
      'products.name as product_name',
      'categories.name as category_name',
      'kardex_movements.warehouse_id',
      db.raw('COUNT(kardex_movements.id) as dispatch_count'),
      db.raw('SUM(kardex_movements.qty) as quantity_sold'),
      db.raw('SUM(kardex_movements.qty * products.sale_price) as estimated_revenue'),
      db.raw('SUM(kardex_movements.qty * kardex_movements.average_cost) as estimated_cost')
    ).groupBy(
      'products.id',
      'products.sku',
      'products.name',
      'categories.name',
      'kardex_movements.warehouse_id'
    );
    const rows = (await query).map((row) => {
      const revenue = Number(row.estimated_revenue || 0);
      const cost = Number(row.estimated_cost || 0);
      return {
        ...row,
        dispatch_count: Number(row.dispatch_count || 0),
        quantity_sold: Number(row.quantity_sold || 0),
        estimated_revenue: revenue,
        estimated_cost: cost,
        estimated_gross_profit: revenue - cost
      };
    });
    return this.paginateRows(rows, filters, (left, right) =>
      Number(left.product_id) - Number(right.product_id) ||
      Number(left.warehouse_id) - Number(right.warehouse_id)
    );
  }

  async lowStock(businessId, filters) {
    const query = this.applyProductFilters(
      db('warehouse_stock')
        .join('products', function () {
          this.on('products.id', '=', 'warehouse_stock.product_id')
            .andOn('products.business_id', '=', 'warehouse_stock.business_id');
        })
        .where('warehouse_stock.business_id', businessId)
        .whereRaw('?? - ?? <= ??', [
          'warehouse_stock.physical_qty',
          'warehouse_stock.reserved_qty',
          'warehouse_stock.min_stock'
        ]),
      filters
    );
    if (filters.warehouse_id) query.where('warehouse_stock.warehouse_id', filters.warehouse_id);
    query.select(
      'products.id as product_id',
      'products.sku',
      'products.name as product_name',
      'warehouse_stock.warehouse_id',
      'warehouse_stock.lot_number',
      'warehouse_stock.physical_qty',
      'warehouse_stock.reserved_qty',
      'warehouse_stock.min_stock'
    );

    const result = await this.paginate(query, filters, 'products.id');
    const rows = result.rows;
    const productIds = rows.map((row) => row.product_id);
    let dailyOutflowByProduct = {};
    if (productIds.length) {
      const since = new Date(Date.now() - filters.threshold_days * DAY_MS).toISOString();
      const outflows = await db('kardex_movements')
        .where({
          business_id: businessId,
          movement_type: 'issue'
        })
        .whereIn('product_id', productIds)
        .where('created_at', '>=', since)
        .modify((builder) => {
          if (filters.warehouse_id) builder.where('warehouse_id', filters.warehouse_id);
        })
        .select('product_id', 'lot_number')
        .sum({ total: 'qty' })
        .groupBy('product_id', 'lot_number');
      dailyOutflowByProduct = Object.fromEntries(
        outflows.map((row) => [
          `${row.product_id}:${row.lot_number || ''}`,
          Number(row.total || 0) / filters.threshold_days
        ])
      );
    }

    result.rows = rows.map((row) => {
      const physical = Number(row.physical_qty || 0);
      const available = physical - Number(row.reserved_qty || 0);
      const averageDailyOutflow = dailyOutflowByProduct[
        `${row.product_id}:${row.lot_number || ''}`
      ] || 0;
      const daysRemaining = available <= 0
        ? 0
        : averageDailyOutflow > 0
          ? available / averageDailyOutflow
          : null;
      return {
        ...row,
        physical_qty: physical,
        reserved_qty: Number(row.reserved_qty || 0),
        available_qty: available,
        min_stock: Number(row.min_stock || 0),
        average_daily_outflow: averageDailyOutflow,
        estimated_days_remaining: daysRemaining,
        risk_within_24h: daysRemaining !== null && daysRemaining <= 1
      };
    });
    return result;
  }

  async productMargins(businessId, filters) {
    const query = this.applyProductFilters(
      db('products').where({ business_id: businessId }).where('status', 'active'),
      filters
    );
    query.select(
      'products.id as product_id',
      'products.sku',
      'products.name as product_name',
      'products.sale_price',
      'products.cost_price',
      'products.status'
    );
    const result = await this.paginate(query, filters);
    result.rows = result.rows.map((row) => {
      const salePrice = Number(row.sale_price || 0);
      const costPrice = Number(row.cost_price || 0);
      const grossProfit = salePrice - costPrice;
      return {
        ...row,
        sale_price: salePrice,
        cost_price: costPrice,
        gross_profit_per_unit: grossProfit,
        gross_margin_percent: salePrice > 0 ? (grossProfit / salePrice) * 100 : null
      };
    });
    return result;
  }

  async categoryPerformance(businessId, filters) {
    const sales = this.salesQuery(businessId, filters);
    sales.select(
      'products.category_id',
      'categories.name as category_name',
      db.raw('COUNT(DISTINCT products.id) as product_count'),
      db.raw('SUM(kardex_movements.qty) as quantity_sold'),
      db.raw('SUM(kardex_movements.qty * products.sale_price) as estimated_revenue'),
      db.raw('SUM(kardex_movements.qty * kardex_movements.average_cost) as estimated_cost')
    ).groupBy('products.category_id', 'categories.name');

    const rows = await sales;
    const products = this.applyProductFilters(
      db('products')
        .leftJoin('categories', function () {
          this.on('categories.id', '=', 'products.category_id')
            .andOn('categories.business_id', '=', 'products.business_id');
        })
        .where({ 'products.business_id': businessId, 'products.status': 'active' }),
      filters
    );
    const productCounts = await products
      .select('products.category_id', db.raw('COUNT(products.id) as product_count'))
      .groupBy('products.category_id');
    const productCountByCategory = Object.fromEntries(
      productCounts.map((row) => [row.category_id || 'uncategorized', Number(row.product_count || 0)])
    );
    const byCategory = new Map(rows.map((row) => [String(row.category_id || 'uncategorized'), row]));
    for (const [categoryKey, count] of Object.entries(productCountByCategory)) {
      const row = byCategory.get(String(categoryKey));
      if (row) row.product_count = count;
      else {
        byCategory.set(String(categoryKey), {
          category_id: categoryKey === 'uncategorized' ? null : Number(categoryKey),
          category_name: categoryKey === 'uncategorized' ? 'Sin categoria' : null,
          product_count: count,
          quantity_sold: 0,
          estimated_revenue: 0,
          estimated_cost: 0
        });
      }
    }
    const allRows = Array.from(byCategory.values()).map((row) => {
      const revenue = Number(row.estimated_revenue || 0);
      const cost = Number(row.estimated_cost || 0);
      return {
        ...row,
        product_count: Number(row.product_count || 0),
        quantity_sold: Number(row.quantity_sold || 0),
        estimated_revenue: revenue,
        estimated_cost: cost,
        estimated_gross_profit: revenue - cost
      };
    }).map((row) => ({
      ...row,
      category_name: row.category_name || 'Sin categoria'
    })).sort((left, right) => left.category_name.localeCompare(right.category_name));
    const start = (filters.page - 1) * filters.limit;
    return {
      rows: allRows.slice(start, start + filters.limit),
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total: allRows.length,
        totalPages: Math.ceil(allRows.length / filters.limit)
      }
    };
  }

  async topSelling(businessId, filters) {
    const query = this.salesQuery(businessId, filters);
    query.select(
      'products.id as product_id',
      'products.sku',
      'products.name as product_name',
      db.raw('SUM(kardex_movements.qty) as quantity_sold'),
      db.raw('SUM(kardex_movements.qty * products.sale_price) as estimated_revenue')
    ).groupBy('products.id', 'products.sku', 'products.name');
    const countRows = await query.clone().clearSelect().clearOrder().clearGroup()
      .countDistinct({ total: 'products.id' }).first();
    const total = Number(countRows.total || 0);
    const rows = await query.clone()
      .orderBy('quantity_sold', 'desc')
      .limit(filters.limit)
      .offset((filters.page - 1) * filters.limit);
    return {
      rows: rows.map((row) => ({
        ...row,
        quantity_sold: Number(row.quantity_sold || 0),
        estimated_revenue: Number(row.estimated_revenue || 0)
      })),
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit)
      }
    };
  }

  async slowMoving(businessId, filters) {
    const lastIssueQuery = db('kardex_movements')
      .where({ business_id: businessId, movement_type: 'issue' })
      .groupBy('product_id')
      .select('product_id')
      .max({ last_dispatch_at: 'created_at' });
    if (filters.warehouse_id) lastIssueQuery.where('warehouse_id', filters.warehouse_id);
    this.applyDateRange(lastIssueQuery, 'created_at', filters);

    const query = this.applyProductFilters(
      db('warehouse_stock')
        .join('products', function () {
          this.on('products.id', '=', 'warehouse_stock.product_id')
            .andOn('products.business_id', '=', 'warehouse_stock.business_id');
        })
        .leftJoin(lastIssueQuery.as('last_issue'), 'last_issue.product_id', 'products.id')
        .where('warehouse_stock.business_id', businessId)
        .where('warehouse_stock.physical_qty', '>', 0)
        .where('products.status', 'active'),
      filters
    );
    if (filters.warehouse_id) query.where('warehouse_stock.warehouse_id', filters.warehouse_id);
    query.select(
      'products.id as product_id',
      'products.sku',
      'products.name as product_name',
      'warehouse_stock.warehouse_id',
      'warehouse_stock.physical_qty',
      'last_issue.last_dispatch_at'
    );
    const countResult = await query.clone().count({ total: '*' }).first();
    const total = Number(countResult.total);
    const rows = await query.clone()
      .orderByRaw('CASE WHEN last_issue.last_dispatch_at IS NULL THEN 0 ELSE 1 END ASC')
      .orderBy('last_issue.last_dispatch_at', 'asc')
      .limit(filters.limit)
      .offset((filters.page - 1) * filters.limit);
    const now = Date.now();
    return {
      rows: rows.map((row) => {
        const lastDispatch = row.last_dispatch_at ? new Date(row.last_dispatch_at).getTime() : null;
        const days = lastDispatch === null ? null : Math.max(0, Math.floor((now - lastDispatch) / DAY_MS));
        return {
          ...row,
          physical_qty: Number(row.physical_qty || 0),
          days_since_dispatch: days
        };
      }),
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit)
      }
    };
  }

  async productCatalog(businessId, filters) {
    const query = this.applyProductFilters(
      db('products')
        .leftJoin('categories', function () {
          this.on('categories.id', '=', 'products.category_id')
            .andOn('categories.business_id', '=', 'products.business_id');
        })
        .where('products.business_id', businessId),
      filters
    );
    query.select(
      'products.id as product_id',
      'products.sku',
      'products.name as product_name',
      'categories.name as category_name',
      'products.supplier_id',
      'products.unit',
      'products.sale_price',
      'products.cost_price',
      'products.status',
      'products.created_at'
    );
    const result = await this.paginate(query, filters);
    result.rows = result.rows.map((row) => ({
      ...row,
      sale_price: Number(row.sale_price || 0),
      cost_price: Number(row.cost_price || 0)
    }));
    return result;
  }

  async getReport(businessId, reportName, filters, canReadCosts) {
    const handlers = {
      'inventory-valuation': this.inventoryValuation,
      'movement-history': this.movementHistory,
      'supplier-receipts': this.supplierReceipts,
      'sales-dispatches': this.salesDispatches,
      'low-stock': this.lowStock,
      'product-margins': this.productMargins,
      'category-performance': this.categoryPerformance,
      'top-selling': this.topSelling,
      'slow-moving': this.slowMoving,
      'product-catalog': this.productCatalog
    };
    const handler = handlers[reportName];
    if (!handler) {
      const error = new Error('Reporte no encontrado');
      error.statusCode = 404;
      throw error;
    }

    const result = await handler.call(this, businessId, filters);
    const reportColumns = columns[reportName].filter((column) =>
      canReadCosts || !moneyColumns.has(column[0])
    );
    const rows = result.rows.map((row) => {
      const copy = { ...row };
      if (!canReadCosts) {
        for (const key of moneyColumns) delete copy[key];
      }
      return copy;
    });

    return {
      name: reportName,
      title: titles[reportName],
      generatedAt: new Date().toISOString(),
      filters,
      columns: reportColumns.map(([key, label]) => ({ key, label })),
      rows,
      pagination: result.pagination
    };
  }

  async recordExport(businessId, userId, reportName, format, filters, rowCount) {
    await db('report_export_audit').insert({
      business_id: businessId,
      user_id: userId,
      report_name: reportName,
      format,
      filters_json: JSON.stringify(filters),
      row_count: rowCount,
      created_at: new Date()
    });
  }

  async listExportAudit(businessId, filters) {
    const query = db('report_export_audit').where('business_id', businessId);
    if (filters.report_name) query.where('report_name', filters.report_name);
    if (filters.format) query.where('format', filters.format);
    if (filters.user_id) query.where('user_id', filters.user_id);
    const countResult = await query.clone().count({ total: '*' }).first();
    const total = Number(countResult.total);
    const rows = await query.clone()
      .select('id', 'user_id', 'report_name', 'format', 'filters_json', 'row_count', 'created_at')
      .orderBy('created_at', 'desc')
      .limit(filters.limit)
      .offset((filters.page - 1) * filters.limit);
    return {
      data: rows.map((row) => {
        let reportFilters;
        try {
          reportFilters = JSON.parse(row.filters_json);
        } catch (error) {
          throw new Error(`Filtros de auditoria invalidos en el registro ${row.id}: ${error.message}`);
        }
        return { ...row, filters: reportFilters, filters_json: undefined };
      }),
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit)
      }
    };
  }
}

module.exports = new ReportsService();
