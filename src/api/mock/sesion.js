// Simula GET /api/me. La tabla sale de la matriz de permisos del plan de desarrollo.
// Los permisos marcados como opcionales (*) en la matriz quedan APAGADOS aquí:
//   R2 costs.read · R3 stock.adjust.approve, audit.read · R4 stock.receive, stock.issue, stock.transfer
//   R5 stock.receive, costs.read · R6 stock.issue, stock.transfer, prices.manage · R7 audit.read
// Para probar uno, agrégalo al arreglo del rol.

export const ROLES = [
  { codigo: 'R0', nombre: 'Propietario' },
  { codigo: 'R1', nombre: 'Administrador del sistema' },
  { codigo: 'R2', nombre: 'Gerente de inventario' },
  { codigo: 'R3', nombre: 'Supervisor de almacén' },
  { codigo: 'R4', nombre: 'Almacenista' },
  { codigo: 'R5', nombre: 'Compras' },
  { codigo: 'R6', nombre: 'Ventas / mostrador' },
  { codigo: 'R7', nombre: 'Auditor' },
]

// Los 30 permisos atómicos del sistema
export const TODOS_LOS_PERMISOS = [
  'users.read', 'users.create', 'users.update', 'users.disable', 'users.assign_roles',
  'roles.read', 'roles.manage',
  'settings.manage', 'locations.manage',
  'products.read', 'products.create', 'products.update', 'products.archive',
  'stock.read', 'stock.count',
  'stock.receive',
  'stock.issue', 'stock.transfer',
  'stock.adjust.request', 'stock.adjust.approve',
  'purchases.read', 'purchases.create', 'purchases.approve',
  'sales.read', 'sales.create',
  'costs.read',
  'prices.manage',
  'reports.read', 'reports.export',
  'audit.read',
]

export const PERMISOS_POR_ROL = {
  R0: TODOS_LOS_PERMISOS,
  R1: TODOS_LOS_PERMISOS,
  R2: [
    'products.read', 'products.create', 'products.update',
    'stock.read', 'stock.count', 'stock.receive', 'stock.issue', 'stock.transfer',
    'stock.adjust.request', 'stock.adjust.approve',
    'purchases.read', 'purchases.approve', 'sales.read',
    'reports.read', 'reports.export', 'audit.read',
  ],
  R3: [
    'products.read', 'products.create', 'products.update',
    'stock.read', 'stock.count', 'stock.receive', 'stock.issue', 'stock.transfer',
    'stock.adjust.request',
    'purchases.read', 'sales.read', 'reports.read',
  ],
  R4: [
    'products.read', 'stock.read', 'stock.count', 'stock.adjust.request',
    'purchases.read', 'sales.read', 'reports.read',
  ],
  R5: [
    'products.read', 'stock.read',
    'purchases.read', 'purchases.create', 'sales.read', 'reports.read',
  ],
  R6: [
    'products.read', 'stock.read',
    'purchases.read', 'sales.read', 'sales.create', 'reports.read',
  ],
  R7: [
    'users.read', 'roles.read', 'products.read', 'stock.read',
    'purchases.read', 'sales.read', 'reports.read',
  ],
}

// Hace las veces de la cookie de sesión: los otros mocks preguntan aquí qué puede el usuario actual
let rolActual = 'R0'

export function tienePermiso(permiso) {
  return PERMISOS_POR_ROL[rolActual].includes(permiso)
}

export function obtenerSesion(rol = rolActual) {
  rolActual = rol
  const sesion = {
    usuario: { nombre: 'Usuario de prueba' },
    rol,
    permisos: PERMISOS_POR_ROL[rol],
  }
  // Pequeña espera para que se note el estado de carga, como con un servidor real
  return new Promise((resolver) => setTimeout(() => resolver(sesion), 300))
}
