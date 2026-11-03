// Servicio de importacion y exportacion masiva de productos
// Valida fila por fila usando el esquema de Zod
// Aplica transaccion en Knex y reporta errores por numero de fila
// Protege columnas de costos si el usuario no tiene permiso costs.read
// Sin acentos ni parentesis en comentarios de codigo

const db = require('../../config/database');
const { createProductSchema } = require('./products.validation');

class ProductsExcelService {
  // Parsea contenido en formato texto CSV a un arreglo de objetos
  parseCsv(content) {
    const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) {
      throw new Error('El archivo CSV debe contener al menos la fila de encabezados y una fila de datos');
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      // Separamos respetando comas simples
      const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const rowObject = {};
      
      headers.forEach((header, index) => {
        rowObject[header] = values[index] !== undefined ? values[index] : null;
      });

      rows.push({
        rowNumber: i + 1,
        data: rowObject
      });
    }

    return rows;
  }

  // Importa productos validando fila por fila dentro de una transaccion
  // Si dryRun es verdadero solo valida y no guarda nada en la base de datos
  async importMassive(businessId, csvContent, dryRun = false) {
    const parsedRows = this.parseCsv(csvContent);
    const errors = [];
    const validRows = [];

    for (const item of parsedRows) {
      const { rowNumber, data } = item;

      // Convertimos valores vacios a null
      Object.keys(data).forEach(key => {
        if (data[key] === '' || data[key] === 'null' || data[key] === 'undefined') {
          data[key] = null;
        }
      });

      // Validacion con Zod
      const validation = createProductSchema.safeParse(data);

      if (!validation.success) {
        errors.push({
          row: rowNumber,
          sku: data.sku || 'DESCONOCIDO',
          issues: validation.error.issues.map(iss => iss.message)
        });
        continue;
      }

      const validData = validation.data;

      // Verificamos unicidad de SKU en la misma carga o en base de datos
      const duplicateInBatch = validRows.find(r => r.sku === validData.sku);
      if (duplicateInBatch) {
        errors.push({
          row: rowNumber,
          sku: validData.sku,
          issues: ['El SKU esta duplicado dentro del mismo archivo importado']
        });
        continue;
      }

      const existsInDb = await db('products')
        .where({ business_id: businessId, sku: validData.sku })
        .first();

      if (existsInDb) {
        errors.push({
          row: rowNumber,
          sku: validData.sku,
          issues: ['El SKU ya existe previamente en la base de datos de este negocio']
        });
        continue;
      }

      validRows.push(validData);
    }

    // Si hay errores o si es una simulacion devolvemos el reporte
    if (errors.length > 0) {
      return {
        success: false,
        message: 'Se encontraron errores de validacion en algunas filas. No se inserto ningun registro',
        totalRows: parsedRows.length,
        errorsCount: errors.length,
        errors
      };
    }

    if (dryRun) {
      return {
        success: true,
        dryRun: true,
        message: 'Validacion exitosa de todas las filas. Listo para importar',
        validCount: validRows.length
      };
    }

    // Transaccion Knex para insertar todos los registros de forma atomica
    const trx = await db.transaction();
    try {
      for (const row of validRows) {
        await trx('products').insert({
          ...row,
          business_id: businessId,
          variants: row.variants ? JSON.stringify(row.variants) : null,
          created_at: new Date(),
          updated_at: new Date()
        });
      }
      await trx.commit();

      return {
        success: true,
        message: 'Importacion completada con exito',
        insertedCount: validRows.length
      };
    } catch (err) {
      await trx.rollback();
      throw new Error('Error al ejecutar la transaccion de importacion: ' + err.message);
    }
  }

  // Exporta el catalogo de productos a formato texto CSV
  // Protege las columnas de costos si canReadCosts es falso
  async exportFiltered(businessId, filters = {}, canReadCosts = false) {
    const query = db('products').where('business_id', businessId);

    if (filters.status && filters.status !== 'all') {
      query.where('status', filters.status);
    }
    if (filters.category_id) {
      query.where('category_id', filters.category_id);
    }
    if (filters.brand_id) {
      query.where('brand_id', filters.brand_id);
    }

    const products = await query.orderBy('id', 'asc');

    // Definicion de columnas segun permisos
    const headers = [
      'id',
      'sku',
      'name',
      'description',
      'sale_price',
      'unit',
      'category_id',
      'supplier_id',
      'brand_id',
      'barcode',
      'location',
      'status'
    ];

    // Solo se anade cost_price si el usuario tiene el permiso de ver costos
    if (canReadCosts) {
      headers.splice(4, 0, 'cost_price');
    }

    const lines = [headers.join(',')];

    for (const prod of products) {
      const rowValues = headers.map(header => {
        const val = prod[header];
        if (val === null || val === undefined) return '';
        const escaped = String(val).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      lines.push(rowValues.join(','));
    }

    return lines.join('\n');
  }
}

module.exports = new ProductsExcelService();

