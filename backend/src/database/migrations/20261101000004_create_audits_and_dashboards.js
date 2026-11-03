/**
 * Migración 04: Bitácora de auditoría y gestión de Dashboards / Widgets Modulares
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // 1. Tabla audit_logs (Trazabilidad de acciones críticas: actor, acción, IP, antes/después)
  await knex.schema.createTable('audit_logs', (table) => {
    table.string('id', 36).primary();
    table.string('business_id', 36).notNullable();
    table.string('user_id', 36).nullable();
    table.string('action', 100).notNullable(); // ej. 'user.create', 'role.update', 'user.disable'
    table.string('entity_type', 50).notNullable(); // 'user', 'role', 'settings', 'dashboard'
    table.string('entity_id', 50).nullable();
    table.text('old_values_json').nullable(); // Sin secretos ni contraseñas
    table.text('new_values_json').nullable();
    table.string('ip_address', 45).nullable();
    table.text('user_agent').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index(['business_id', 'created_at']);
    table.index(['user_id']);
  });

  // 2. Tabla dashboards (Lienzos personalizables por usuario o compartidos)
  await knex.schema.createTable('dashboards', (table) => {
    table.string('id', 36).primary();
    table
      .string('business_id', 36)
      .notNullable()
      .references('id')
      .inTable('businesses')
      .onDelete('CASCADE');
    table.string('user_id', 36).nullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('name', 150).notNullable();
    table.boolean('is_default').defaultTo(false);
    table.boolean('is_shared').defaultTo(false);
    table.string('shared_scope', 50).defaultTo('private'); // 'private', 'business', 'role'
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.index(['business_id', 'user_id']);
  });

  // 3. Tabla dashboard_widgets (Posicionamiento en el Grid Dinámico de 16 slots de OmniStock Pulse)
  await knex.schema.createTable('dashboard_widgets', (table) => {
    table.string('id', 36).primary();
    table
      .string('dashboard_id', 36)
      .notNullable()
      .references('id')
      .inTable('dashboards')
      .onDelete('CASCADE');
    table.string('widget_type', 80).notNullable(); // ej. 'kpi_stock_summary', 'low_stock_alert'
    table.string('title', 150).notNullable();
    table.text('config_json').nullable(); // Filtros, rangos y parámetros
    table.integer('pos_x').notNullable().defaultTo(0);
    table.integer('pos_y').notNullable().defaultTo(0);
    table.integer('width').notNullable().defaultTo(2); // 1, 2, 4 columnas
    table.integer('height').notNullable().defaultTo(2); // 1 o 2 filas
    table.integer('sort_order').notNullable().defaultTo(0);
    table.boolean('is_favorite').defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.index(['dashboard_id']);
  });

  // 4. Tabla user_favorite_widgets (Widgets favoritos del usuario)
  await knex.schema.createTable('user_favorite_widgets', (table) => {
    table.string('id', 36).primary();
    table.string('user_id', 36).notNullable().references('id').inTable('users').onDelete('CASCADE');
    table
      .string('widget_id', 36)
      .notNullable()
      .references('id')
      .inTable('dashboard_widgets')
      .onDelete('CASCADE');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.unique(['user_id', 'widget_id']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('user_favorite_widgets');
  await knex.schema.dropTableIfExists('dashboard_widgets');
  await knex.schema.dropTableIfExists('dashboards');
  await knex.schema.dropTableIfExists('audit_logs');
};
