// Migracion para tablas del modulo de inventario y Kardex
// Tabla warehouse_stock para existencias por almacen
// Tabla kardex_movements para auditoria de movimientos contables y fisicos
// Tablas stock_counts y stock_adjustments para conteos ciclicos y ajustes

exports.up = async function (knex) {
  // Tabla warehouse_stock
  await knex.schema.createTable('warehouse_stock', (table) => {
    table.increments('id').primary();
    table.integer('business_id').notNullable().index();
    table.integer('branch_id').notNullable().defaultTo(1).index();
    table.integer('warehouse_id').notNullable().defaultTo(1).index();
    table.integer('product_id').notNullable().index();
    table.string('lot_number', 100).nullable();

    table.decimal('physical_qty', 12, 2).notNullable().defaultTo(0.00);
    table.decimal('reserved_qty', 12, 2).notNullable().defaultTo(0.00);
    table.decimal('min_stock', 12, 2).notNullable().defaultTo(0.00);
    table.decimal('max_stock', 12, 2).notNullable().defaultTo(0.00);

    table.string('aisle', 50).nullable();
    table.string('rack', 50).nullable();
    table.string('bin_location', 50).nullable();

    table.timestamps(true, true);
    table.unique(['business_id', 'warehouse_id', 'product_id', 'lot_number']);
  });

  // Tabla kardex_movements
  await knex.schema.createTable('kardex_movements', (table) => {
    table.increments('id').primary();
    table.integer('business_id').notNullable().index();
    table.integer('warehouse_id').notNullable().defaultTo(1).index();
    table.integer('product_id').notNullable().index();

    table.string('movement_type', 50).notNullable();
    table.decimal('qty', 12, 2).notNullable();
    table.decimal('initial_qty', 12, 2).notNullable();
    table.decimal('resulting_qty', 12, 2).notNullable();

    table.decimal('unit_cost', 12, 2).notNullable().defaultTo(0.00);
    table.decimal('average_cost', 12, 2).notNullable().defaultTo(0.00);

    table.string('reference_doc', 150).nullable();
    table.integer('user_id').notNullable().defaultTo(1);

    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // Tabla stock_counts para conteos fisicos y ciclicos
  await knex.schema.createTable('stock_counts', (table) => {
    table.increments('id').primary();
    table.integer('business_id').notNullable().index();
    table.integer('warehouse_id').notNullable().defaultTo(1);
    table.string('status', 30).notNullable().defaultTo('in_progress');
    table.text('notes').nullable();
    table.integer('created_by').notNullable().defaultTo(1);
    table.timestamps(true, true);
  });

  // Tabla stock_count_items con detalle de cantidades contadas
  await knex.schema.createTable('stock_count_items', (table) => {
    table.increments('id').primary();
    table.integer('stock_count_id').notNullable().references('id').inTable('stock_counts').onDelete('CASCADE');
    table.integer('product_id').notNullable();
    table.decimal('system_qty', 12, 2).notNullable().defaultTo(0.00);
    table.decimal('counted_qty', 12, 2).notNullable().defaultTo(0.00);
    table.decimal('difference_qty', 12, 2).notNullable().defaultTo(0.00);
    table.timestamps(true, true);
  });

  // Tabla stock_adjustments para solicitudes y aprobaciones de doble control
  await knex.schema.createTable('stock_adjustments', (table) => {
    table.increments('id').primary();
    table.integer('business_id').notNullable().index();
    table.integer('warehouse_id').notNullable().defaultTo(1);
    table.integer('product_id').notNullable().index();
    table.string('adjustment_type', 20).notNullable();
    table.decimal('qty', 12, 2).notNullable();
    table.text('reason').notNullable();
    table.string('evidence_url', 500).nullable();
    table.string('status', 30).notNullable().defaultTo('pending');
    table.integer('requested_by').notNullable();
    table.integer('approved_by').nullable();
    table.timestamps(true, true);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('stock_adjustments');
  await knex.schema.dropTableIfExists('stock_count_items');
  await knex.schema.dropTableIfExists('stock_counts');
  await knex.schema.dropTableIfExists('kardex_movements');
  await knex.schema.dropTableIfExists('warehouse_stock');
};

