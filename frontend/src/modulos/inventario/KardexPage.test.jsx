// @vitest-environment jsdom
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import { renderConSesion } from '../../pruebas/renderConSesion.jsx'
import KardexPage from './KardexPage.jsx'

// src/api/ responde con los mocks, como con VITE_USE_MOCK=true
vi.mock('../../api/cliente.js', async (original) => ({ ...(await original()), usarMock: true }))

describe('Kardex', () => {
  test('muestra los renglones del producto con entradas, salidas y saldo', async () => {
    // Producto 2 en el almacén principal: saldo inicial y una entrada de ejemplo (OC-1001)
    await renderConSesion(<KardexPage />, {
      rol: 'R0',
      ruta: '/kardex/2?bodega=1',
      patron: '/kardex/:productoId',
    })
    expect(await screen.findByRole('heading', { name: 'Kardex · Jeans regular fit' })).toBeTruthy()
    const fila = (await screen.findByText('OC-1001')).closest('tr')
    expect(within(fila).getByText('+12')).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: 'Costo prom.' })).toBeTruthy()
  })

  test('sin producto en la URL, se busca uno y se abre su kardex', async () => {
    const usuario = userEvent.setup()
    await renderConSesion(<KardexPage />, { rol: 'R7', ruta: '/kardex', patron: '/kardex/:productoId?' })
    await usuario.type(screen.getByLabelText('Producto'), 'MOD-1007')
    const enlace = await screen.findByRole('link', { name: 'Jeans regular fit' })
    expect(enlace.getAttribute('href')).toBe('/inventario/kardex/2')
  })
})
