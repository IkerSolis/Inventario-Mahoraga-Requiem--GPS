exports.up = async function (knex) {
  await knex.schema.createTable('report_export_audit', (table) => {
    table.increments('id').primary();
    table.string('business_id', 36).notNullable().index();
    table.string('user_id', 36).notNullable().index();
    table.string('report_name', 50).notNullable().index();
    table.string('format', 10).notNullable();
    table.text('filters_json').notNullable();
    table.integer('row_count').notNullable().defaultTo(0);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now()).index();
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('report_export_audit');
};
