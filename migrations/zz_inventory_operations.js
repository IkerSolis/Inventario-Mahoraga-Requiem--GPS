exports.up = async function (knex) {
  await knex.schema.createTable('inventory_operations', (table) => {
    table.increments('id').primary();
    table.integer('business_id').notNullable().index();
    table.string('movement_type', 30).notNullable().index();
    table.string('status', 30).notNullable().index();
    table.integer('source_warehouse_id').notNullable();
    table.integer('destination_warehouse_id').nullable();
    table.integer('product_id').notNullable().index();
    table.string('lot_number', 100).notNullable().defaultTo('');
    table.decimal('qty', 12, 2).notNullable();
    table.decimal('unit_cost', 12, 2).notNullable().defaultTo(0);
    table.string('reference_doc', 150).nullable();
    table.string('return_direction', 20).nullable();
    table.string('disposition', 20).nullable();
    table.string('idempotency_key', 128).notNullable();
    table.string('request_hash', 64).notNullable();
    table.integer('actor_id').notNullable();
    table.integer('received_by').nullable();
    table.timestamp('completed_at').nullable();
    table.timestamps(true, true);
    table.unique(['business_id', 'idempotency_key']);
  });

  await knex.schema.alterTable('warehouse_stock', (table) => {
    table.decimal('quarantine_qty', 12, 2).notNullable().defaultTo(0);
    table.decimal('average_cost', 12, 2).notNullable().defaultTo(0);
  });

  await knex.schema.alterTable('kardex_movements', (table) => {
    table.string('lot_number', 100).nullable();
    table.integer('operation_id').nullable().index();
  });

  await knex.schema.alterTable('stock_count_items', (table) => {
    table.string('lot_number', 100).nullable();
  });

  await knex.schema.alterTable('stock_adjustments', (table) => {
    table.string('lot_number', 100).nullable();
  });

};

exports.down = async function (knex) {
  await knex.schema.alterTable('stock_adjustments', (table) => {
    table.dropColumn('lot_number');
  });
  await knex.schema.alterTable('stock_count_items', (table) => {
    table.dropColumn('lot_number');
  });
  await knex.schema.alterTable('kardex_movements', (table) => {
    table.dropIndex(['operation_id']);
    table.dropColumn('operation_id');
    table.dropColumn('lot_number');
  });
  await knex.schema.alterTable('warehouse_stock', (table) => {
    table.dropColumn('average_cost');
    table.dropColumn('quarantine_qty');
  });
  await knex.schema.dropTableIfExists('inventory_operations');
};
