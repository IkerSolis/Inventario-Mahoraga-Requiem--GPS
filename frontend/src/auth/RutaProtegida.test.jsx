// @vitest-environment jsdom
import { screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { renderConSesion } from '../pruebas/renderConSesion.jsx'
import RutaProtegida from './RutaProtegida.jsx'

describe('RutaProtegida', () => {
  test('con el permiso muestra la página', async () => {
    await renderConSesion(
      <RutaProtegida permiso="stock.read">
        <p>Existencias</p>
      </RutaProtegida>,
      { rol: 'R7' },
    )
    expect(screen.getByText('Existencias')).toBeTruthy()
  })

  test('sin el permiso muestra el aviso y no la página', async () => {
    await renderConSesion(
      <RutaProtegida permiso="stock.adjust.approve">
        <p>Aprobar ajustes</p>
      </RutaProtegida>,
      { rol: 'R4' },
    )
    expect(screen.queryByText('Aprobar ajustes')).toBeNull()
    expect(screen.getByRole('heading', { name: 'Sin permiso' })).toBeTruthy()
    expect(screen.getByText(/stock\.adjust\.approve/)).toBeTruthy()
  })

  test('con una lista basta tener alguno de los permisos', async () => {
    const escaner = (
      <RutaProtegida permiso={['stock.receive', 'stock.issue', 'stock.count']}>
        <p>Escáner</p>
      </RutaProtegida>
    )
    await renderConSesion(escaner, { rol: 'R4' }) // almacenista: cuenta, recibe y despacha
    expect(screen.getByText('Escáner')).toBeTruthy()
  })

  test('con una lista y ninguno de los permisos, aviso', async () => {
    await renderConSesion(
      <RutaProtegida permiso={['stock.receive', 'stock.issue', 'stock.count']}>
        <p>Escáner</p>
      </RutaProtegida>,
      { rol: 'R7' }, // auditor: solo lectura
    )
    expect(screen.queryByText('Escáner')).toBeNull()
    expect(screen.getByText(/alguno de estos permisos/)).toBeTruthy()
  })
})
