/**
 * Migración 01: Negocio base, sucursales, almacenes y configuración
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // 1. Tabla businesses (Multi-negocio desde el inicio)
  await knex.schema.createTable('businesses', (table) => {
    table.string('id', 36).primary();
    table.string('name', 150).notNullable();
    table.string('legal_name', 200).nullable();
    table.string('tax_id', 50).nullable(); // RFC / NIT
    table.string('phone', 50).nullable();
    table.string('email', 150).nullable();
    table.text('address').nullable();
    table.text('logo_url').nullable();
    table.text('approval_limits_json').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // 2. Tabla branches (Sucursales vinculadas al negocio)
  await knex.schema.createTable('branches', (table) => {
    table.string('id', 36).primary();
    table
      .string('business_id', 36)
      .notNullable()
      .references('id')
      .inTable('businesses')
      .onDelete('CASCADE');
    table.string('code', 50).notNullable();
    table.string('name', 150).notNullable();
    table.text('address').nullable();
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.unique(['business_id', 'code']);
    table.index(['business_id']);
  });

  // 3. Tabla warehouses (Almacenes/Bodegas físicos vinculados a sucursal y negocio)
  await knex.schema.createTable('warehouses', (table) => {
    table.string('id', 36).primary();
    table
      .string('business_id', 36)
      .notNullable()
      .references('id')
      .inTable('businesses')
      .onDelete('CASCADE');
    table
      .string('branch_id', 36)
      .notNullable()
      .references('id')
      .inTable('branches')
      .onDelete('CASCADE');
    table.string('code', 50).notNullable();
    table.string('name', 150).notNullable();
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.unique(['business_id', 'code']);
    table.index(['business_id', 'branch_id']);
  });

  // 4. Tabla company_settings (Configuración general, temas CSS, regional, SMTP)
  await knex.schema.createTable('company_settings', (table) => {
    table.string('id', 36).primary();
    table
      .string('business_id', 36)
      .notNullable()
      .unique()
      .references('id')
      .inTable('businesses')
      .onDelete('CASCADE');
    table.text('theme_tokens_json').nullable(); // Variables CSS (--color-primary, etc.)
    table.text('regional_settings_json').nullable(); // Moneda, formato fecha, idioma
    table.text('notification_settings_json').nullable(); // Umbrales de stock bajo, alertas
    table.text('smtp_settings_json').nullable(); // Configuración de servidor de correo
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('company_settings');
  await knex.schema.dropTableIfExists('warehouses');
  await knex.schema.dropTableIfExists('branches');
  await knex.schema.dropTableIfExists('businesses');
};
