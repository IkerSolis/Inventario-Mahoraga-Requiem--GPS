// @vitest-environment jsdom
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import { renderConSesion } from '../../pruebas/renderConSesion.jsx'
import MovimientosPage from './MovimientosPage.jsx'

// src/api/ responde con los mocks, como con VITE_USE_MOCK=true
vi.mock('../../api/cliente.js', async (original) => ({ ...(await original()), usarMock: true }))

describe('Movimientos', () => {
  test('lista los movimientos con el nombre del producto y filtra por tipo', async () => {
    const usuario = userEvent.setup()
    await renderConSesion(<MovimientosPage />, { rol: 'R7' })

    // El mock trae movimientos de ejemplo; el nombre llega aparte (los movimientos solo traen product_id)
    expect(await screen.findByText('OC-1001')).toBeTruthy()
    expect(await screen.findAllByText('Jeans regular fit')).toBeTruthy()
    // El auditor no tiene costs.read
    expect(screen.queryByRole('columnheader', { name: 'Costo unit.' })).toBeNull()

    await usuario.selectOptions(screen.getByLabelText('Tipo'), 'salida')
    await vi.waitFor(() => {
      const filas = within(screen.getByRole('table')).getAllByRole('row').slice(1)
      expect(filas.length).toBe(2)
      expect(filas.every((fila) => fila.textContent.includes('Salida'))).toBe(true)
    })
  })

  test('una transferencia muestra origen → destino y queda en tránsito', async () => {
    await renderConSesion(<MovimientosPage />, { rol: 'R0', ruta: '/?tipo=transferencia' })
    expect(await screen.findByText('Almacén principal → Bodega norte')).toBeTruthy()
    expect(within(screen.getByRole('table')).getByText('En tránsito')).toBeTruthy()
  })
})
