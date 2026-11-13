// @vitest-environment jsdom
import { screen, within } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import Layout from './Layout.jsx'
import InventarioLayout from './modulos/inventario/InventarioLayout.jsx'
import { renderConSesion } from './pruebas/renderConSesion.jsx'

function textosDe(nombreNavegacion) {
  const navegacion = screen.getByRole('navigation', { name: nombreNavegacion })
  return within(navegacion)
    .getAllByRole('link')
    .map((enlace) => enlace.lastChild.textContent.trim()) // el texto va después del ícono
}

describe('menú principal según el rol', () => {
  test('el propietario (R0) ve los tres módulos', async () => {
    await renderConSesion(<Layout />, { rol: 'R0' })
    expect(textosDe('Menú principal')).toEqual(['Productos', 'Escáner', 'Inventario'])
  })

  test('el auditor (R7) no ve el escáner: no registra movimientos ni conteos', async () => {
    await renderConSesion(<Layout />, { rol: 'R7' })
    expect(textosDe('Menú principal')).toEqual(['Productos', 'Inventario'])
  })

  test('ventas (R6) tampoco ve el escáner', async () => {
    await renderConSesion(<Layout />, { rol: 'R6' })
    expect(textosDe('Menú principal')).not.toContain('Escáner')
  })
})

describe('pestañas de inventario según el rol', () => {
  test('el gerente (R2) ve todas las pestañas', async () => {
    await renderConSesion(<InventarioLayout />, { rol: 'R2' })
    expect(textosDe('Secciones de inventario')).toEqual(['Existencias', 'Movimientos', 'Kardex', 'Ajustes'])
  })

  test('el almacenista (R4) ve Ajustes porque puede solicitarlos', async () => {
    await renderConSesion(<InventarioLayout />, { rol: 'R4' })
    expect(textosDe('Secciones de inventario')).toContain('Ajustes')
  })

  test('el auditor (R7) no ve Ajustes', async () => {
    await renderConSesion(<InventarioLayout />, { rol: 'R7' })
    expect(textosDe('Secciones de inventario')).toEqual(['Existencias', 'Movimientos', 'Kardex'])
  })
})
