// Simula GET /api/auth/me de Backend 1. Responde igual que el servidor:
// { user: { id, business_id, name, email, status, is_owner, avatar_url, roles, permissions, scopes }, business }
// La tabla rol → permisos sale de la matriz del plan de desarrollo.
// Los permisos marcados como opcionales (*) en la matriz quedan APAGADOS aquí, salvo los indicados:
//   R2 costs.read · R3 stock.adjust.approve, audit.read · R4 stock.transfer
//   R5 stock.receive, costs.read · R6 stock.issue, stock.transfer, prices.manage · R7 audit.read
// Encendidos para la demo del escáner: R4 stock.receive y stock.issue (ver el arreglo de R4).
// Para probar uno, agrégalo al arreglo del rol; para apagarlo, quítalo.
import { esperar } from './esperar.js'

// codigo: como se nombran en el plan (R0–R7). clave: el código del rol en Backend 1 (user.roles).
// id: un usuario distinto por rol, para que el mock de ajustes sepa quién solicitó y quién aprueba.
export const ROLES = [
  { codigo: 'R0', clave: 'owner', nombre: 'Propietario', id: 1 },
  { codigo: 'R1', clave: 'system_admin', nombre: 'Administrador del sistema', id: 2 },
  { codigo: 'R2', clave: 'inventory_manager', nombre: 'Gerente de inventario', id: 3 },
  { codigo: 'R3', clave: 'warehouse_supervisor', nombre: 'Supervisor de almacén', id: 4 },
  { codigo: 'R4', clave: 'warehouse_operator', nombre: 'Almacenista', id: 5 },
  { codigo: 'R5', clave: 'purchasing', nombre: 'Compras', id: 6 },
  { codigo: 'R6', clave: 'sales', nombre: 'Ventas / mostrador', id: 7 },
  { codigo: 'R7', clave: 'auditor', nombre: 'Auditor', id: 8 },
]

// Los 30 permisos atómicos del sistema
export const TODOS_LOS_PERMISOS = [
  'users.read',
  'users.create',
  'users.update',
  'users.disable',
  'users.assign_roles',
  'roles.read',
  'roles.manage',
  'settings.manage',
  'locations.manage',
  'products.read',
  'products.create',
  'products.update',
  'products.archive',
  'stock.read',
  'stock.count',
  'stock.receive',
  'stock.issue',
  'stock.transfer',
  'stock.adjust.request',
  'stock.adjust.approve',
  'purchases.read',
  'purchases.create',
  'purchases.approve',
  'sales.read',
  'sales.create',
  'costs.read',
  'prices.manage',
  'reports.read',
  'reports.export',
  'audit.read',
]

export const PERMISOS_POR_ROL = {
  R0: TODOS_LOS_PERMISOS,
  R1: TODOS_LOS_PERMISOS,
  R2: [
    'products.read',
    'products.create',
    'products.update',
    'stock.read',
    'stock.count',
    'stock.receive',
    'stock.issue',
    'stock.transfer',
    'stock.adjust.request',
    'stock.adjust.approve',
    'purchases.read',
    'purchases.approve',
    'sales.read',
    'reports.read',
    'reports.export',
    'audit.read',
  ],
  R3: [
    'products.read',
    'products.create',
    'products.update',
    'stock.read',
    'stock.count',
    'stock.receive',
    'stock.issue',
    'stock.transfer',
    'stock.adjust.request',
    'purchases.read',
    'sales.read',
    'reports.read',
  ],
  R4: [
    'products.read',
    'stock.read',
    'stock.count',
    // Opcionales según el plan (O*); encendidos para que el almacenista use F1 y F2 en la demo
    'stock.receive',
    'stock.issue',
    'stock.adjust.request',
    'purchases.read',
    'sales.read',
    'reports.read',
  ],
  R5: ['products.read', 'stock.read', 'purchases.read', 'purchases.create', 'sales.read', 'reports.read'],
  R6: ['products.read', 'stock.read', 'purchases.read', 'sales.read', 'sales.create', 'reports.read'],
  R7: ['users.read', 'roles.read', 'products.read', 'stock.read', 'purchases.read', 'sales.read', 'reports.read'],
}

// Hace las veces de la cookie de sesión: los otros mocks preguntan aquí quién es el usuario actual
let rolActual = ROLES[0]

export function tienePermiso(permiso) {
  return PERMISOS_POR_ROL[rolActual.codigo].includes(permiso)
}

export function usuarioActual() {
  return rolActual.id
}

// claveRol: 'owner', 'auditor'... (solo el mock lo usa, para el selector de rol de prueba)
export function obtenerSesion(claveRol = rolActual.clave) {
  rolActual = ROLES.find((r) => r.clave === claveRol) ?? ROLES[0]
  return esperar({
    user: {
      id: rolActual.id,
      business_id: 1,
      name: `Usuario de prueba (${rolActual.nombre})`,
      email: `${rolActual.clave}@mahoraga.test`,
      status: 'active',
      is_owner: rolActual.clave === 'owner',
      avatar_url: null,
      roles: [rolActual.clave],
      permissions: PERMISOS_POR_ROL[rolActual.codigo],
      scopes: [],
    },
    business: { id: 1, name: 'Mahoraga Demo', legal_name: 'Mahoraga Demo S.A. de C.V.', logo_url: null },
  })
}
