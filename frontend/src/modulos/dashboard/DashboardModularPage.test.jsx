// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { ThemeProvider } from '../../context/ThemeContext.jsx'
import DashboardModularPage from './DashboardModularPage.tsx'

describe('DashboardModularPage (Frontend 1 integrado)', () => {
  test('renderiza sin errores y alterna entre tema claro y oscuro sincronizado', () => {
    localStorage.clear()
    render(
      <ThemeProvider>
        <DashboardModularPage />
      </ThemeProvider>,
    )

    const botonTema = screen.getByTitle('Cambiar Tema Claro / Oscuro (Variables CSS)')
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)

    fireEvent.click(botonTema)
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)

    fireEvent.click(botonTema)
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })
})
