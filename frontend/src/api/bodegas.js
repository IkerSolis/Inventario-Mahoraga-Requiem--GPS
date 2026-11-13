import { pedir, usarMock } from './cliente.js'
import * as mock from './mock/bodegas.js'
import { aBodega } from './traductores.js'

// GET /api/settings/warehouses (Backend 1) → [{ id, codigo, nombre, sucursal, activa }]
// Las bodegas las administra Backend 1 (configuración); aquí solo se listan para elegir una.
export async function listarBodegas() {
  const respuesta = usarMock ? await mock.listar() : await pedir('/settings/warehouses')
  return respuesta.warehouses.map(aBodega)
}
