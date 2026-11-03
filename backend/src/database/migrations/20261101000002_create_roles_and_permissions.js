/**
 * Migración 02: Roles y Permisos (Jerarquía R0 a R7 y 30 permisos atómicos)
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // 1. Tabla permissions (Catálogo global de permisos atómicos: modulo.accion)
  await knex.schema.createTable('permissions', (table) => {
    table.string('id', 36).primary();
    table.string('code', 80).notNullable().unique();
    table.string('module', 50).notNullable();
    table.string('description', 255).notNullable();
    table.boolean('is_critical').defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index(['module']);
  });

  // 2. Tabla roles (Roles predeterminados y personalizables por negocio)
  await knex.schema.createTable('roles', (table) => {
    table.string('id', 36).primary();
    table
      .string('business_id', 36)
      .notNullable()
      .references('id')
      .inTable('businesses')
      .onDelete('CASCADE');
    table.string('code', 50).notNullable(); // Identificador interno inmutable: owner, system_admin, etc.
    table.string('name', 100).notNullable(); // Nombre visible editable por el dueño
    table.text('description').nullable();
    table.boolean('is_default').defaultTo(false); // Rol del sistema (R0 a R7)
    table.boolean('is_protected').defaultTo(false); // Rol inmutable/protegido (R0 Propietario)
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.unique(['business_id', 'code']);
    table.index(['business_id']);
  });

  // 3. Tabla role_permissions (Pivote de permisos con reglas de aprobación y límites)
  await knex.schema.createTable('role_permissions', (table) => {
    table.string('id', 36).primary();
    table.string('role_id', 36).notNullable().references('id').inTable('roles').onDelete('CASCADE');
    table
      .string('permission_id', 36)
      .notNullable()
      .references('id')
      .inTable('permissions')
      .onDelete('CASCADE');
    table.decimal('approval_limit_amount', 12, 2).nullable(); // Límite monetario para compras/ajustes
    table.integer('approval_limit_qty').nullable(); // Límite de unidades físicas
    table.boolean('requires_second_approver').defaultTo(false); // Regla de doble control / 4 ojos
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.unique(['role_id', 'permission_id']);
    table.index(['role_id']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('role_permissions');
  await knex.schema.dropTableIfExists('roles');
  await knex.schema.dropTableIfExists('permissions');
};
