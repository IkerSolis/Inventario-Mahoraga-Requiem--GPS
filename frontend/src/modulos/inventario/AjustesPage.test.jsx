// @vitest-environment jsdom
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import { renderConSesion } from '../../pruebas/renderConSesion.jsx'
import AjustesPage from './AjustesPage.jsx'

// src/api/ responde con los mocks, como con VITE_USE_MOCK=true
vi.mock('../../api/cliente.js', async (original) => ({ ...(await original()), usarMock: true }))

describe('Ajustes', () => {
  test('el almacenista (R4) solicita un ajuste y no ve la bandeja', async () => {
    const usuario = userEvent.setup()
    await renderConSesion(<AjustesPage />, { rol: 'R4' })
    expect(screen.queryByRole('heading', { name: 'Bandeja de ajustes' })).toBeNull()

    // Sin producto ni datos: marca los errores y no envía
    await usuario.click(screen.getByRole('button', { name: 'Solicitar ajuste' }))
    expect(await screen.findByText('Busca y elige el producto')).toBeTruthy()

    await usuario.type(screen.getByLabelText('Producto (código de barras o SKU)'), 'MOD-1007')
    await usuario.click(screen.getByRole('button', { name: 'Buscar' }))
    expect(await screen.findByText('Jeans regular fit')).toBeTruthy()

    await usuario.selectOptions(screen.getByLabelText('Tipo'), 'negativo')
    await usuario.type(screen.getByLabelText('Cantidad'), '2')
    await usuario.type(screen.getByLabelText('Motivo'), 'Dos piezas con defecto de fábrica')
    await usuario.click(screen.getByRole('button', { name: 'Solicitar ajuste' }))
    expect(await screen.findByText(/Queda pendiente de aprobación/)).toBeTruthy()
  })

  test('el gerente (R2) aprueba un pendiente de otro usuario', async () => {
    const usuario = userEvent.setup()
    await renderConSesion(<AjustesPage />, { rol: 'R2' })

    const motivo = await screen.findByText('Piezas dañadas en la recepción')
    const fila = motivo.closest('tr')
    await usuario.click(within(fila).getByRole('button', { name: 'Aprobar' }))
    expect(await screen.findByText(/Ajuste aprobado/)).toBeTruthy()
    await vi.waitFor(() => expect(screen.queryByText('Piezas dañadas en la recepción')).toBeNull())
  })

  test('no se puede aprobar ni rechazar lo que uno mismo solicitó', async () => {
    const usuario = userEvent.setup()
    // R2 solicita uno y luego lo ve en su bandeja sin botones
    await renderConSesion(<AjustesPage />, { rol: 'R2' })
    await usuario.type(screen.getByLabelText('Producto (código de barras o SKU)'), 'MOD-1014')
    await usuario.click(screen.getByRole('button', { name: 'Buscar' }))
    await screen.findByText('MOD-1014', { selector: '.ajustes-elegido .inventario-sku' })
    await usuario.selectOptions(screen.getByLabelText('Tipo'), 'positivo')
    await usuario.type(screen.getByLabelText('Cantidad'), '1')
    await usuario.type(screen.getByLabelText('Motivo'), 'Pieza devuelta sin registrar')
    await usuario.click(screen.getByRole('button', { name: 'Solicitar ajuste' }))

    const fila = (await screen.findByText('Pieza devuelta sin registrar')).closest('tr')
    expect(within(fila).getByText('Tú')).toBeTruthy()
    expect(within(fila).queryByRole('button', { name: 'Aprobar' })).toBeNull()
    expect(within(fila).getByText('Lo aprueba otra persona')).toBeTruthy()
  })
})
