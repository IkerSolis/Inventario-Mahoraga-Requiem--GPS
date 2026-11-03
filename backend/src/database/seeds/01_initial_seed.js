const bcrypt = require('bcryptjs');

/**
 * Semilla Inicial: Catálogo de 30 permisos, 8 roles predeterminados (R0 a R7),
 * negocio inicial, sucursal, almacén, configuración y usuario propietario (R0).
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function (knex) {
  // Limpiar tablas dependientes en orden
  await knex('user_favorite_widgets').del();
  await knex('dashboard_widgets').del();
  await knex('dashboards').del();
  await knex('audit_logs').del();
  await knex('password_reset_tokens').del();
  await knex('password_history').del();
  await knex('user_sessions').del();
  await knex('user_scopes').del();
  await knex('user_roles').del();
  await knex('users').del();
  await knex('role_permissions').del();
  await knex('roles').del();
  await knex('permissions').del();
  await knex('company_settings').del();
  await knex('warehouses').del();
  await knex('branches').del();
  await knex('businesses').del();

  const businessId = 'b0000000-0000-0000-0000-000000000001';
  const branchId = 'br000000-0000-0000-0000-000000000001';
  const warehouseId = 'wh000000-0000-0000-0000-000000000001';
  const ownerUserId = 'u0000000-0000-0000-0000-000000000001';

  // 1. Insertar Negocio Principal
  await knex('businesses').insert({
    id: businessId,
    name: 'Mahoraga Central',
    legal_name: 'Inventarios Mahoraga S.A. de C.V.',
    tax_id: 'MAH260101XYZ',
    phone: '+52 55 1234 5678',
    email: 'contacto@mahoraga.local',
    address: 'Av. Tecnológico #100, CDMX, México',
    logo_url: null,
    approval_limits_json: JSON.stringify({
      max_unapproved_adjustment_amount: 5000,
      max_unapproved_adjustment_qty: 20
    })
  });

  // 2. Insertar Sucursal y Almacén iniciales
  await knex('branches').insert({
    id: branchId,
    business_id: businessId,
    code: 'MAT-01',
    name: 'Sucursal Matriz CDMX',
    address: 'Av. Tecnológico #100, CDMX',
    is_active: true
  });

  await knex('warehouses').insert({
    id: warehouseId,
    business_id: businessId,
    branch_id: branchId,
    code: 'ALM-GEN',
    name: 'Almacén General Central',
    is_active: true
  });

  // 3. Insertar Configuración de la Empresa (Tokens de diseño OmniStock Pulse)
  await knex('company_settings').insert({
    id: 'cs000000-0000-0000-0000-000000000001',
    business_id: businessId,
    theme_tokens_json: JSON.stringify({
      colorPrimary: '#4F46E5',
      colorBg: '#F8FAFC',
      colorSurface: '#FFFFFF',
      colorSuccess: '#10B981',
      colorWarning: '#F59E0B',
      colorDanger: '#EF4444',
      borderRadius: '8px',
      tableDensity: 'compact'
    }),
    regional_settings_json: JSON.stringify({
      locale: 'es-MX',
      currency: 'MXN',
      currencySymbol: '$',
      dateFormat: 'DD/MM/YYYY',
      timezone: 'America/Mexico_City'
    }),
    notification_settings_json: JSON.stringify({
      lowStockAlert: true,
      pendingApprovalAlert: true,
      dailySummaryEmail: false
    }),
    smtp_settings_json: JSON.stringify({
      host: 'smtp.mailtrap.io',
      port: 2525,
      from: '"Inventarios Mahoraga" <soporte@mahoraga.local>'
    })
  });

  // 4. Catálogo oficial de 30 permisos atómicos
  const permissionsList = [
    // Módulo Usuarios (5)
    {
      id: 'p01',
      code: 'users.read',
      module: 'users',
      description: 'Consultar directorio de usuarios y perfiles',
      is_critical: false
    },
    {
      id: 'p02',
      code: 'users.create',
      module: 'users',
      description: 'Crear e invitar nuevos usuarios',
      is_critical: false
    },
    {
      id: 'p03',
      code: 'users.update',
      module: 'users',
      description: 'Editar datos de usuarios y perfiles',
      is_critical: false
    },
    {
      id: 'p04',
      code: 'users.disable',
      module: 'users',
      description: 'Activar y desactivar usuarios del sistema',
      is_critical: true
    },
    {
      id: 'p05',
      code: 'users.assign_roles',
      module: 'users',
      description: 'Asignar roles y alcances de sucursal/almacén',
      is_critical: true
    },

    // Módulo Roles (2)
    {
      id: 'p06',
      code: 'roles.read',
      module: 'roles',
      description: 'Consultar catálogo de roles y permisos',
      is_critical: false
    },
    {
      id: 'p07',
      code: 'roles.manage',
      module: 'roles',
      description: 'Crear, editar y asignar matriz de permisos a roles',
      is_critical: true
    },

    // Módulo Configuración y Sucursales (2)
    {
      id: 'p08',
      code: 'settings.manage',
      module: 'settings',
      description: 'Modificar configuración global, temas y parámetros',
      is_critical: true
    },
    {
      id: 'p09',
      code: 'locations.manage',
      module: 'locations',
      description: 'Administrar sucursales y almacenes',
      is_critical: true
    },

    // Módulo Productos y Categorías (4)
    {
      id: 'p10',
      code: 'products.read',
      module: 'products',
      description: 'Consultar catálogo de productos y categorías',
      is_critical: false
    },
    {
      id: 'p11',
      code: 'products.create',
      module: 'products',
      description: 'Registrar nuevos productos y categorías',
      is_critical: false
    },
    {
      id: 'p12',
      code: 'products.update',
      module: 'products',
      description: 'Editar productos, códigos de barras y categorías',
      is_critical: false
    },
    {
      id: 'p13',
      code: 'products.archive',
      module: 'products',
      description: 'Archivar productos sin borrar historial',
      is_critical: true
    },

    // Módulo Inventario / Existencias (5)
    {
      id: 'p14',
      code: 'stock.read',
      module: 'stock',
      description: 'Consultar existencias y niveles de stock',
      is_critical: false
    },
    {
      id: 'p15',
      code: 'stock.receive',
      module: 'stock',
      description: 'Registrar entradas de mercancía y recepciones',
      is_critical: false
    },
    {
      id: 'p16',
      code: 'stock.issue',
      module: 'stock',
      description: 'Registrar salidas y despachos de almacén',
      is_critical: false
    },
    {
      id: 'p17',
      code: 'stock.transfer',
      module: 'stock',
      description: 'Registrar transferencias entre sucursales o almacenes',
      is_critical: false
    },
    {
      id: 'p18',
      code: 'stock.count',
      module: 'stock',
      description: 'Realizar conteos físicos e inventarios cíclicos',
      is_critical: false
    },

    // Módulo Ajustes de Stock (2)
    {
      id: 'p19',
      code: 'stock.adjust.request',
      module: 'stock_adjust',
      description: 'Solicitar ajuste de stock con motivo y evidencia',
      is_critical: false
    },
    {
      id: 'p20',
      code: 'stock.adjust.approve',
      module: 'stock_adjust',
      description: 'Aprobar o rechazar ajustes de inventario',
      is_critical: true
    },

    // Módulo Compras y Ventas (5)
    {
      id: 'p21',
      code: 'purchases.read',
      module: 'purchases',
      description: 'Consultar órdenes de compra y proveedores',
      is_critical: false
    },
    {
      id: 'p22',
      code: 'purchases.create',
      module: 'purchases',
      description: 'Crear órdenes de compra',
      is_critical: false
    },
    {
      id: 'p23',
      code: 'purchases.approve',
      module: 'purchases',
      description: 'Aprobar órdenes de compra según límites',
      is_critical: true
    },
    {
      id: 'p24',
      code: 'sales.read',
      module: 'sales',
      description: 'Consultar pedidos y ventas',
      is_critical: false
    },
    {
      id: 'p25',
      code: 'sales.create',
      module: 'sales',
      description: 'Registrar pedidos y salidas vinculadas a ventas',
      is_critical: false
    },

    // Módulo Costos y Precios (2)
    {
      id: 'p26',
      code: 'costs.read',
      module: 'costs_prices',
      description: 'Visualizar costos de compra, valuación y kárdex contable',
      is_critical: true
    },
    {
      id: 'p27',
      code: 'prices.manage',
      module: 'costs_prices',
      description: 'Modificar precios de venta (PVP)',
      is_critical: true
    },

    // Módulo Reportes y Auditoría (3)
    {
      id: 'p28',
      code: 'reports.read',
      module: 'reports_audit',
      description: 'Consultar reportes e indicadores',
      is_critical: false
    },
    {
      id: 'p29',
      code: 'reports.export',
      module: 'reports_audit',
      description: 'Exportar reportes a Excel/CSV/PDF',
      is_critical: false
    },
    {
      id: 'p30',
      code: 'audit.read',
      module: 'reports_audit',
      description: 'Consultar bitácora de auditoría y sesiones',
      is_critical: true
    }
  ];

  await knex('permissions').insert(permissionsList);

  // 5. Los 8 Roles predeterminados (R0 a R7)
  const rolesList = [
    {
      id: 'r0-owner',
      business_id: businessId,
      code: 'owner',
      name: 'Propietario / Dueño',
      description: 'Control total de la empresa y configuración. Acceso completo e inmutable.',
      is_default: true,
      is_protected: true
    },
    {
      id: 'r1-system-admin',
      business_id: businessId,
      code: 'system_admin',
      name: 'Administrador del sistema',
      description: 'Administra usuarios, roles, catálogos, sucursales, parámetros y reportes.',
      is_default: true,
      is_protected: false
    },
    {
      id: 'r2-inventory-manager',
      business_id: businessId,
      code: 'inventory_manager',
      name: 'Gerente de inventario / Operaciones',
      description: 'Supervisa stock, almacenes, movimientos, conteos, ajustes y reportes.',
      is_default: true,
      is_protected: false
    },
    {
      id: 'r3-warehouse-supervisor',
      business_id: businessId,
      code: 'warehouse_supervisor',
      name: 'Supervisor de almacén',
      description: 'Supervisa operaciones diarias de almacén, valida conteos y recepciones.',
      is_default: true,
      is_protected: false
    },
    {
      id: 'r4-warehouse-operator',
      business_id: businessId,
      code: 'warehouse_operator',
      name: 'Almacenista / Operador',
      description:
        'Registra entradas, salidas, transferencias y conteos físicos. Solicita ajustes.',
      is_default: true,
      is_protected: false
    },
    {
      id: 'r5-purchasing',
      business_id: businessId,
      code: 'purchasing',
      name: 'Compras',
      description: 'Gestiona proveedores y órdenes de compra. Consulta catálogo y existencias.',
      is_default: true,
      is_protected: false
    },
    {
      id: 'r6-sales',
      business_id: businessId,
      code: 'sales',
      name: 'Ventas / Mostrador',
      description: 'Consulta productos y existencias. Registra salidas de ventas.',
      is_default: true,
      is_protected: false
    },
    {
      id: 'r7-auditor',
      business_id: businessId,
      code: 'auditor',
      name: 'Auditor / Consulta',
      description: 'Estricto acceso de solo lectura a inventarios, kárdex, auditoría y reportes.',
      is_default: true,
      is_protected: false
    }
  ];

  await knex('roles').insert(rolesList);

  // 6. Asignar matriz de permisos a roles (Matriz oficial de Jerarquía)
  const rolePermissionsMap = {
    // R0 (Owner): Todos los 30 permisos
    'r0-owner': permissionsList.map((p) => p.id),

    // R1 (System Admin): Todos excepto eliminar R0 y temas protegidos
    'r1-system-admin': permissionsList.map((p) => p.id),

    // R2 (Gerente de inventario): Operaciones, existencias, ajustes con aprobación, reportes, kárdex
    'r2-inventory-manager': [
      'p01', // users.read
      'p06', // roles.read
      'p10',
      'p11',
      'p12',
      'p13', // products.*
      'p14',
      'p15',
      'p16',
      'p17',
      'p18', // stock.*
      'p19',
      'p20', // stock.adjust.*
      'p21',
      'p22',
      'p23', // purchases.*
      'p24', // sales.read
      'p26', // costs.read
      'p28',
      'p29',
      'p30' // reports.* & audit.read
    ],

    // R3 (Supervisor de almacén):
    'r3-warehouse-supervisor': [
      'p10',
      'p11',
      'p12', // products.read, create, update
      'p14',
      'p15',
      'p16',
      'p17',
      'p18', // stock.*
      'p19',
      'p20', // stock.adjust.request & approve (hasta cierto límite)
      'p24', // sales.read
      'p28',
      'p29' // reports.read, export
    ],

    // R4 (Almacenista / Operador):
    'r4-warehouse-operator': [
      'p10', // products.read
      'p14',
      'p15',
      'p16',
      'p17',
      'p18', // stock.read, receive, issue, transfer, count
      'p19' // stock.adjust.request (SOLO solicita, nunca aprueba)
    ],

    // R5 (Compras):
    'r5-purchasing': [
      'p10', // products.read
      'p14', // stock.read
      'p15', // stock.receive (opcional de recepción)
      'p21',
      'p22', // purchases.read, create
      'p26', // costs.read
      'p28' // reports.read
    ],

    // R6 (Ventas):
    'r6-sales': [
      'p10', // products.read
      'p14', // stock.read
      'p24',
      'p25', // sales.read, create
      'p27', // prices.manage
      'p28' // reports.read
    ],

    // R7 (Auditor): Solo lectura estricta
    'r7-auditor': [
      'p01', // users.read
      'p06', // roles.read
      'p10', // products.read
      'p14', // stock.read
      'p21', // purchases.read
      'p24', // sales.read
      'p26', // costs.read
      'p28', // reports.read
      'p30' // audit.read
    ]
  };

  const rolePermissionsRows = [];
  let rpCounter = 1;
  for (const [roleId, permIds] of Object.entries(rolePermissionsMap)) {
    for (const permId of permIds) {
      rolePermissionsRows.push({
        id: `rp-${rpCounter++}`,
        role_id: roleId,
        permission_id: permId,
        approval_limit_amount:
          roleId === 'r3-warehouse-supervisor'
            ? 2500
            : roleId === 'r2-inventory-manager'
              ? 10000
              : null,
        approval_limit_qty:
          roleId === 'r3-warehouse-supervisor' ? 10 : roleId === 'r2-inventory-manager' ? 50 : null,
        requires_second_approver: roleId === 'r3-warehouse-supervisor'
      });
    }
  }

  await knex('role_permissions').insert(rolePermissionsRows);

  // 7. Insertar Usuario Propietario Inicial (R0)
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('Admin123*', salt);

  await knex('users').insert({
    id: ownerUserId,
    business_id: businessId,
    name: 'Dueño Propietario',
    email: 'owner@mahoraga.local',
    password_hash: passwordHash,
    status: 'active',
    avatar_url: null,
    is_owner: true,
    failed_login_attempts: 0,
    created_at: new Date(),
    updated_at: new Date()
  });

  // Vincular R0 al Propietario
  await knex('user_roles').insert({
    id: 'ur000000-0000-0000-0000-000000000001',
    user_id: ownerUserId,
    role_id: 'r0-owner'
  });

  // Historial de contraseñas inicial
  await knex('password_history').insert({
    id: 'ph000000-0000-0000-0000-000000000001',
    user_id: ownerUserId,
    password_hash: passwordHash
  });

  // 8. Crear Dashboard inicial predeterminado con widgets del Grid OmniStock Pulse
  const dashboardId = 'dash0000-0000-0000-0000-000000000001';
  await knex('dashboards').insert({
    id: dashboardId,
    business_id: businessId,
    user_id: ownerUserId,
    name: 'Resumen Operativo Central',
    is_default: true,
    is_shared: true,
    shared_scope: 'business'
  });

  await knex('dashboard_widgets').insert([
    {
      id: 'dw000000-0000-0000-0000-000000000001',
      dashboard_id: dashboardId,
      widget_type: 'kpi_total_products',
      title: 'Total de Productos',
      config_json: JSON.stringify({ refreshIntervalSec: 60 }),
      pos_x: 0,
      pos_y: 0,
      width: 1,
      height: 1,
      sort_order: 1,
      is_favorite: true
    },
    {
      id: 'dw000000-0000-0000-0000-000000000002',
      dashboard_id: dashboardId,
      widget_type: 'kpi_low_stock',
      title: 'Alertas de Stock Bajo',
      config_json: JSON.stringify({ severity: 'warning' }),
      pos_x: 1,
      pos_y: 0,
      width: 1,
      height: 1,
      sort_order: 2,
      is_favorite: true
    },
    {
      id: 'dw000000-0000-0000-0000-000000000003',
      dashboard_id: dashboardId,
      widget_type: 'chart_inventory_valuation',
      title: 'Valuación de Inventario',
      config_json: JSON.stringify({ chartType: 'bar', period: 'monthly' }),
      pos_x: 0,
      pos_y: 1,
      width: 2,
      height: 2,
      sort_order: 3,
      is_favorite: false
    }
  ]);

  // Auditoría inicial
  await knex('audit_logs').insert({
    id: 'al000000-0000-0000-0000-000000000001',
    business_id: businessId,
    user_id: ownerUserId,
    action: 'system.initial_seed',
    entity_type: 'system',
    entity_id: businessId,
    new_values_json: JSON.stringify({
      message: 'Semilla inicial de sistema completada exitosamente'
    }),
    ip_address: '127.0.0.1',
    user_agent: 'Knex Seeder'
  });
};
