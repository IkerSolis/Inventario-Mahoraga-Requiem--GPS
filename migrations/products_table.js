/**
 * Migración para crear la tabla 'products' compatible con SQLite y PostgreSQL.
 * 
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.schema.createTable('products', (table) => {
    table.increments('id').primary();

    // Multi-tenant: cada registro pertenece a un negocio
    table.integer('business_id').notNullable().index();

    // Identificador único de producto por negocio
    table.string('sku', 64).notNullable();

    // Datos básicos del producto
    table.string('name', 255).notNullable();
    table.text('description').nullable();

    // Precios (ambos protegidos según roles/permisos del sistema)
    table.decimal('cost_price', 12, 2).notNullable().defaultTo(0.00); // Protegido por costs.read
    table.decimal('sale_price', 12, 2).notNullable().defaultTo(0.00); // Precio de venta (PVP)

    // Unidad de medida estándar (pieza, caja, kg, litro, etc.)
    table.string('unit', 50).notNullable().defaultTo('pieza');

    // Relaciones foráneas opcionales (Categoría, Proveedor, Marca)
    table.integer('category_id').nullable().index();
    table.integer('supplier_id').nullable().index();
    table.integer('brand_id').nullable().index();

    // Códigos de barras y QR
    table.string('barcode', 100).nullable();
    table.text('qr_code').nullable();

    // Imagen cargada mediante Multer
    table.string('image_url', 500).nullable();

    // Ubicación física en almacén (Pasillo, Rack, Sección, Gaveta)
    table.string('location', 255).nullable();

    // Atributos y variantes opcionales (talla, color, lote, serie/IMEI) en formato JSON
    table.json('variants').nullable();

    // Estado del producto: 'active' o 'archived'
    table.string('status', 20).notNullable().defaultTo('active').index();

    // Fechas de auditoría
    table.timestamps(true, true);

    // Reglas de unicidad por negocio
    table.unique(['business_id', 'sku'], { indexName: 'idx_products_business_sku' });
    table.unique(['business_id', 'barcode'], { indexName: 'idx_products_business_barcode' });
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('products');
};

