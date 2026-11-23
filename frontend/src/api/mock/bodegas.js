// Simula GET /api/settings/warehouses de Backend 1. Responde igual que el servidor: { warehouses: [...] }
// (sin "ok": Backend 1 no lo usa). Solo pide haber iniciado sesión.
import { esperar } from './esperar.js'

export const bodegas = [
  {
    id: 1,
    business_id: 1,
    branch_id: 1,
    branch_name: 'Matriz',
    code: 'ALM-01',
    name: 'Almacén principal',
    is_active: true,
  },
  {
    id: 2,
    business_id: 1,
    branch_id: 2,
    branch_name: 'Sucursal Norte',
    code: 'ALM-02',
    name: 'Bodega norte',
    is_active: true,
  },
  {
    id: 3,
    business_id: 1,
    branch_id: 2,
    branch_name: 'Sucursal Norte',
    code: 'ALM-03',
    name: 'Bodega temporal',
    is_active: false,
  },
].map((b) => ({ ...b, created_at: '2026-11-01T12:00:00.000Z' }))

export async function listar() {
  return esperar({ warehouses: bodegas.map((b) => ({ ...b })) })
}
