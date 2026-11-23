// @vitest-environment jsdom
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, test } from 'vitest'
import { ThemeProvider } from '../context/ThemeContext.jsx'
import CategoriasPage from './catalogos/categorias.jsx'
import MarcasPage from './catalogos/Marcas.jsx'
import ProveedoresPage from './catalogos/Proveedores.jsx'
import ClientesPage from './catalogos/Clientes.jsx'
import UnidadesPage from './catalogos/Unidades.jsx'
import AlmacenesPage from './catalogos/Almacenes.jsx'
import UsuariosPage from './Seguridad/Usuarios.jsx'
import RolesPermisosPage from './Seguridad/RolesPermisos.jsx'
import EmpresaSucursalesPage from './Seguridad/EmpresaSucursales.jsx'
import CentroAnaliticoPage from './reportes/CentroAnalitico.jsx'
import ConfiguracionPage from './configuracion/Configuracion.jsx'

const paginas = [
  ['Categorías', CategoriasPage],
  ['Marcas', MarcasPage],
  ['Proveedores', ProveedoresPage],
  ['Clientes', ClientesPage],
  ['Unidades', UnidadesPage],
  ['Almacenes', AlmacenesPage],
  ['Usuarios', UsuariosPage],
  ['Roles y Permisos', RolesPermisosPage],
  ['Empresa y Sucursales', EmpresaSucursalesPage],
  ['Centro Analítico', CentroAnaliticoPage],
  ['Configuración', ConfiguracionPage],
]

describe('Smoke test de renderizado de todas las vistas de Frontend 3', () => {
  for (const [nombre, Componente] of paginas) {
    test(`renderiza ${nombre} sin errores`, () => {
      const { container } = render(
        <ThemeProvider>
          <MemoryRouter>
            <Componente />
          </MemoryRouter>
        </ThemeProvider>,
      )
      expect(container.innerHTML.length).toBeGreaterThan(0)
    })
  }
})
