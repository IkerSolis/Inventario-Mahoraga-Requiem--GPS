// Generadores de codigos para productos
// SKU automatico con prefijo de categoria o marca
// Codigo de barras EAN-13 con digito verificador modulo 10
// Codigo CODE-128 y payload para impresion de etiquetas termicas Zebra ZT411
// Sin acentos ni parentesis en comentarios de codigo

const db = require('../../config/database');

class ProductGenerators {
  // Genera un SKU automatico con formato PREFIJO-NUMERO
  // Ejemplo: SKU-HD-1001 o CAT-0005
  async generateSku(businessId, prefix = 'SKU') {
    const cleanPrefix = String(prefix)
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 8) || 'SKU';

    // Buscamos el conteo de productos para asignar el consecutivo
    const result = await db('products')
      .where('business_id', businessId)
      .count({ total: '*' })
      .first();

    const count = Number(result.total || 0) + 1;
    const padded = String(count).padStart(4, '0');

    let candidate = `${cleanPrefix}-${padded}`;
    let exists = await db('products')
      .where({ business_id: businessId, sku: candidate })
      .first();

    // Si ya existe por alguna razon incrementamos hasta hallar uno libre
    let step = 1;
    while (exists) {
      const nextNum = String(count + step).padStart(4, '0');
      candidate = `${cleanPrefix}-${nextNum}`;
      exists = await db('products')
        .where({ business_id: businessId, sku: candidate })
        .first();
      step++;
    }

    return candidate;
  }

  // Calcula el digito verificador de EAN-13 segun estandar GS1
  // Algoritmo checksum modulo 10
  calculateEan13CheckDigit(twelveDigits) {
    if (twelveDigits.length !== 12) {
      throw new Error('Se requieren exactamente 12 digitos para calcular el digito verificador EAN-13');
    }

    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(twelveDigits[i], 10);
      // Posiciones impares indice par suman directo, posiciones pares indice impar multiplican por 3
      sum += (i % 2 === 0) ? digit : digit * 3;
    }

    const mod = sum % 10;
    return mod === 0 ? 0 : 10 - mod;
  }

  // Genera un codigo EAN-13 valido con su digito verificador
  generateEan13(prefixNumber = '750') {
    // 750 es prefijo comun de Mexico en GS1
    const cleanPrefix = String(prefixNumber).replace(/\D/g, '').slice(0, 3) || '750';
    
    // Generamos 9 digitos aleatorios o consecutivos
    let middleDigits = '';
    for (let i = 0; i < 9; i++) {
      middleDigits += Math.floor(Math.random() * 10);
    }

    const first12 = (cleanPrefix + middleDigits).slice(0, 12);
    const checkDigit = this.calculateEan13CheckDigit(first12);
    return `${first12}${checkDigit}`;
  }

  // Genera un codigo CODE-128 valido alfanumerico
  generateCode128(sku) {
    const cleanSku = String(sku || 'PROD').toUpperCase().replace(/[^A-Z0-9-]/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `${cleanSku}-${randomSuffix}`;
  }

  // Genera payload estructurado para etiqueta termica Zebra ZT411
  // Incluye comandos ZPL listos para impresion de etiquetas de almacenes
  generateZebraLabel(product) {
    const { sku, name, barcode, location } = product;
    const safeName = String(name || '').slice(0, 30);
    const safeSku = String(sku || '');
    const safeBarcode = String(barcode || safeSku);
    const safeLocation = String(location || 'SIN UBICACION');

    // Formato ZPL II estandar para Zebra ZT411 de 203 o 300 dpi
    const zpl = [
      '^XA',
      '^FO50,40^A0N,30,30^FD' + safeName + '^FS',
      '^FO50,80^A0N,24,24^FDSKU: ' + safeSku + '^FS',
      '^FO50,115^A0N,22,22^FDUbic: ' + safeLocation + '^FS',
      '^FO50,150^BCN,70,Y,N,N^FD' + safeBarcode + '^FS',
      '^FO380,80^BQN,2,4^FDMA,' + safeSku + '^FS',
      '^XZ'
    ].join('\n');

    return {
      sku: safeSku,
      name: safeName,
      barcode: safeBarcode,
      location: safeLocation,
      qr_payload: JSON.stringify({ sku: safeSku, barcode: safeBarcode, name: safeName }),
      zpl_code: zpl
    };
  }
}

module.exports = new ProductGenerators();

