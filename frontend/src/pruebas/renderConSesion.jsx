// Ayuda para las pruebas de pantallas: dibuja un componente con una sesión fija y un router en memoria.
import { render } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { PERMISOS_POR_ROL, ROLES, obtenerSesion } from '../api/mock/sesion.js'
import { SesionContext } from '../auth/SesionContext.jsx'

// rol: 'R0'…'R7' (la tabla del mock). También cambia el usuario del mock, para que los permisos que revisa
// el mock (como el servidor) sean los mismos que ve la UI.
// ruta: la URL inicial. patron: la ruta con parámetros (por ejemplo '/kardex/:productoId') si la pantalla los lee.
export async function renderConSesion(ui, { rol = 'R0', ruta = '/', patron = '*' } = {}) {
  const { clave, id } = ROLES.find((r) => r.codigo === rol)
  await obtenerSesion(clave)
  const sesion = {
    usuario: { id, nombre: `Prueba ${rol}`, correo: null, avatar: null },
    negocio: null,
    roles: [clave],
    permisos: PERMISOS_POR_ROL[rol],
    esPropietario: rol === 'R0',
    cambiarRol: () => {},
  }
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <SesionContext.Provider value={sesion}>
        <Routes>
          <Route path={patron} element={ui} />
        </Routes>
      </SesionContext.Provider>
    </MemoryRouter>,
  )
}
