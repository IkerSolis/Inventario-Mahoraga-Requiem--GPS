// Se ejecuta antes de cada archivo de pruebas (ver vite.config.js).
// React Testing Library necesita limpiar la pantalla entre pruebas; con Vitest sin "globals" se pide a mano.
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => cleanup())
