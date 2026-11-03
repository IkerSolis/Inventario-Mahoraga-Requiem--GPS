/**
 * Migración 03: Usuarios, asignaciones, scopes, sesiones y seguridad de contraseñas
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // 1. Tabla users (Entidad de usuario protegida multi-negocio)
  await knex.schema.createTable('users', (table) => {
    table.string('id', 36).primary();
    table
      .string('business_id', 36)
      .notNullable()
      .references('id')
      .inTable('businesses')
      .onDelete('CASCADE');
    table.string('name', 150).notNullable();
    table.string('email', 150).notNullable();
    table.string('password_hash', 255).notNullable();
    table.string('status', 20).notNullable().defaultTo('active'); // active, pending, disabled
    table.text('avatar_url').nullable();
    table.boolean('is_owner').defaultTo(false); // Bandera protegida para R0
    table.integer('failed_login_attempts').defaultTo(0);
    table.timestamp('locked_until').nullable();
    table.timestamp('last_login_at').nullable();
    table.string('created_by', 36).nullable();
    table.string('updated_by', 36).nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable(); // Soft delete para integridad de Kardex/Auditoría

    table.unique(['business_id', 'email']);
    table.index(['business_id', 'status']);
  });

  // 2. Tabla user_roles (Un usuario puede tener múltiples roles)
  await knex.schema.createTable('user_roles', (table) => {
    table.string('id', 36).primary();
    table.string('user_id', 36).notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('role_id', 36).notNullable().references('id').inTable('roles').onDelete('CASCADE');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.unique(['user_id', 'role_id']);
    table.index(['user_id']);
  });

  // 3. Tabla user_scopes (Alcance horizontal limitado a nivel sucursal y almacén)
  await knex.schema.createTable('user_scopes', (table) => {
    table.string('id', 36).primary();
    table.string('user_id', 36).notNullable().references('id').inTable('users').onDelete('CASCADE');
    table
      .string('branch_id', 36)
      .nullable()
      .references('id')
      .inTable('branches')
      .onDelete('CASCADE');
    table
      .string('warehouse_id', 36)
      .nullable()
      .references('id')
      .inTable('warehouses')
      .onDelete('CASCADE');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index(['user_id']);
  });

  // 4. Tabla user_sessions (Telemetría de sesiones y Refresh Tokens con rotación)
  await knex.schema.createTable('user_sessions', (table) => {
    table.string('id', 36).primary();
    table.string('user_id', 36).notNullable().references('id').inTable('users').onDelete('CASCADE');
    table
      .string('business_id', 36)
      .notNullable()
      .references('id')
      .inTable('businesses')
      .onDelete('CASCADE');
    table.string('refresh_token_hash', 255).notNullable();
    table.string('ip_address', 45).nullable();
    table.text('user_agent').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('last_accessed_at').defaultTo(knex.fn.now());
    table.timestamp('expires_at').notNullable();
    table.timestamp('revoked_at').nullable(); // Si se desactiva el usuario o hace logout

    table.index(['user_id', 'revoked_at']);
    table.index(['refresh_token_hash']);
  });

  // 5. Tabla password_history (Historial para impedir reutilizar las últimas N contraseñas)
  await knex.schema.createTable('password_history', (table) => {
    table.string('id', 36).primary();
    table.string('user_id', 36).notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('password_hash', 255).notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index(['user_id']);
  });

  // 6. Tabla password_reset_tokens (Tokens de recuperación de un solo uso)
  await knex.schema.createTable('password_reset_tokens', (table) => {
    table.string('id', 36).primary();
    table.string('user_id', 36).notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('token_hash', 255).notNullable();
    table.timestamp('expires_at').notNullable();
    table.timestamp('used_at').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index(['token_hash']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('password_reset_tokens');
  await knex.schema.dropTableIfExists('password_history');
  await knex.schema.dropTableIfExists('user_sessions');
  await knex.schema.dropTableIfExists('user_scopes');
  await knex.schema.dropTableIfExists('user_roles');
  await knex.schema.dropTableIfExists('users');
};
