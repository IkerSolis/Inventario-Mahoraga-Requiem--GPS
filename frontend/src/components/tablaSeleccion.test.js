import { describe, expect, test } from 'vitest'
import { alternarFila, alternarVisibles } from './tablaSeleccion.js'

describe('selección de la tabla', () => {
  test('alternarFila agrega y quita', () => {
    expect(alternarFila([1, 2], 3)).toEqual([1, 2, 3])
    expect(alternarFila([1, 2, 3], 2)).toEqual([1, 3])
  })

  test('el encabezado marca las visibles sin perder las de otras páginas', () => {
    expect(alternarVisibles([9], [1, 2])).toEqual([9, 1, 2])
    expect(alternarVisibles([9, 1], [1, 2])).toEqual([9, 1, 2])
  })

  test('si todas las visibles están marcadas, el encabezado las desmarca', () => {
    expect(alternarVisibles([9, 1, 2], [1, 2])).toEqual([9])
  })
})
