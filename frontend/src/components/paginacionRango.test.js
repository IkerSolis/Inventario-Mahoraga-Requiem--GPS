import { describe, expect, test } from 'vitest'
import { paginasVisibles } from './paginacionRango.js'

describe('paginasVisibles', () => {
  test('pocas páginas: se muestran todas', () => {
    expect(paginasVisibles(1, 3)).toEqual([1, 2, 3])
    expect(paginasVisibles(1, 1)).toEqual([1])
  })

  test('en medio: primera, vecinas, última y huecos', () => {
    expect(paginasVisibles(5, 74)).toEqual([1, '…', 4, 5, 6, '…', 74])
  })

  test('en los extremos solo hay un hueco', () => {
    expect(paginasVisibles(1, 74)).toEqual([1, 2, '…', 74])
    expect(paginasVisibles(74, 74)).toEqual([1, '…', 73, 74])
  })
})
