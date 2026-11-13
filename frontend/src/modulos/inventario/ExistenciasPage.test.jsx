// @vitest-environment jsdom
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import { renderConSesion } from '../../pruebas/renderConSesion.jsx'
import ExistenciasPage from './ExistenciasPage.jsx'

// src/api/ responde con los mocks, como con VITE_USE_MOCK=true
vi.mock('../../api/cliente.js', async (original) => ({ ...(await original()), usarMock: true }))

describe('Existencias', () => {
  test('lista las existencias y la bandeja de stock bajo filtra por estado', async () => {
    const usuario = userEvent.setup()
    await renderConSesion(<ExistenciasPage />, { rol: 'R0' })

    expect(await screen.findByText('Chaleco acolchado 4')).toBeTruthy()
    // R0 tiene costs.read: se ve la columna de costo
    expect(screen.getByRole('columnheader', { name: 'Costo prom.' })).toBeTruthy()

    await usuario.click(screen.getByRole('button', { name: /Bandeja de stock bajo/ }))
    const tabla = await screen.findByRole('table')
    await vi.waitFor(() => {
      const estados = within(tabla)
        .getAllByRole('row')
        .slice(1)
        .map((fila) => fila.textContent)
      expect(estados.length).toBeGreaterThan(0)
      expect(estados.every((t) => t.includes('Stock bajo'))).toBe(true)
    })
  })

  test('sin costs.read no aparece la columna de costo', async () => {
    await renderConSesion(<ExistenciasPage />, { rol: 'R4' })
    await screen.findByText('Chaleco acolchado 4')
    expect(screen.queryByRole('columnheader', { name: 'Costo prom.' })).toBeNull()
  })
})
