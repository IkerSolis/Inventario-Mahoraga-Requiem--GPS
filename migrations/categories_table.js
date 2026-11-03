/**
 * Migración para crear la tabla 'categories' compatible con SQLite y PostgreSQL.
 * Soporta jerarquías multinivel con autorreferencia 'parent_id' y aislamiento multi-negocio.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.schema.createTable('categories', (table) => {
    table.increments('id').primary();

    // cada categoría pertenece a un negocio específico
    table.integer('business_id').notNullable().index();

    // Autorreferencia para subcategorías jerárquicas (nullable si es categoría raíz)
    table.integer('parent_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('categories')
      .onDelete('RESTRICT'); // Evita borrar padres si tienen hijos

    table.string('name', 150).notNullable();
    table.string('slug', 180).notNullable();
    table.text('description').nullable();

    table.string('icon_name', 100).nullable().defaultTo('category');

    // Color hexadecimal
    table.string('color_hex', 20).nullable().defaultTo('#4F46E5');

    // Estado de la categoría: active o inactive
    table.string('status', 20).notNullable().defaultTo('active').index();

    // Fechas de auditoria
    table.timestamps(true, true);

    // Unicidad de slug por empresa para evitar colisiones
    table.unique(['business_id', 'slug'], { indexName: 'idx_categories_business_slug' });
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('categories');
};

