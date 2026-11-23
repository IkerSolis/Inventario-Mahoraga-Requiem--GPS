import { describe, expect, test } from 'vitest'
import {
  aAjuste,
  aBodega,
  aKardex,
  aMovimiento,
  aPagina,
  aProducto,
  aResultadoConteo,
  aSesion,
  aStock,
  deAjuste,
  deMovimiento,
  deProducto,
} from './traductores.js'

const filaProducto = {
  id: 7,
  sku: 'MOD-1042',
  name: 'Jeans regular fit',
  description: null,
  cost_price: '357.00', // Postgres manda los DECIMAL como texto
  sale_price: '649.00',
  unit: 'pieza',
  category_id: 2,
  brand_id: null,
  barcode: '7500000000077',
  image_url: '/uploads/products/jeans.png',
  status: 'active',
}

describe('productos', () => {
  test('aProducto pasa a español y convierte los decimales', () => {
    expect(aProducto(filaProducto)).toEqual({
      id: 7,
      sku: 'MOD-1042',
      codigoBarras: '7500000000077',
      nombre: 'Jeans regular fit',
      descripcion: '',
      categoriaId: 2,
      unidad: 'pieza',
      precioCompra: 357,
      precioVenta: 649,
      imagen: '/uploads/products/jeans.png',
      archivado: false,
      existencias: null,
      estadoStock: null,
    })
  })

  test('sin costs.read no viene cost_price y queda en null; archived es archivado', () => {
    const { cost_price, ...sinCosto } = filaProducto
    const producto = aProducto({ ...sinCosto, status: 'archived', barcode: null })
    expect(producto.precioCompra).toBeNull()
    expect(producto.archivado).toBe(true)
    expect(producto.codigoBarras).toBeNull()
  })

  test('deProducto solo manda los campos que vienen y convierte vacío en null', () => {
    expect(deProducto({ nombre: 'Gorra', codigoBarras: '', categoriaId: 4 })).toEqual({
      name: 'Gorra',
      barcode: null,
      category_id: 4,
    })
  })

  test('aPagina traduce cada elemento y toma el total de pagination', () => {
    const respuesta = { ok: true, data: [filaProducto], pagination: { page: 1, limit: 10, total: 31, totalPages: 4 } }
    const pagina = aPagina(respuesta, aProducto)
    expect(pagina.total).toBe(31)
    expect(pagina.paginas).toBe(4)
    expect(pagina.elementos[0].nombre).toBe('Jeans regular fit')
  })
})

describe('existencias, movimientos y kardex', () => {
  test('aStock traduce el estado del servidor a las claves de la UI', () => {
    const fila = {
      id: 1,
      warehouse_id: 1,
      product_id: 7,
      lot_number: '',
      physical_qty: '12.00',
      reserved_qty: '2.00',
      available_qty: 10,
      min_stock: '10.00',
      max_stock: '80.00',
      aisle: '2',
      rack: 'B',
      bin_location: '4',
      stock_state: 'Optimo',
      product_name: 'Jeans',
    }
    expect(aStock(fila)).toMatchObject({ fisico: 12, reservado: 2, disponible: 10, lote: null, estado: 'disponible' })
    expect(aStock({ ...fila, stock_state: 'Stock Bajo' }).estado).toBe('bajo')
    expect(aStock({ ...fila, stock_state: 'Agotado' }).estado).toBe('agotado')
    expect(aStock(fila).costoPromedio).toBeNull() // sin costs.read
  })

  test('deMovimiento pone la clave de idempotencia en el cuerpo y omite lo vacío', () => {
    expect(
      deMovimiento({ tipo: 'salida', bodegaId: 2, productoId: 7, cantidad: 3, documento: '', clave: 'abc' }),
    ).toEqual({ type: 'issue', warehouse_id: 2, product_id: 7, qty: 3, idempotency_key: 'abc' })
    expect(
      deMovimiento({ tipo: 'transferencia', bodegaId: 1, bodegaDestinoId: 2, productoId: 7, cantidad: 1, clave: 'x' }),
    ).toMatchObject({ type: 'transfer', destination_warehouse_id: 2 })
  })

  test('aMovimiento traduce la operación y los saldos', () => {
    const respuesta = {
      ok: true,
      operation: {
        id: 3,
        movement_type: 'receive',
        status: 'completed',
        source_warehouse_id: 1,
        product_id: 7,
        qty: 5,
      },
      movements: [{ id: 9, initial_qty: 12, resulting_qty: 17 }],
    }
    expect(aMovimiento(respuesta)).toMatchObject({
      operacion: { id: 3, tipo: 'entrada', estado: 'completado', bodegaId: 1, cantidad: 5 },
      movimientos: [{ id: 9, existenciasAntes: 12, existenciasDespues: 17 }],
      duplicado: false,
    })
  })

  test('aKardex distingue entradas y salidas de transferencias y ajustes', () => {
    expect(aKardex({ id: 1, movement_type: 'transfer_out' }).tipo).toBe('transferenciaSalida')
    expect(aKardex({ id: 2, movement_type: 'adjustment_in' }).tipo).toBe('ajusteEntrada')
  })

  test('aResultadoConteo da sistema, contado y diferencia de cada partida', () => {
    const datos = {
      count_session_id: 4,
      status: 'completed',
      items: [{ id: 1, product_id: 7, system_qty: 12, counted_qty: 10, difference_qty: -2, adjustment_id: 8 }],
    }
    expect(aResultadoConteo(datos)).toEqual({
      conteoId: 4,
      partidas: [{ productoId: 7, sistema: 12, contado: 10, diferencia: -2, ajusteId: 8 }],
    })
  })

  test('ajustes de ida y vuelta', () => {
    expect(
      deAjuste({ bodegaId: 1, productoId: 7, tipo: 'negativo', cantidad: 2, motivo: 'Pieza dañada', evidencia: '' }),
    ).toEqual({ warehouse_id: 1, product_id: 7, adjustment_type: 'negative', qty: 2, reason: 'Pieza dañada' })
    expect(
      aAjuste({ id: 1, warehouse_id: 1, product_id: 7, adjustment_type: 'positive', qty: '2.00', status: 'pending' }),
    ).toMatchObject({ tipo: 'positivo', cantidad: 2, estado: 'pendiente' })
  })
})

describe('sesión y bodegas (Backend 1)', () => {
  test('aSesion toma permisos y roles de user', () => {
    const respuesta = {
      user: { id: 5, name: 'Ana', email: 'ana@x.com', roles: ['warehouse_operator'], permissions: ['stock.read'] },
      business: { id: 1, name: 'Mahoraga', logo_url: null },
    }
    expect(aSesion(respuesta)).toEqual({
      usuario: { id: 5, nombre: 'Ana', correo: 'ana@x.com', avatar: null },
      negocio: { id: 1, nombre: 'Mahoraga', logo: null },
      roles: ['warehouse_operator'],
      permisos: ['stock.read'],
      esPropietario: false,
    })
  })

  test('aBodega', () => {
    expect(aBodega({ id: 2, code: 'ALM-02', name: 'Bodega norte', branch_name: 'Norte', is_active: 1 })).toEqual({
      id: 2,
      codigo: 'ALM-02',
      nombre: 'Bodega norte',
      sucursal: 'Norte',
      activa: true,
    })
  })
})
