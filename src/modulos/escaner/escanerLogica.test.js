import { describe, expect, test } from 'vitest'
import {
  MODOS,
  elegirModo,
  esMismoProducto,
  modoPorTecla,
  modosPermitidos,
  nuevaClave,
  resumenMovimiento,
  sumarCantidad,
  textoCantidad,
  textoDiferencia,
  totalNuevo,
  validarCantidad,
} from './escanerLogica.js'

// Simula usePuede() con una lista fija de permisos
const conPermisos = (lista) => (permiso) => lista.includes(permiso)

describe('modos del escáner', () => {
  test('solo aparecen los modos con permiso', () => {
    expect(modosPermitidos(conPermisos(['stock.count'])).map((m) => m.clave)).toEqual(['auditoria'])
    expect(modosPermitidos(conPermisos([]))).toEqual([])
    expect(modosPermitidos(conPermisos(['stock.receive', 'stock.issue', 'stock.count']))).toEqual(MODOS)
  })

  test('se usa el modo de la URL solo si está permitido', () => {
    const permitidos = modosPermitidos(conPermisos(['stock.receive', 'stock.count']))
    expect(elegirModo('auditoria', permitidos).clave).toBe('auditoria')
    expect(elegirModo('salida', permitidos).clave).toBe('entrada') // salida no está permitida
    expect(elegirModo(null, permitidos).clave).toBe('entrada')
    expect(elegirModo('entrada', [])).toBeNull()
  })

  test('las teclas F1, F2 y F3 eligen su modo si está permitido', () => {
    const permitidos = modosPermitidos(conPermisos(['stock.receive', 'stock.count']))
    expect(modoPorTecla('F3', permitidos).clave).toBe('auditoria')
    expect(modoPorTecla('F2', permitidos)).toBeNull()
    expect(modoPorTecla('Enter', permitidos)).toBeNull()
  })
})

describe('esMismoProducto', () => {
  const producto = { codigoBarras: '7500000000015', sku: 'MOD-1000' }

  test('reconoce el mismo producto por código de barras o SKU', () => {
    expect(esMismoProducto('7500000000015', producto)).toBe(true)
    expect(esMismoProducto(' mod-1000 ', producto)).toBe(true)
  })

  test('otro código o sin producto en pantalla no es el mismo', () => {
    expect(esMismoProducto('7500000000022', producto)).toBe(false)
    expect(esMismoProducto('7500000000015', null)).toBe(false)
  })
})

describe('confirmación de movimientos', () => {
  test('sumarCantidad suma pasos y nunca baja de 0', () => {
    expect(sumarCantidad('10', 25)).toBe('35')
    expect(sumarCantidad('', 1)).toBe('1')
    expect(sumarCantidad('2', -5)).toBe('0')
  })

  test('totalNuevo según el tipo de movimiento', () => {
    expect(totalNuevo('entrada', 12, 10)).toBe(22)
    expect(totalNuevo('salida', 12, 10)).toBe(2)
    expect(totalNuevo('conteo', 12, 9)).toBe(9)
  })

  test('validarCantidad', () => {
    expect(validarCantidad('entrada', '10', 0)).toBeNull()
    expect(validarCantidad('entrada', '0', 5)).toBe('La cantidad debe ser al menos 1')
    expect(validarCantidad('entrada', '', 5)).toBe('Escribe una cantidad entera')
    expect(validarCantidad('entrada', '2.5', 5)).toBe('Escribe una cantidad entera')
    expect(validarCantidad('salida', '6', 5)).toBe('Solo hay 5 en stock')
    expect(validarCantidad('salida', '5', 5)).toBeNull()
    expect(validarCantidad('conteo', '0', 5)).toBeNull()
    expect(validarCantidad('conteo', '-1', 5)).toBe('La cantidad contada no puede ser negativa')
  })

  test('nuevaClave da claves distintas', () => {
    expect(nuevaClave()).not.toBe(nuevaClave())
  })
})

describe('textos de movimientos', () => {
  test('textoCantidad y textoDiferencia', () => {
    expect(textoCantidad('entrada', 10)).toBe('+10')
    expect(textoCantidad('salida', 4)).toBe('−4')
    expect(textoCantidad('conteo', 12)).toBe('12')
    expect(textoDiferencia(2)).toBe('+2')
    expect(textoDiferencia(-3)).toBe('−3')
    expect(textoDiferencia(0)).toBe('0')
  })

  test('resumenMovimiento', () => {
    const entrada = { tipo: 'entrada', cantidad: 10, existenciasAntes: 17, existenciasDespues: 27 }
    expect(resumenMovimiento(entrada, 'Jeans')).toBe('Entrada registrada: Jeans +10 (17 → 27).')
    const conteo = { tipo: 'conteo', cantidad: 15, existenciasAntes: 17, existenciasDespues: 17, diferencia: -2 }
    expect(resumenMovimiento(conteo, 'Jeans')).toBe(
      'Conteo registrado: Jeans, 15 contadas (sistema 17, diferencia −2).',
    )
  })
})
