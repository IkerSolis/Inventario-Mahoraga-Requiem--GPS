import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  LayoutGrid,
  Package,
  AlertTriangle,
  BarChart3,
  Activity,
  ArrowLeftRight,
  FileSpreadsheet,
  Sparkles,
  Search,
  Plus,
  Copy,
  Share2,
  Trash2,
  RotateCcw,
  Star,
  GripVertical,
  Maximize2,
  CheckCircle2,
  Clock,
  ShieldAlert,
  QrCode,
  Download,
  SlidersHorizontal,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  Building2,
  MapPin,
  UserCheck,
  Terminal,
  Eye,
  X,
  Check,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  Filter,
  MoveLeft,
  MoveRight,
  Lock,
  Unlock,
  RefreshCw,
  Boxes,
  ThermometerSnowflake,
  Smartphone,
  Utensils,
  Wrench
} from 'lucide-react';

// ============================================================================
// 1. CATÁLOGO MULTI-NEGOCIO (business_id) Y JERARQUÍA DE ROLES (R0 - R7)
// ============================================================================

const BUSINESS_TENANTS = [
  {
    id: 'biz-moda-01',
    name: 'Moda Urbana — Sucursal Central',
    industry: 'Retail & Moda',
    currency: 'MXN',
    badge: 'Retail & Apparel',
    primaryAccent: '#4F46E5',
    kpiValuation: 142850,
    totalUnits: 14820,
    aislesCount: 42,
    weeklyRotation: 94.1,
    fifoMargin: 42.8
  },
  {
    id: 'biz-ferre-02',
    name: 'Ferretería Industrial GARCO',
    industry: 'Ferretería & Maquinaria',
    currency: 'MXN',
    badge: 'Industrial & Tools',
    primaryAccent: '#0284C7',
    kpiValuation: 894200,
    totalUnits: 64310,
    aislesCount: 86,
    weeklyRotation: 88.4,
    fifoMargin: 36.5
  },
  {
    id: 'biz-rest-03',
    name: 'Restaurante Oishii Izakaya',
    industry: 'Restaurantes & Alimentos',
    currency: 'MXN',
    badge: 'Food & Perecederos FIFO',
    primaryAccent: '#D97706',
    kpiValuation: 68400,
    totalUnits: 3490,
    aislesCount: 12,
    weeklyRotation: 97.6,
    fifoMargin: 61.2
  },
  {
    id: 'biz-farma-04',
    name: 'Farmacia San Miguel',
    industry: 'Farmacia & Salud',
    currency: 'MXN',
    badge: 'Health & Lotes COFEPRIS',
    primaryAccent: '#059669',
    kpiValuation: 319500,
    totalUnits: 22150,
    aislesCount: 28,
    weeklyRotation: 91.8,
    fifoMargin: 48.0
  }
];

const BRANCH_NODES = [
  { id: 'br-cdmx-04', name: 'CDMX Norte - Hub #04', latency: '14ms' },
  { id: 'br-mor-01', name: 'Morelia Centro - Bodega #01', latency: '11ms' },
  { id: 'br-sur-02', name: 'Hub Sur - Logística Express', latency: '19ms' }
];

// Jerarquía predeterminada de roles según documento oficial de permisos
const ROLES_CATALOG = {
  R0: {
    code: 'owner',
    label: 'R0 · Propietario / Dueño',
    shortLabel: 'R0 · Dueño',
    description: 'Control total del negocio y configuración; acceso a costos, aprobaciones y exportación.',
    permissions: [
      'users.read', 'users.create', 'users.update', 'users.disable', 'users.assign_roles',
      'roles.read', 'roles.manage', 'settings.manage', 'locations.manage',
      'products.read', 'products.create', 'products.update', 'products.archive',
      'stock.read', 'stock.receive', 'stock.issue', 'stock.transfer', 'stock.count',
      'stock.adjust.request', 'stock.adjust.approve',
      'costs.read', 'prices.manage', 'reports.read', 'reports.export', 'audit.read'
    ]
  },
  R2: {
    code: 'inventory_manager',
    label: 'R2 · Gerente de Inventario',
    shortLabel: 'R2 · Gerente',
    description: 'Supervisa almacenes, movimientos y reportes; aprueba ajustes y visualiza costos autorizados.',
    permissions: [
      'products.read', 'products.create', 'products.update',
      'stock.read', 'stock.receive', 'stock.issue', 'stock.transfer', 'stock.count',
      'stock.adjust.request', 'stock.adjust.approve',
      'costs.read', 'reports.read', 'reports.export', 'audit.read'
    ]
  },
  R4: {
    code: 'warehouse_operator',
    label: 'R4 · Almacenista / Operador',
    shortLabel: 'R4 · Almacenista',
    description: 'Registra entradas, salidas, transferencias y conteos. Solicita ajustes (no aprueba ni ve costos internos).',
    permissions: [
      'products.read',
      'stock.read', 'stock.receive', 'stock.issue', 'stock.transfer', 'stock.count',
      'stock.adjust.request', 'reports.read'
    ]
  },
  R7: {
    code: 'auditor',
    label: 'R7 · Auditor / Consulta',
    shortLabel: 'R7 · Auditor',
    description: 'Acceso estricto de solo lectura a inventario, movimientos, kárdex y auditoría. Sin crear ni aprobar.',
    permissions: [
      'users.read', 'roles.read', 'products.read', 'stock.read', 'reports.read', 'audit.read'
    ]
  }
};

// ============================================================================
// 2. CATÁLOGO DE LA BIBLIOTECA DE WIDGETS (8 CORE + 4 ESPECIALIZADOS)
// ============================================================================

const WIDGET_LIBRARY_CATALOG = [
  {
    id: 'widget-kpis',
    type: 'kpis',
    title: 'Pulso de KPIs & Valoración',
    subtitle: 'Métricas clave con números tabulares',
    category: 'Finanzas & Costos',
    industries: ['Todos', 'Retail & Moda', 'Ferretería & Maquinaria', 'Restaurantes & Alimentos', 'Farmacia & Salud', 'Finanzas & Costos'],
    defaultSize: '4x1',
    slotsCost: 2,
    requiredPermission: 'stock.read',
    description: 'Muestra en tiempo real Valor Total del Inventario (protegido por costs.read), Rotación Semanal, Unidades Físicas y SKUs en Riesgo Crítico.'
  },
  {
    id: 'widget-inventario',
    type: 'inventario',
    title: 'Matriz de Variantes & Lotes FIFO',
    subtitle: 'Talla/Color + Caducidades por lote',
    category: 'Retail & Moda',
    industries: ['Todos', 'Retail & Moda', 'Restaurantes & Alimentos', 'Farmacia & Salud'],
    defaultSize: '2x2',
    slotsCost: 2,
    requiredPermission: 'stock.read',
    description: 'Conmutador interactivo entre matriz bidimensional de variantes (Talla/Color) y semáforo FIFO de caducidades (< 5 días, 15 días, 60 días).'
  },
  {
    id: 'widget-alertas',
    type: 'alertas',
    title: 'Alertas Críticas de Quiebre (< 24h)',
    subtitle: 'Reposición PO y transferencia urgente',
    category: 'Logística & E-commerce',
    industries: ['Todos', 'Retail & Moda', 'Logística & E-commerce', 'Ferretería & Maquinaria'],
    defaultSize: '2x2',
    slotsCost: 2,
    requiredPermission: 'stock.read',
    description: 'Detecta SKUs con velocidad de agotamiento menor a 24 horas y permite disparar órdenes de reposición (PO) o transferencias entre sucursales.'
  },
  {
    id: 'widget-productos',
    type: 'productos',
    title: 'Top Rotación & Salud de SKUs',
    subtitle: 'Estado calculado al vuelo vs. stock mínimo',
    category: 'Retail & Moda',
    industries: ['Todos', 'Retail & Moda', 'Ferretería & Maquinaria', 'Logística & E-commerce'],
    defaultSize: '2x1',
    slotsCost: 1,
    requiredPermission: 'products.read',
    description: 'Lista de productos de mayor movimiento donde el estado (Óptimo, Stock Bajo, Crítico) se calcula dinámicamente comparando cantidad contra stock mínimo.'
  },
  {
    id: 'widget-graficas',
    type: 'graficas',
    title: 'Flujo Entradas/Salidas & Margen FIFO',
    subtitle: 'Analítica visual y valoración ponderada',
    category: 'Finanzas & Costos',
    industries: ['Todos', 'Finanzas & Costos', 'Retail & Moda', 'Logística & E-commerce'],
    defaultSize: '2x1',
    slotsCost: 1,
    requiredPermission: 'reports.read',
    description: 'Gráfica comparativa de recepciones vs. despachos diarios con tarjeta integrada de Margen Bruto y Costo Ponderado FIFO.'
  },
  {
    id: 'widget-actividad',
    type: 'actividad',
    title: 'Telemetría de Escáner & Actividad',
    subtitle: 'Lecturas EAN-13, seriales IMEI y auditoría',
    category: 'Logística & E-commerce',
    industries: ['Todos', 'Logística & E-commerce', 'Ferretería & Maquinaria', 'Farmacia & Salud'],
    defaultSize: '2x1',
    slotsCost: 1,
    requiredPermission: 'stock.read',
    description: 'Monitorea en vivo la estación de escáner láser USB HID (EAN-13/QR), velocidad de bultos por hora, validación de IMEI y bitácora operativa.'
  },
  {
    id: 'widget-movimientos',
    type: 'movimientos',
    title: 'Movimientos & Aprobación de Ajustes',
    subtitle: 'Separación de funciones R4 -> R2/R0',
    category: 'Logística & E-commerce',
    industries: ['Todos', 'Logística & E-commerce', 'Ferretería & Maquinaria', 'Restaurantes & Alimentos'],
    defaultSize: '2x1',
    slotsCost: 1,
    requiredPermission: 'stock.read',
    description: 'Controla entradas (#OC), transferencias en tránsito y solicitudes de ajuste de inventario con validación estricta del permiso stock.adjust.approve.'
  },
  {
    id: 'widget-reportes',
    type: 'reportes',
    title: 'Centro Rápido de Reportes Exportables',
    subtitle: 'Generación auditada en PDF, Excel y CSV',
    category: 'Finanzas & Costos',
    industries: ['Todos', 'Finanzas & Costos', 'Farmacia & Salud', 'Retail & Moda'],
    defaultSize: '2x1',
    slotsCost: 1,
    requiredPermission: 'reports.read',
    description: 'Descarga directa de reportes de Inventario, Kardex, Stock Bajo y Más Vendidos en PDF, Excel (.xlsx) y CSV registrando el actor en auditoría.'
  },
  {
    id: 'widget-cadena-frio',
    type: 'cadena-frio',
    title: 'Monitor de Cadena de Frío & Cámaras',
    subtitle: 'Sensores térmicos en tiempo real (°C)',
    category: 'Farmacia & Salud',
    industries: ['Todos', 'Farmacia & Salud', 'Restaurantes & Alimentos'],
    defaultSize: '1x1',
    slotsCost: 1,
    requiredPermission: 'stock.read',
    description: 'Supervisa la temperatura de refrigeradores biológicos y cámaras frigoríficas de alimentos para prevenir mermas por ruptura térmica.'
  },
  {
    id: 'widget-seriales-imei',
    type: 'seriales-imei',
    title: 'Trazabilidad de Series & Garantías',
    subtitle: 'Rastreo unitario de equipos y herramientas',
    category: 'Ferretería & Maquinaria',
    industries: ['Todos', 'Ferretería & Maquinaria', 'Logística & E-commerce'],
    defaultSize: '1x1',
    slotsCost: 1,
    requiredPermission: 'stock.read',
    description: 'Verifica números de serie únicos, asignaciones de maquinaria y estado de RMA/garantías sin duplicidad.'
  }
];

// ============================================================================
// 3. PRESETS PREDETERMINADOS DE DASHBOARD
// ============================================================================

const INITIAL_DASHBOARD_PRESETS = [
  {
    id: 'preset-general',
    name: 'Operación General (OmniStock)',
    isDefault: true,
    isShared: true,
    sharedScope: 'Toda la Sucursal',
    widgets: [
      { id: 'widget-kpis', size: '4x1', pos_x: 0, pos_y: 0, width: 4, height: 1, sort_order: 1, is_favorite: true },
      { id: 'widget-inventario', size: '2x2', pos_x: 0, pos_y: 1, width: 2, height: 2, sort_order: 2, is_favorite: true },
      { id: 'widget-alertas', size: '2x2', pos_x: 2, pos_y: 1, width: 2, height: 2, sort_order: 3, is_favorite: true },
      { id: 'widget-productos', size: '2x1', pos_x: 0, pos_y: 3, width: 2, height: 1, sort_order: 4, is_favorite: false },
      { id: 'widget-graficas', size: '2x1', pos_x: 2, pos_y: 3, width: 2, height: 1, sort_order: 5, is_favorite: true },
      { id: 'widget-actividad', size: '2x1', pos_x: 0, pos_y: 4, width: 2, height: 1, sort_order: 6, is_favorite: false },
      { id: 'widget-movimientos', size: '2x1', pos_x: 2, pos_y: 4, width: 2, height: 1, sort_order: 7, is_favorite: true },
      { id: 'widget-reportes', size: '4x1', pos_x: 0, pos_y: 5, width: 4, height: 1, sort_order: 8, is_favorite: false }
    ]
  },
  {
    id: 'preset-fifo',
    name: 'Control de Lotes, Escáner & FIFO',
    isDefault: false,
    isShared: true,
    sharedScope: 'Almacén y Supervisores',
    widgets: [
      { id: 'widget-alertas', size: '2x2', pos_x: 0, pos_y: 0, width: 2, height: 2, sort_order: 1, is_favorite: true },
      { id: 'widget-inventario', size: '2x2', pos_x: 2, pos_y: 0, width: 2, height: 2, sort_order: 2, is_favorite: true },
      { id: 'widget-actividad', size: '2x1', pos_x: 0, pos_y: 2, width: 2, height: 1, sort_order: 3, is_favorite: true },
      { id: 'widget-movimientos', size: '2x1', pos_x: 2, pos_y: 2, width: 2, height: 1, sort_order: 4, is_favorite: true },
      { id: 'widget-cadena-frio', size: '1x1', pos_x: 0, pos_y: 3, width: 1, height: 1, sort_order: 5, is_favorite: false },
      { id: 'widget-seriales-imei', size: '1x1', pos_x: 1, pos_y: 3, width: 1, height: 1, sort_order: 6, is_favorite: false },
      { id: 'widget-productos', size: '2x1', pos_x: 2, pos_y: 3, width: 2, height: 1, sort_order: 7, is_favorite: false }
    ]
  },
  {
    id: 'preset-direccion',
    name: 'Dirección, Costos & Auditoría',
    isDefault: false,
    isShared: false,
    sharedScope: 'Solo Propietario y Gerencia',
    widgets: [
      { id: 'widget-kpis', size: '4x1', pos_x: 0, pos_y: 0, width: 4, height: 1, sort_order: 1, is_favorite: true },
      { id: 'widget-graficas', size: '2x1', pos_x: 0, pos_y: 1, width: 2, height: 1, sort_order: 2, is_favorite: true },
      { id: 'widget-reportes', size: '2x1', pos_x: 2, pos_y: 1, width: 2, height: 1, sort_order: 3, is_favorite: true },
      { id: 'widget-movimientos', size: '2x1', pos_x: 0, pos_y: 2, width: 2, height: 1, sort_order: 4, is_favorite: false },
      { id: 'widget-productos', size: '2x1', pos_x: 2, pos_y: 2, width: 2, height: 1, sort_order: 5, is_favorite: false }
    ]
  }
];

// ============================================================================
// 4. DATOS OPERATIVOS INICIALES PARA LOS WIDGETS
// ============================================================================

const INITIAL_CRITICAL_ALERTS = [
  {
    id: 'al-1',
    sku: 'SKU-HD-9021',
    name: 'Sudadera Oversize Noir (Talla M)',
    remaining: 2,
    minStock: 15,
    depletionTime: '4h est.',
    supplierPO: '#OC-8841',
    sourceBranch: 'Hub Sur',
    status: 'pending'
  },
  {
    id: 'al-2',
    sku: 'SKU-SNK-4410',
    name: 'Sneaker Runner Cloud (Talla 42)',
    remaining: 1,
    minStock: 10,
    depletionTime: '1.5h est.',
    supplierPO: '#OC-8842',
    sourceBranch: 'Morelia Centro',
    status: 'pending'
  },
  {
    id: 'al-3',
    sku: 'SKU-JK-0038',
    name: 'Chaqueta Denim Vintage (Talla L)',
    remaining: 4,
    minStock: 12,
    depletionTime: '11h est.',
    supplierPO: '#OC-8845',
    sourceBranch: 'Hub Sur',
    status: 'pending'
  },
  {
    id: 'al-4',
    sku: 'SKU-ACC-1102',
    name: 'Bolso Crossbody Minimal Negro',
    remaining: 3,
    minStock: 10,
    depletionTime: '18h est.',
    supplierPO: '#OC-8849',
    sourceBranch: 'Morelia Centro',
    status: 'pending'
  }
];

const INITIAL_PRODUCTS_ROTATION = [
  { id: 'p-1', sku: 'MOD-8821', ean: '7501044982134', name: 'Camiseta Heavyweight Cotton 280g', physicalQty: 142, reservedQty: 18, minStock: 40, unitCost: 185, salePrice: 449, weeklySales: 89 },
  { id: 'p-2', sku: 'MOD-7740', ean: '7501044981199', name: 'Pantalón Cargo Ripstop Olive', physicalQty: 26, reservedQty: 8, minStock: 30, unitCost: 340, salePrice: 799, weeklySales: 64 },
  { id: 'p-3', sku: 'MOD-9021', ean: '7501044980048', name: 'Sudadera Oversize Noir M', physicalQty: 2, reservedQty: 1, minStock: 15, unitCost: 410, salePrice: 950, weeklySales: 58 },
  { id: 'p-4', sku: 'MOD-3319', ean: '7501044987726', name: 'Gorra Structured Twill Indigo', physicalQty: 84, reservedQty: 4, minStock: 25, unitCost: 110, salePrice: 299, weeklySales: 47 }
];

const INITIAL_MOVEMENTS = [
  {
    id: 'mov-101',
    type: 'ADJUST_REQUEST',
    code: '#AJ-0912',
    sku: 'MOD-7740',
    product: 'Pantalón Cargo Ripstop Olive',
    qtyDelta: -3,
    reason: 'Conteo cíclico: 3 prendas con costura dañada en Pasillo 2 - Rack B',
    requestedBy: 'Luis Mendoza (R4 · Almacenista)',
    timestamp: 'Hace 6 min',
    status: 'PENDING_APPROVAL'
  },
  {
    id: 'mov-102',
    type: 'RECEIVE',
    code: '#OC-4491',
    sku: 'MOD-8821',
    product: 'Camiseta Heavyweight Cotton 280g',
    qtyDelta: +120,
    reason: 'Recepción verificada con escáner láser en anden #02',
    requestedBy: 'Ana Torres (R3 · Supervisor)',
    timestamp: 'Hace 22 min',
    status: 'CONFIRMED'
  },
  {
    id: 'mov-103',
    type: 'TRANSFER',
    code: '#TR-308',
    sku: 'MOD-3319',
    product: 'Gorra Structured Twill Indigo',
    qtyDelta: -25,
    reason: 'Transferencia en tránsito: CDMX Norte -> Morelia Centro',
    requestedBy: 'Carlos Rivera (R0 · Dueño)',
    timestamp: 'Hace 48 min',
    status: 'IN_TRANSIT'
  },
  {
    id: 'mov-104',
    type: 'ADJUST_REQUEST',
    code: '#AJ-0915',
    sku: 'MOD-8821',
    product: 'Camiseta Heavyweight Cotton 280g',
    qtyDelta: +5,
    reason: 'Hallazgo de caja sellada en Zona Overflow',
    requestedBy: 'Pedro Soto (R4 · Almacenista)',
    timestamp: 'Hace 1 hora',
    status: 'PENDING_APPROVAL'
  }
];

const VARIANT_MATRIX_DATA = [
  { color: 'Negro Onyx', hex: '#0F172A', S: { qty: 24, min: 10 }, M: { qty: 2, min: 15 }, L: { qty: 18, min: 12 }, XL: { qty: 9, min: 10 } },
  { color: 'Blanco Puro', hex: '#F8FAFC', S: { qty: 31, min: 10 }, M: { qty: 45, min: 15 }, L: { qty: 11, min: 12 }, XL: { qty: 0, min: 8 } },
  { color: 'Gris Carbón', hex: '#475569', S: { qty: 14, min: 10 }, M: { qty: 19, min: 15 }, L: { qty: 27, min: 12 }, XL: { qty: 15, min: 8 } },
  { color: 'Royal Indigo', hex: '#4F46E5', S: { qty: 8, min: 10 }, M: { qty: 22, min: 15 }, L: { qty: 3, min: 12 }, XL: { qty: 12, min: 8 } }
];

const FIFO_LOTS_DATA = [
  { lot: 'LOTE-2026-A8', sku: 'INS-9910', item: 'Insumo Perecedero / Lote Controlado A', units: 42, expiryDays: 4, rack: 'Cámara 01 - Gaveta A', status: 'CRITICAL' },
  { lot: 'LOTE-2026-B2', sku: 'INS-4421', item: 'Reactivo / Lote Rotación Media B', units: 128, expiryDays: 14, rack: 'Pasillo 03 - Rack C', status: 'WARNING' },
  { lot: 'LOTE-2026-C9', sku: 'INS-1088', item: 'Lote Estándar Empaque Sellado C', units: 890, expiryDays: 62, rack: 'Zona Pallet - Nivel 2', status: 'OPTIMAL' }
];

// Función pura de arquitectura: El estado del stock NUNCA se guarda estático, se calcula al vuelo
function computeStockStatus(physicalQty, minStock) {
  if (physicalQty <= 0 || physicalQty <= Math.floor(minStock * 0.25)) {
    return { code: 'CRITICAL', label: 'Crítico / Agotado', badgeClass: 'badge-critical' };
  }
  if (physicalQty <= minStock) {
    return { code: 'WARNING', label: 'Stock Bajo', badgeClass: 'badge-warning' };
  }
  return { code: 'OPTIMAL', label: 'Óptimo', badgeClass: 'badge-optimal' };
}

function sizeToDimensions(sizeStr) {
  switch (sizeStr) {
    case '1x1': return { width: 1, height: 1, colSpanClass: 'col-span-12 md:col-span-6 xl:col-span-3', rowSpanClass: 'row-span-1' };
    case '2x1': return { width: 2, height: 1, colSpanClass: 'col-span-12 xl:col-span-6', rowSpanClass: 'row-span-1' };
    case '2x2': return { width: 2, height: 2, colSpanClass: 'col-span-12 xl:col-span-6', rowSpanClass: 'row-span-2' };
    case '4x1': return { width: 4, height: 1, colSpanClass: 'col-span-12', rowSpanClass: 'row-span-1' };
    default: return { width: 2, height: 1, colSpanClass: 'col-span-12 xl:col-span-6', rowSpanClass: 'row-span-1' };
  }
}

// ============================================================================
// 5. COMPONENTE PRINCIPAL DE LA APLICACIÓN (FRONTEND 1)
// ============================================================================

export default function App() {
  // --- Estados Globales de Layout y Configuración ---
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeNav, setActiveNav] = useState('dashboard'); // 'dashboard' | 'library' | 'inspector'
  const [darkMode, setDarkMode] = useState(false);
  const [compactDensity, setCompactDensity] = useState(false);
  const [selectedBusinessId, setSelectedBusinessId] = useState(BUSINESS_TENANTS[0].id);
  const [selectedBranchId, setSelectedBranchId] = useState(BRANCH_NODES[0].id);
  const [activeRoleKey, setActiveRoleKey] = useState('R0'); // R0, R2, R4, R7

  // --- Estados del Motor de Dashboard y Persistencia ---
  const [presets, setPresets] = useState(() => {
    try {
      const saved = localStorage.getItem('mahoraga_omnistock_presets_v3');
      return saved ? JSON.parse(saved) : INITIAL_DASHBOARD_PRESETS;
    } catch {
      return INITIAL_DASHBOARD_PRESETS;
    }
  });
  const [activePresetId, setActivePresetId] = useState('preset-general');
  const [isEditMode, setIsEditMode] = useState(false);
  const [draggedWidgetId, setDraggedWidgetId] = useState(null);
  const [dragOverWidgetId, setDragOverWidgetId] = useState(null);

  // --- Estados de Modales y Paleta de Comandos ---
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
  const [previewWidgetModal, setPreviewWidgetModal] = useState(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [newDashboardModalOpen, setNewDashboardModalOpen] = useState(false);
  const [newDashboardName, setNewDashboardName] = useState('');
  const [toastMessage, setToastMessage] = useState(null);

  // --- Estados Internos de los 8 Widgets ---
  const [inventoryTab, setInventoryTab] = useState('matrix'); // 'matrix' | 'fifo'
  const [selectedMatrixCell, setSelectedMatrixCell] = useState(null);
  const [criticalAlerts, setCriticalAlerts] = useState(INITIAL_CRITICAL_ALERTS);
  const [chartTimeframe, setChartTimeframe] = useState('7d'); // '7d' | '30d'
  const [movementsList, setMovementsList] = useState(INITIAL_MOVEMENTS);
  const [scannerState, setScannerState] = useState({
    lastEan: '7501044982134',
    lastSku: 'MOD-8821',
    lastProduct: 'Camiseta Heavyweight Cotton 280g',
    bultosToday: 48,
    avgSpeed: '1.4s/ud',
    lastScanTime: 'Hace 12 seg'
  });
  const [activityFeed, setActivityFeed] = useState([
    { id: 'act-1', actor: 'Ana Torres (R3)', action: 'Conciliación FIFO completada en Pasillo 03', time: '14:20:11', type: 'optimal' },
    { id: 'act-2', actor: 'Láser USB HID #02', action: 'Lectura EAN-13 7501044982134 (+24 uds)', time: '14:18:45', type: 'info' },
    { id: 'act-3', actor: 'Luis Mendoza (R4)', action: 'Solicitó ajuste #AJ-0912 (-3 uds por daño)', time: '14:12:09', type: 'warning' }
  ]);

  // --- Estados de la Biblioteca de Widgets ---
  const [librarySearch, setLibrarySearch] = useState('');
  const [libraryIndustryFilter, setLibraryIndustryFilter] = useState('Todos');
  const [onlyFavoritesFilter, setOnlyFavoritesFilter] = useState(false);
  const [selectedInitialSizes, setSelectedInitialSizes] = useState({});

  // Persistencia automática en localStorage
  useEffect(() => {
    try {
      localStorage.setItem('mahoraga_omnistock_presets_v3', JSON.stringify(presets));
    } catch (e) {
      console.error('Error guardando layout en localStorage:', e);
    }
  }, [presets]);

  // Atajos de teclado globales (Ctrl+K, Esc, Alt+N)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setCommandPaletteOpen(false);
        setPreviewWidgetModal(null);
        setShareModalOpen(false);
        setNewDashboardModalOpen(false);
      } else if (e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setActiveNav('library');
        triggerToast('Biblioteca de Widgets abierta (Atajo Alt+N)', 'info');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Notificación Toast auxiliar
  const triggerToast = (msg, tone = 'optimal') => {
    setToastMessage({ msg, tone, id: Date.now() });
  };

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 3800);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // Datos derivados actuales
  const currentBusiness = useMemo(
    () => BUSINESS_TENANTS.find((b) => b.id === selectedBusinessId) || BUSINESS_TENANTS[0],
    [selectedBusinessId]
  );
  const currentBranch = useMemo(
    () => BRANCH_NODES.find((br) => br.id === selectedBranchId) || BRANCH_NODES[0],
    [selectedBranchId]
  );
  const currentRole = ROLES_CATALOG[activeRoleKey];

  const hasPermission = (permCode) => currentRole.permissions.includes(permCode);

  const activePreset = useMemo(
    () => presets.find((p) => p.id === activePresetId) || presets[0],
    [presets, activePresetId]
  );

  // Cálculo de ranuras ocupadas (máximo 16 slots según especificación de OmniStock Pulse)
  const usedSlotsCount = useMemo(() => {
    return activePreset.widgets.reduce((acc, w) => {
      const dims = sizeToDimensions(w.size);
      const slots = dims.width * dims.height;
      return acc + slots;
    }, 0);
  }, [activePreset]);

  const maxSlots = 16;

  // ============================================================================
  // 6. FUNCIONES DEL MOTOR DE GRID (DRAG & DROP, RESIZE, FAVORITOS, PRESETS)
  // ============================================================================

  const updateActivePresetWidgets = (updaterFn) => {
    setPresets((prevPresets) =>
      prevPresets.map((preset) => {
        if (preset.id !== activePreset.id) return preset;
        const updatedWidgets = updaterFn(preset.widgets).map((w, idx) => {
          const dims = sizeToDimensions(w.size);
          return {
            ...w,
            width: dims.width,
            height: dims.height,
            pos_x: (idx * dims.width) % 4,
            pos_y: Math.floor((idx * dims.width) / 4),
            sort_order: idx + 1
          };
        });
        return { ...preset, widgets: updatedWidgets };
      })
    );
  };

  const handleDragStart = (e, widgetId) => {
    if (!isEditMode) return;
    setDraggedWidgetId(widgetId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, targetWidgetId) => {
    if (!isEditMode || !draggedWidgetId || draggedWidgetId === targetWidgetId) return;
    e.preventDefault();
    setDragOverWidgetId(targetWidgetId);
  };

  const handleDrop = (e, targetWidgetId) => {
    e.preventDefault();
    if (!isEditMode || !draggedWidgetId || draggedWidgetId === targetWidgetId) {
      setDraggedWidgetId(null);
      setDragOverWidgetId(null);
      return;
    }

    updateActivePresetWidgets((widgets) => {
      const list = [...widgets];
      const draggedIdx = list.findIndex((w) => w.id === draggedWidgetId);
      const targetIdx = list.findIndex((w) => w.id === targetWidgetId);
      if (draggedIdx === -1 || targetIdx === -1) return list;
      const [movedItem] = list.splice(draggedIdx, 1);
      list.splice(targetIdx, 0, movedItem);
      return list;
    });

    setDraggedWidgetId(null);
    setDragOverWidgetId(null);
    triggerToast('Posición de widget actualizada y persistida en Layout', 'optimal');
  };

  const handleMoveWidgetStep = (widgetId, direction) => {
    updateActivePresetWidgets((widgets) => {
      const list = [...widgets];
      const idx = list.findIndex((w) => w.id === widgetId);
      if (idx === -1) return list;
      const targetIdx = direction === 'left' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= list.length) return list;
      const temp = list[idx];
      list[idx] = list[targetIdx];
      list[targetIdx] = temp;
      return list;
    });
  };

  const handleResizeWidget = (widgetId, newSize) => {
    updateActivePresetWidgets((widgets) =>
      widgets.map((w) => (w.id === widgetId ? { ...w, size: newSize } : w))
    );
    triggerToast(`Dimensiones ajustadas a ${newSize}`, 'info');
  };

  const handleToggleFavorite = (widgetId) => {
    updateActivePresetWidgets((widgets) =>
      widgets.map((w) => (w.id === widgetId ? { ...w, is_favorite: !w.is_favorite } : w))
    );
  };

  const handleRemoveWidgetFromCanvas = (widgetId) => {
    const catalogItem = WIDGET_LIBRARY_CATALOG.find((c) => c.id === widgetId);
    updateActivePresetWidgets((widgets) => widgets.filter((w) => w.id !== widgetId));
    triggerToast(`Widget "${catalogItem?.title || widgetId}" removido del lienzo`, 'warning');
  };

  const handleAddWidgetToCanvas = (widgetId, customSize) => {
    const exists = activePreset.widgets.some((w) => w.id === widgetId);
    if (exists) {
      handleRemoveWidgetFromCanvas(widgetId);
      return;
    }
    const catalogItem = WIDGET_LIBRARY_CATALOG.find((c) => c.id === widgetId);
    const chosenSize = customSize || selectedInitialSizes[widgetId] || catalogItem?.defaultSize || '2x1';
    const dims = sizeToDimensions(chosenSize);

    if (usedSlotsCount + dims.width * dims.height > maxSlots) {
      triggerToast(`Límite de ${maxSlots} ranuras alcanzado. Reduce o quita un widget primero.`, 'critical');
      return;
    }

    updateActivePresetWidgets((widgets) => [
      ...widgets,
      {
        id: widgetId,
        size: chosenSize,
        pos_x: 0,
        pos_y: widgets.length,
        width: dims.width,
        height: dims.height,
        sort_order: widgets.length + 1,
        is_favorite: true
      }
    ]);
    triggerToast(`Widget "${catalogItem?.title}" agregado al Dashboard`, 'optimal');
  };

  // --- Operaciones de Presets de Dashboard (Crear, Duplicar, Eliminar, Restaurar) ---
  const handleCreateDashboard = (e) => {
    e.preventDefault();
    if (!newDashboardName.trim()) return;
    const newId = `preset-custom-${Date.now()}`;
    const created = {
      id: newId,
      name: newDashboardName.trim(),
      isDefault: false,
      isShared: false,
      sharedScope: 'Privado',
      widgets: [
        { id: 'widget-kpis', size: '4x1', pos_x: 0, pos_y: 0, width: 4, height: 1, sort_order: 1, is_favorite: true },
        { id: 'widget-inventario', size: '2x2', pos_x: 0, pos_y: 1, width: 2, height: 2, sort_order: 2, is_favorite: true },
        { id: 'widget-alertas', size: '2x2', pos_x: 2, pos_y: 1, width: 2, height: 2, sort_order: 3, is_favorite: false }
      ]
    };
    setPresets((prev) => [...prev, created]);
    setActivePresetId(newId);
    setNewDashboardName('');
    setNewDashboardModalOpen(false);
    triggerToast(`Dashboard "${created.name}" creado exitosamente`, 'optimal');
  };

  const handleDuplicateDashboard = () => {
    const dupId = `preset-dup-${Date.now()}`;
    const duplicated = {
      ...activePreset,
      id: dupId,
      name: `${activePreset.name} (Copia)`,
      isDefault: false,
      widgets: activePreset.widgets.map((w) => ({ ...w }))
    };
    setPresets((prev) => [...prev, duplicated]);
    setActivePresetId(dupId);
    triggerToast(`Dashboard duplicado como "${duplicated.name}"`, 'optimal');
  };

  const handleDeleteDashboard = () => {
    if (presets.length <= 1 || activePreset.isDefault) {
      triggerToast('No se puede eliminar el dashboard principal predeterminado.', 'critical');
      return;
    }
    const remaining = presets.filter((p) => p.id !== activePreset.id);
    setPresets(remaining);
    setActivePresetId(remaining[0].id);
    triggerToast(`Dashboard "${activePreset.name}" eliminado`, 'warning');
  };

  const handleResetFactoryPresets = () => {
    setPresets(INITIAL_DASHBOARD_PRESETS);
    setActivePresetId('preset-general');
    localStorage.removeItem('mahoraga_omnistock_presets_v3');
    triggerToast('Presets restaurados a la configuración de fábrica', 'info');
  };

  // ============================================================================
  // 7. ACCIONES INTERACTIVAS DE LOS WIDGETS OPERATIVOS
  // ============================================================================

  const handleAlertAction = (alertId, actionType) => {
    if (activeRoleKey === 'R7') {
      triggerToast('Rol R7 (Auditor) es de solo lectura. Acción bloqueada.', 'critical');
      return;
    }
    setCriticalAlerts((prev) =>
      prev.map((item) =>
        item.id === alertId
          ? { ...item, status: actionType === 'PO' ? 'po_sent' : 'transfer_requested' }
          : item
      )
    );
    const target = criticalAlerts.find((a) => a.id === alertId);
    const actionLabel =
      actionType === 'PO'
        ? `Orden de reposición ${target?.supplierPO} enviada para ${target?.sku}`
        : `Transferencia solicitada a ${target?.sourceBranch} para ${target?.sku}`;

    setActivityFeed((prev) => [
      {
        id: `act-${Date.now()}`,
        actor: `${currentRole.shortLabel}`,
        action: actionLabel,
        time: new Date().toLocaleTimeString('es-MX', { hour12: false }),
        type: 'optimal'
      },
      ...prev.slice(0, 8)
    ]);
    triggerToast(actionLabel, 'optimal');
  };

  const handleApproveAdjustment = (movId) => {
    if (!hasPermission('stock.adjust.approve')) {
      triggerToast('Permiso denegado: Se requiere capacidad stock.adjust.approve (R0 o R2)', 'critical');
      return;
    }
    setMovementsList((prev) =>
      prev.map((m) => (m.id === movId ? { ...m, status: 'APPROVED' } : m))
    );
    const mov = movementsList.find((m) => m.id === movId);
    setActivityFeed((prev) => [
      {
        id: `act-${Date.now()}`,
        actor: `Carlos Rivera (${currentRole.shortLabel})`,
        action: `Aprobó ajuste ${mov?.code} (${mov?.qtyDelta} uds en ${mov?.sku})`,
        time: new Date().toLocaleTimeString('es-MX', { hour12: false }),
        type: 'optimal'
      },
      ...prev.slice(0, 8)
    ]);
    triggerToast(`Ajuste ${mov?.code} aprobado y aplicado al Kardex`, 'optimal');
  };

  const handleSimulateLaserScan = () => {
    if (!hasPermission('stock.receive') && activeRoleKey === 'R7') {
      triggerToast('Rol Auditor no puede registrar lecturas de entrada en almacén', 'critical');
      return;
    }
    const randomProduct =
      INITIAL_PRODUCTS_ROTATION[Math.floor(Math.random() * INITIAL_PRODUCTS_ROTATION.length)];
    const newSpeed = (1.1 + Math.random() * 0.5).toFixed(1) + 's/ud';

    setScannerState((prev) => ({
      lastEan: randomProduct.ean,
      lastSku: randomProduct.sku,
      lastProduct: randomProduct.name,
      bultosToday: prev.bultosToday + 1,
      avgSpeed: newSpeed,
      lastScanTime: 'Justo ahora'
    }));

    setActivityFeed((prev) => [
      {
        id: `act-${Date.now()}`,
        actor: 'Escáner Láser HID #01',
        action: `Validó EAN ${randomProduct.ean} (${randomProduct.sku}) en ${newSpeed}`,
        time: new Date().toLocaleTimeString('es-MX', { hour12: false }),
        type: 'info'
      },
      ...prev.slice(0, 8)
    ]);
    triggerToast(`Lectura láser: ${randomProduct.sku} (${randomProduct.ean}) validado`, 'optimal');
  };

  const handleExportReport = (reportName, format) => {
    if (!hasPermission('reports.export')) {
      triggerToast(
        `Acceso denegado: El rol ${currentRole.shortLabel} no posee el permiso 'reports.export'`,
        'critical'
      );
      return;
    }
    setActivityFeed((prev) => [
      {
        id: `act-${Date.now()}`,
        actor: `Carlos Rivera (${currentRole.shortLabel})`,
        action: `Exportó reporte "${reportName}" en formato ${format}`,
        time: new Date().toLocaleTimeString('es-MX', { hour12: false }),
        type: 'info'
      },
      ...prev.slice(0, 8)
    ]);
    triggerToast(`Descargando "${reportName}.${format.toLowerCase()}" (Registrado en Auditoría)`, 'optimal');
  };

  // ============================================================================
  // 8. RENDERIZADO DE CONTENIDO ESPECÍFICO DE CADA WIDGET
  // ============================================================================

  const renderWidgetBody = (widgetConfig) => {
    const canSeeCosts = hasPermission('costs.read');
    const canApproveAdjust = hasPermission('stock.adjust.approve');
    const canExport = hasPermission('reports.export');

    switch (widgetConfig.id) {
      // ------------------------------------------------------------------------
      // 1. WIDGET KPIs (4 TARJETAS MÉTRICAS CON TABULAR-NUMS)
      // ------------------------------------------------------------------------
      case 'widget-kpis':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* KPI 1: Valor Total Inventario */}
            <div className="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs font-medium text-[var(--color-text-muted)]">
                <span>VALOR TOTAL INVENTARIO</span>
                <span className="badge-optimal px-2 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-0.5 tabular-nums">
                  <ArrowUpRight className="w-3 h-3" /> +4.2%
                </span>
              </div>
              <div className="my-2">
                {canSeeCosts ? (
                  <div className="text-2xl font-bold tracking-tight text-[var(--color-text)] tabular-nums">
                    ${currentBusiness.kpiValuation.toLocaleString('en-US')}{' '}
                    <span className="text-xs font-normal text-[var(--color-text-muted)]">
                      {currentBusiness.currency}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 py-1 text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-500/10 px-2.5 rounded-lg border border-amber-500/20">
                    <Lock className="w-3.5 h-3.5 shrink-0" />
                    <span>Protegido (Requiere costs.read)</span>
                  </div>
                )}
              </div>
              <div className="text-[11px] text-[var(--color-text-muted)] flex items-center justify-between">
                <span>Costo FIFO auditable</span>
                <span className="font-mono text-[10px] opacity-80">{currentBranch.id}</span>
              </div>
            </div>

            {/* KPI 2: Rotación Semanal */}
            <div className="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs font-medium text-[var(--color-text-muted)]">
                <span>ROTACIÓN SEMANAL</span>
                <span className="badge-optimal px-2 py-0.5 rounded-full text-[11px] font-semibold">
                  Óptimo
                </span>
              </div>
              <div className="my-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-[var(--color-text)] tabular-nums">
                  {currentBusiness.weeklyRotation}%
                </span>
                <span className="text-xs text-[var(--color-text-muted)] tabular-nums">
                  meta 85.0%
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, currentBusiness.weeklyRotation)}%` }}
                />
              </div>
            </div>

            {/* KPI 3: Unidades Físicas */}
            <div className="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs font-medium text-[var(--color-text-muted)]">
                <span>UNIDADES FÍSICAS</span>
                <span className="text-[11px] font-mono text-[var(--color-primary)] bg-indigo-500/10 px-2 py-0.5 rounded-md tabular-nums">
                  {currentBusiness.aislesCount} pasillos
                </span>
              </div>
              <div className="my-2">
                <div className="text-2xl font-bold tracking-tight text-[var(--color-text)] tabular-nums">
                  {currentBusiness.totalUnits.toLocaleString('en-US')}
                </div>
              </div>
              <div className="text-[11px] text-[var(--color-text-muted)] flex items-center justify-between tabular-nums">
                <span>Disp: {(currentBusiness.totalUnits - 340).toLocaleString('en-US')}</span>
                <span>Reservado: 340 u.</span>
              </div>
            </div>

            {/* KPI 4: SKUs en Riesgo Crítico */}
            <div className="p-3.5 rounded-xl border border-red-500/30 bg-red-500/5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs font-medium text-red-700 dark:text-red-300">
                <span>SKUs EN QUIEBRE (&lt;24H)</span>
                <span className="badge-critical px-2 py-0.5 rounded-full text-[11px] font-semibold">
                  Acción Urgente
                </span>
              </div>
              <div className="my-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-red-600 dark:text-red-400 tabular-nums">
                  {criticalAlerts.filter((a) => a.status === 'pending').length}
                </span>
                <span className="text-xs text-red-600/80 dark:text-red-300/80">
                  de {criticalAlerts.length} alertas hoy
                </span>
              </div>
              <div className="text-[11px] text-red-700/80 dark:text-red-300/80 flex items-center justify-between">
                <span>Estado calculado al vuelo</span>
                <span className="underline cursor-pointer" onClick={() => triggerToast('Enfocando panel de Alertas Críticas', 'info')}>
                  Revisar POs →
                </span>
              </div>
            </div>
          </div>
        );

      // ------------------------------------------------------------------------
      // 2. WIDGET INVENTARIO (MATRIZ TALLA/COLOR + LOTES & CADUCIDADES FIFO)
      // ------------------------------------------------------------------------
      case 'widget-inventario':
        return (
          <div className="flex flex-col h-full justify-between space-y-3">
            {/* Conmutador de pestañas */}
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2.5">
              <div className="flex items-center gap-1 bg-[var(--color-bg)] p-1 rounded-lg border border-[var(--color-border)]">
                <button
                  onClick={() => setInventoryTab('matrix')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                    inventoryTab === 'matrix'
                      ? 'bg-[var(--color-primary)] text-white shadow-sm'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                  }`}
                >
                  Matriz Talla / Color
                </button>
                <button
                  onClick={() => setInventoryTab('fifo')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                    inventoryTab === 'fifo'
                      ? 'bg-[var(--color-primary)] text-white shadow-sm'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                  }`}
                >
                  Lotes & Caducidad FIFO
                </button>
              </div>
              <span className="text-[11px] font-mono text-[var(--color-text-muted)] tabular-nums">
                {inventoryTab === 'matrix' ? 'SKU-BASE: MOD-8821' : '3 lotes monitoreados'}
              </span>
            </div>

            {inventoryTab === 'matrix' ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--color-border)] text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                      <th className="py-2 px-2">Color / Variante</th>
                      <th className="py-2 px-2 text-center">Talla S</th>
                      <th className="py-2 px-2 text-center">Talla M</th>
                      <th className="py-2 px-2 text-center">Talla L</th>
                      <th className="py-2 px-2 text-center">Talla XL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)] text-xs">
                    {VARIANT_MATRIX_DATA.map((row) => (
                      <tr key={row.color} className="hover:bg-[var(--color-bg)]/60">
                        <td className="py-2.5 px-2 font-medium text-[var(--color-text)] flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full border border-slate-400 shrink-0"
                            style={{ backgroundColor: row.hex }}
                          />
                          <span className="truncate">{row.color}</span>
                        </td>
                        {['S', 'M', 'L', 'XL'].map((sizeKey) => {
                          const cell = row[sizeKey];
                          const status = computeStockStatus(cell.qty, cell.min);
                          return (
                            <td key={sizeKey} className="py-2 px-1.5 text-center">
                              <button
                                onClick={() =>
                                  setSelectedMatrixCell({
                                    color: row.color,
                                    size: sizeKey,
                                    qty: cell.qty,
                                    min: cell.min,
                                    status: status.label
                                  })
                                }
                                className={`w-full py-1 px-2 rounded-lg font-mono text-xs font-semibold tabular-nums border transition-transform active:scale-95 ${
                                  status.code === 'CRITICAL'
                                    ? 'badge-critical border-red-400/40'
                                    : status.code === 'WARNING'
                                    ? 'badge-warning border-amber-400/40'
                                    : 'badge-optimal border-emerald-400/30'
                                }`}
                              >
                                {cell.qty} u.
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {selectedMatrixCell && (
                  <div className="mt-2.5 p-2.5 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-[var(--color-text)]">
                        {selectedMatrixCell.color} — Talla {selectedMatrixCell.size}:
                      </span>{' '}
                      <span className="tabular-nums text-[var(--color-text-muted)]">
                        Físico {selectedMatrixCell.qty} uds (Mínimo requerido: {selectedMatrixCell.min} uds) • Estado:{' '}
                        <strong>{selectedMatrixCell.status}</strong>
                      </span>
                    </div>
                    <button
                      onClick={() => setSelectedMatrixCell(null)}
                      className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-lg badge-critical border border-red-400/30">
                    <div className="text-[11px] font-medium">&lt; 5 Días (Crítico)</div>
                    <div className="text-lg font-bold tabular-nums">42 u.</div>
                  </div>
                  <div className="p-2 rounded-lg badge-warning border border-amber-400/30">
                    <div className="text-[11px] font-medium">15 Días (Alerta)</div>
                    <div className="text-lg font-bold tabular-nums">128 u.</div>
                  </div>
                  <div className="p-2 rounded-lg badge-optimal border border-emerald-400/30">
                    <div className="text-[11px] font-medium">&gt; 60 Días (Óptimo)</div>
                    <div className="text-lg font-bold tabular-nums">890 u.</div>
                  </div>
                </div>
                <div className="divide-y divide-[var(--color-border)] border border-[var(--color-border)] rounded-xl overflow-hidden">
                  {FIFO_LOTS_DATA.map((lot) => (
                    <div
                      key={lot.lot}
                      className="p-2.5 bg-[var(--color-surface)] flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-semibold text-[var(--color-text)] flex items-center gap-2">
                          <span className="font-mono text-[11px] text-[var(--color-primary)] tabular-nums">
                            {lot.lot}
                          </span>
                          <span>{lot.item}</span>
                        </div>
                        <div className="text-[11px] text-[var(--color-text-muted)]">
                          Ubicación: {lot.rack} • SKU: <span className="font-mono">{lot.sku}</span>
                        </div>
                      </div>
                      <div className="text-right tabular-nums">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            lot.status === 'CRITICAL'
                              ? 'badge-critical'
                              : lot.status === 'WARNING'
                              ? 'badge-warning'
                              : 'badge-optimal'
                          }`}
                        >
                          Vence en {lot.expiryDays}d ({lot.units} u.)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-[var(--color-border)] flex items-center justify-between text-[11px] text-[var(--color-text-muted)]">
              <span>Regla: Estado calculado en tiempo real (Físico vs. Mínimo)</span>
              <span className="text-[var(--color-primary)] font-medium">Sincronizado con Kardex</span>
            </div>
          </div>
        );

      // ------------------------------------------------------------------------
      // 3. WIDGET ALERTAS CRÍTICAS (< 24H QUIEBRE DE STOCK)
      // ------------------------------------------------------------------------
      case 'widget-alertas':
        return (
          <div className="flex flex-col h-full justify-between space-y-2.5">
            <div className="space-y-2 max-h-[290px] overflow-y-auto pr-1">
              {criticalAlerts.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[var(--color-primary)] tabular-nums">
                        {item.sku}
                      </span>
                      <span className="badge-critical px-2 py-0.5 rounded-full text-[10px] font-semibold tabular-nums">
                        Quiebre en {item.depletionTime}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-[var(--color-text)]">
                      {item.name}
                    </div>
                    <div className="text-[11px] text-[var(--color-text-muted)] tabular-nums">
                      Restan: <strong className="text-red-600 dark:text-red-400">{item.remaining} uds</strong> (Mínimo: {item.minStock} uds)
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {item.status === 'pending' ? (
                      <>
                        <button
                          onClick={() => handleAlertAction(item.id, 'PO')}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[var(--color-primary)] hover:bg-[var(--color-primary-strong)] text-white transition-colors shadow-sm"
                        >
                          Reponer PO
                        </button>
                        <button
                          onClick={() => handleAlertAction(item.id, 'TRANSFER')}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-slate-100 dark:hover:bg-slate-800 text-[var(--color-text)] transition-colors"
                        >
                          Transferir
                        </button>
                      </>
                    ) : (
                      <span className="badge-optimal px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {item.status === 'po_sent' ? `PO ${item.supplierPO} Enviada` : 'Transferencia Activa'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-[var(--color-border)] flex items-center justify-between text-[11px] text-[var(--color-text-muted)]">
              <span>Motor predictivo basado en velocidad de venta de 72h</span>
              <button
                onClick={() => setCriticalAlerts(INITIAL_CRITICAL_ALERTS)}
                className="text-[var(--color-primary)] hover:underline font-medium"
              >
                Restaurar alertas demo
              </button>
            </div>
          </div>
        );

      // ------------------------------------------------------------------------
      // 4. WIDGET PRODUCTOS (TOP ROTACIÓN Y ESTADO CALCULADO AL VUELO)
      // ------------------------------------------------------------------------
      case 'widget-productos':
        return (
          <div className="space-y-2.5">
            {INITIAL_PRODUCTS_ROTATION.map((prod) => {
              const available = prod.physicalQty - prod.reservedQty;
              const status = computeStockStatus(prod.physicalQty, prod.minStock);
              const pct = Math.min(100, Math.round((prod.physicalQty / (prod.minStock * 2)) * 100));

              return (
                <div
                  key={prod.id}
                  className="p-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] flex flex-col gap-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/10 text-[var(--color-primary)] tabular-nums">
                        {prod.sku}
                      </span>
                      <span className="text-xs font-semibold text-[var(--color-text)] truncate">
                        {prod.name}
                      </span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${status.badgeClass}`}>
                      {status.label}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[var(--color-text-muted)] tabular-nums">
                    <span>
                      Físico: <strong className="text-[var(--color-text)]">{prod.physicalQty}</strong> | Disp:{' '}
                      <strong>{available}</strong> | Mín: {prod.minStock}
                    </span>
                    <span>
                      {canSeeCosts ? `Costo: $${prod.unitCost} • ` : ''}PVP: <strong>${prod.salePrice}</strong>
                    </span>
                  </div>

                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        status.code === 'CRITICAL'
                          ? 'bg-red-500'
                          : status.code === 'WARNING'
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.max(8, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        );

      // ------------------------------------------------------------------------
      // 5. WIDGET GRÁFICAS (FLUJO ENTRADAS VS SALIDAS + MARGEN BRUTO FIFO)
      // ------------------------------------------------------------------------
      case 'widget-graficas': {
        const chartBars =
          chartTimeframe === '7d'
            ? [
                { day: 'Lun', in: 78, out: 62 },
                { day: 'Mar', in: 64, out: 71 },
                { day: 'Mié', in: 92, out: 80 },
                { day: 'Jue', in: 55, out: 68 },
                { day: 'Vie', in: 98, out: 89 },
                { day: 'Sáb', in: 72, out: 94 },
                { day: 'Dom', in: 45, out: 52 }
              ]
            : [
                { day: 'Sem 1', in: 85, out: 76 },
                { day: 'Sem 2', in: 79, out: 82 },
                { day: 'Sem 3', in: 94, out: 88 },
                { day: 'Sem 4', in: 91, out: 85 }
              ];

        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 font-medium text-[var(--color-text)]">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[var(--color-primary)] inline-block" />
                  Entradas (Recepciones)
                </span>
                <span className="flex items-center gap-1.5 font-medium text-[var(--color-text-muted)]">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
                  Salidas (Despachos)
                </span>
              </div>
              <div className="flex items-center gap-1 bg-[var(--color-bg)] p-0.5 rounded-lg border border-[var(--color-border)] text-[11px]">
                <button
                  onClick={() => setChartTimeframe('7d')}
                  className={`px-2 py-0.5 rounded-md font-medium ${
                    chartTimeframe === '7d' ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-text-muted)]'
                  }`}
                >
                  7D
                </button>
                <button
                  onClick={() => setChartTimeframe('30d')}
                  className={`px-2 py-0.5 rounded-md font-medium ${
                    chartTimeframe === '30d' ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-text-muted)]'
                  }`}
                >
                  30D
                </button>
              </div>
            </div>

            {/* Gráfico de barras interactivo */}
            <div className="h-36 pt-3 pb-1 px-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] flex items-end justify-around gap-2">
              {chartBars.map((bar) => (
                <div key={bar.day} className="flex flex-col items-center gap-1.5 flex-1 h-full justify-end group">
                  <div className="w-full flex items-end justify-center gap-1 h-24">
                    <div
                      title={`Entradas ${bar.day}: ${bar.in} bultos`}
                      className="w-3 sm:w-4 bg-[var(--color-primary)] rounded-t-md transition-all duration-300 group-hover:opacity-90"
                      style={{ height: `${bar.in}%` }}
                    />
                    <div
                      title={`Salidas ${bar.day}: ${bar.out} bultos`}
                      className="w-3 sm:w-4 bg-emerald-500 rounded-t-md transition-all duration-300 group-hover:opacity-90"
                      style={{ height: `${bar.out}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-[var(--color-text-muted)] tabular-nums">
                    {bar.day}
                  </span>
                </div>
              ))}
            </div>

            {/* Tarjeta inferior de Margen Bruto & Costo FIFO */}
            <div className="p-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] flex items-center justify-between">
              <div>
                <div className="text-[11px] font-medium text-[var(--color-text-muted)]">
                  MARGEN BRUTO & COSTO PONDERADO FIFO
                </div>
                {canSeeCosts ? (
                  <div className="text-sm font-bold text-[var(--color-text)] tabular-nums">
                    Margen Real: {currentBusiness.fifoMargin}%{' '}
                    <span className="text-emerald-600 text-xs font-semibold">(+3.4% vs mes ant.)</span>
                  </div>
                ) : (
                  <div className="text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Margen financiero oculto para {currentRole.shortLabel}
                  </div>
                )}
              </div>
              <span className="badge-optimal px-2.5 py-1 rounded-lg text-xs font-semibold tabular-nums">
                FIFO Activo
              </span>
            </div>
          </div>
        );
      }

      // ------------------------------------------------------------------------
      // 6. WIDGET ACTIVIDAD (TELEMETRÍA DE ESCÁNER LÁSER & BITÁCORA)
      // ------------------------------------------------------------------------
      case 'widget-actividad':
        return (
          <div className="space-y-3">
            <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-semibold text-[var(--color-text)]">
                    Lector Láser USB HID #01 — Activo
                  </span>
                </div>
                <div className="text-xs font-mono text-[var(--color-primary)] tabular-nums">
                  EAN-13: {scannerState.lastEan} ({scannerState.lastSku})
                </div>
                <div className="text-[11px] text-[var(--color-text-muted)] truncate">
                  {scannerState.lastProduct} • {scannerState.lastScanTime}
                </div>
              </div>

              <div className="flex sm:flex-col items-end justify-between gap-1.5 shrink-0">
                <div className="text-right tabular-nums">
                  <span className="text-sm font-bold text-[var(--color-text)]">
                    {scannerState.bultosToday} bultos
                  </span>
                  <span className="block text-[10px] text-emerald-600 font-mono">
                    Vel: {scannerState.avgSpeed}
                  </span>
                </div>
                <button
                  onClick={handleSimulateLaserScan}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-strong)] flex items-center gap-1 shadow-sm"
                >
                  <QrCode className="w-3.5 h-3.5" /> Simular Lectura
                </button>
              </div>
            </div>

            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {activityFeed.map((log) => (
                <div
                  key={log.id}
                  className="py-1.5 px-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-between gap-2 text-xs"
                >
                  <div className="truncate">
                    <span className="font-semibold text-[var(--color-text)]">{log.actor}:</span>{' '}
                    <span className="text-[var(--color-text-muted)]">{log.action}</span>
                  </div>
                  <span className="font-mono text-[10px] text-[var(--color-text-muted)] tabular-nums shrink-0">
                    {log.time}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );

      // ------------------------------------------------------------------------
      // 7. WIDGET MOVIMIENTOS (ENTRADAS, TRANSFERENCIAS Y APROBACIÓN DE AJUSTES)
      // ------------------------------------------------------------------------
      case 'widget-movimientos':
        return (
          <div className="space-y-2.5">
            {movementsList.map((mov) => (
              <div
                key={mov.id}
                className="p-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[var(--color-primary)] tabular-nums">
                      {mov.code}
                    </span>
                    <span className="font-mono text-xs font-semibold text-[var(--color-text)] tabular-nums">
                      ({mov.qtyDelta > 0 ? `+${mov.qtyDelta}` : mov.qtyDelta} uds)
                    </span>
                    <span className="text-xs font-medium text-[var(--color-text)] truncate">
                      {mov.product}
                    </span>
                  </div>
                  <div className="text-[11px] text-[var(--color-text-muted)] truncate">
                    {mov.reason}
                  </div>
                  <div className="text-[10px] text-[var(--color-text-muted)]">
                    Por: {mov.requestedBy} • {mov.timestamp}
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-1.5">
                  {mov.status === 'PENDING_APPROVAL' ? (
                    <button
                      onClick={() => handleApproveAdjustment(mov.id)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                        canApproveAdjust
                          ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                      title={
                        canApproveAdjust
                          ? 'Aprobar ajuste (stock.adjust.approve)'
                          : 'Tu rol actual no tiene permiso stock.adjust.approve'
                      }
                    >
                      {canApproveAdjust ? <Check className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                      Aprobar Ajuste
                    </button>
                  ) : mov.status === 'APPROVED' ? (
                    <span className="badge-optimal px-2.5 py-1 rounded-lg text-[11px] font-semibold">
                      Ajuste Aprobado
                    </span>
                  ) : mov.status === 'IN_TRANSIT' ? (
                    <span className="badge-warning px-2.5 py-1 rounded-lg text-[11px] font-semibold">
                      En Tránsito
                    </span>
                  ) : (
                    <span className="badge-optimal px-2.5 py-1 rounded-lg text-[11px] font-semibold">
                      Confirmado
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        );

      // ------------------------------------------------------------------------
      // 8. WIDGET REPORTES (EXPORTACIÓN AUDITADA PDF, EXCEL, CSV)
      // ------------------------------------------------------------------------
      case 'widget-reportes': {
        const reportsCatalog = [
          { id: 'rep-1', name: 'Inventario Valorizado FIFO & Existencias', tag: 'Contable / Stock' },
          { id: 'rep-2', name: 'Kardex de Movimientos, Entradas y Salidas', tag: 'Auditoría' },
          { id: 'rep-3', name: 'SKUs en Stock Bajo y Punto de Reorden', tag: 'Compras PO' },
          { id: 'rep-4', name: 'Productos Más Vendidos vs. Menos Vendidos', tag: 'Rotación' }
        ];
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {reportsCatalog.map((rep) => (
              <div
                key={rep.id}
                className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-primary)]">
                    {rep.tag}
                  </span>
                  <div className="text-xs font-semibold text-[var(--color-text)] truncate">
                    {rep.name}
                  </div>
                  <div className="text-[11px] text-[var(--color-text-muted)]">
                    {canExport ? 'Permiso reports.export activo' : 'Exportación restringida por rol'}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {['PDF', 'XLSX', 'CSV'].map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => handleExportReport(rep.name, fmt)}
                      className={`px-2 py-1 rounded-md text-[11px] font-mono font-semibold border transition-colors ${
                        canExport
                          ? 'bg-[var(--color-surface)] hover:bg-[var(--color-primary)] hover:text-white border-[var(--color-border)] text-[var(--color-text)]'
                          : 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800 border-[var(--color-border)] text-[var(--color-text-muted)]'
                      }`}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
      }

      // ------------------------------------------------------------------------
      // WIDGETS ESPECIALIZADOS ADICIONALES DE LA BIBLIOTECA
      // ------------------------------------------------------------------------
      case 'widget-cadena-frio':
        return (
          <div className="space-y-2.5">
            <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-[var(--color-text)]">Cámara Frigorífica #01</div>
                <div className="text-[11px] text-[var(--color-text-muted)]">Rango seguro: 2.0°C a 6.0°C</div>
              </div>
              <span className="text-xl font-bold font-mono text-emerald-600 tabular-nums">3.8°C</span>
            </div>
            <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-[var(--color-text)]">Congelador Biológico #02</div>
                <div className="text-[11px] text-[var(--color-text-muted)]">Rango seguro: -25°C a -18°C</div>
              </div>
              <span className="text-xl font-bold font-mono text-emerald-600 tabular-nums">-21.4°C</span>
            </div>
          </div>
        );

      case 'widget-seriales-imei':
        return (
          <div className="space-y-2 text-xs">
            <div className="p-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]">
              <div className="font-mono font-bold text-[var(--color-primary)] tabular-nums">
                SN: GRY-4500-99281-MX
              </div>
              <div className="text-[var(--color-text)] font-medium">Taladro Percutor Industrial 20V</div>
              <div className="text-[11px] text-emerald-600 font-semibold">Garantía Activa • Pasillo 4</div>
            </div>
            <div className="p-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]">
              <div className="font-mono font-bold text-amber-600 tabular-nums">
                SN: GRY-4500-10442-MX
              </div>
              <div className="text-[var(--color-text)] font-medium">Compresor Neumático 50L</div>
              <div className="text-[11px] text-amber-600 font-semibold">En Revisión RMA #402</div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Filtrado de la Biblioteca de Widgets
  const filteredLibraryWidgets = useMemo(() => {
    return WIDGET_LIBRARY_CATALOG.filter((item) => {
      const matchesSearch =
        item.title.toLowerCase().includes(librarySearch.toLowerCase()) ||
        item.description.toLowerCase().includes(librarySearch.toLowerCase()) ||
        item.category.toLowerCase().includes(librarySearch.toLowerCase());

      const matchesIndustry =
        libraryIndustryFilter === 'Todos' || item.industries.includes(libraryIndustryFilter);

      const activeInstance = activePreset.widgets.find((w) => w.id === item.id);
      const matchesFavorite = !onlyFavoritesFilter || Boolean(activeInstance?.is_favorite);

      return matchesSearch && matchesIndustry && matchesFavorite;
    });
  }, [librarySearch, libraryIndustryFilter, onlyFavoritesFilter, activePreset]);

  // Payload JSON en vivo para el Inspector de Backend 1 (Módulo 4: tabla dashboards)
  const liveBackendJsonPayload = useMemo(() => {
    return {
      endpoint: 'PUT /api/dashboards/' + activePreset.id,
      auth_guard: {
        business_id: currentBusiness.id,
        branch_id: currentBranch.id,
        actor_role: currentRole.code,
        permissions_verified: true
      },
      payload: {
        name: activePreset.name,
        is_shared: activePreset.isShared,
        shared_scope: activePreset.sharedScope,
        total_slots_used: usedSlotsCount,
        max_slots_allowed: maxSlots,
        widgets: activePreset.widgets.map((w) => ({
          widget_id: w.id,
          size_preset: w.size,
          pos_x: w.pos_x,
          pos_y: w.pos_y,
          width: w.width,
          height: w.height,
          sort_order: w.sort_order,
          is_favorite: w.is_favorite
        }))
      }
    };
  }, [activePreset, currentBusiness, currentBranch, currentRole, usedSlotsCount]);

  return (
    <div className={darkMode ? 'dark' : ''}>
      {/* ====================================================================
          INYECCIÓN DE DESIGN TOKENS (VARIABLES CSS OMNISTOCK PULSE)
      ==================================================================== */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600;700&display=swap');

        :root {
          --color-primary: ${currentBusiness.primaryAccent};
          --color-primary-strong: #3525CD;
          --color-bg: #F8FAFC;
          --color-surface: #FFFFFF;
          --color-border: #E2E8F0;
          --color-text: #0F172A;
          --color-text-muted: #64748B;
          --color-optimal: #10B981;
          --color-warning: #F59E0B;
          --color-critical: #EF4444;
          --shadow-level-1: 0 1px 3px rgba(15, 23, 42, 0.04), 0 1px 2px rgba(15, 23, 42, 0.02);
          --shadow-level-2: 0 12px 24px -4px rgba(15, 23, 42, 0.10), 0 4px 8px -2px rgba(15, 23, 42, 0.05);
        }

        .dark {
          --color-primary: #6366F1;
          --color-primary-strong: #4F46E5;
          --color-bg: #0B0F19;
          --color-surface: #111827;
          --color-border: #1E293B;
          --color-text: #F8FAFC;
          --color-text-muted: #94A3B8;
          --shadow-level-1: 0 1px 3px rgba(0, 0, 0, 0.35);
          --shadow-level-2: 0 12px 28px -4px rgba(0, 0, 0, 0.6);
        }

        body {
          font-family: 'Geist', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          background-color: var(--color-bg);
          color: var(--color-text);
        }

        .tabular-nums {
          font-variant-numeric: tabular-nums;
        }

        .font-mono {
          font-family: 'JetBrains Mono', monospace;
          font-variant-numeric: tabular-nums;
        }

        .widget-card-surface {
          background-color: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: 16px;
          box-shadow: var(--shadow-level-1);
          transition: transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.18s ease, border-color 0.18s ease;
        }

        .widget-card-surface:hover {
          box-shadow: var(--shadow-level-2);
        }

        .badge-optimal {
          background-color: #ECFDF5;
          color: #065F46;
        }
        .dark .badge-optimal {
          background-color: rgba(16, 185, 129, 0.15);
          color: #34D399;
        }

        .badge-warning {
          background-color: #FFFBEB;
          color: #92400E;
        }
        .dark .badge-warning {
          background-color: rgba(245, 158, 11, 0.15);
          color: #FBBF24;
        }

        .badge-critical {
          background-color: #FEF2F2;
          color: #991B1B;
        }
        .dark .badge-critical {
          background-color: rgba(239, 68, 68, 0.18);
          color: #F87171;
        }
      `}</style>

      {/* ====================================================================
          CONTENEDOR PRINCIPAL DEL APP SHELL (SIDEBAR + MAIN + FOOTER)
      ==================================================================== */}
      <div className="min-h-screen flex bg-[var(--color-bg)] text-[var(--color-text)] transition-colors duration-200">
        
        {/* ------------------------------------------------------------------
            SIDEBAR LATERAL COLAPSABLE
        ------------------------------------------------------------------ */}
        <aside
          className={`${
            sidebarCollapsed ? 'w-20' : 'w-72'
          } shrink-0 border-r border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col justify-between transition-all duration-200 z-20`}
        >
          {/* Parte Superior: Brand + Selector Multi-Negocio + Navegación */}
          <div className="p-4 space-y-5">
            {/* Brand Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold shadow-sm shrink-0"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  <Boxes className="w-5 h-5" />
                </div>
                {!sidebarCollapsed && (
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm tracking-tight truncate">
                        OmniStock Pulse
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/10 text-[var(--color-primary)] font-semibold">
                        FE-1
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--color-text-muted)] truncate">
                      Inventarios Mahoraga
                    </p>
                  </div>
                )}
              </div>

              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-1.5 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg)]"
                title={sidebarCollapsed ? 'Expandir Sidebar' : 'Colapsar Sidebar'}
              >
                {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </button>
            </div>

            {/* Selector Multi-Negocio (business_id) */}
            {!sidebarCollapsed && (
              <div className="p-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-[var(--color-primary)]" />
                  Negocio Activo (business_id)
                </label>
                <select
                  value={selectedBusinessId}
                  onChange={(e) => {
                    setSelectedBusinessId(e.target.value);
                    const biz = BUSINESS_TENANTS.find((b) => b.id === e.target.value);
                    triggerToast(`Cambiado a ${biz?.name} (${biz?.industry})`, 'info');
                  }}
                  className="w-full text-xs font-semibold bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border)] rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                >
                  {BUSINESS_TENANTS.map((biz) => (
                    <option key={biz.id} value={biz.id}>
                      {biz.name}
                    </option>
                  ))}
                </select>
                <div className="flex items-center justify-between text-[10px] text-[var(--color-text-muted)] font-mono">
                  <span>ID: {currentBusiness.id}</span>
                  <span className="text-[var(--color-primary)] font-semibold">{currentBusiness.badge}</span>
                </div>
              </div>
            )}

            {/* Menú de Navegación de Frontend 1 */}
            <nav className="space-y-1">
              {[
                {
                  id: 'dashboard',
                  label: 'Dashboard Modular',
                  icon: LayoutGrid,
                  badge: `${activePreset.widgets.length}`
                },
                {
                  id: 'library',
                  label: 'Biblioteca de Widgets',
                  icon: Sparkles,
                  badge: `${WIDGET_LIBRARY_CATALOG.length}`
                },
                {
                  id: 'inspector',
                  label: 'Inspector JSON & API',
                  icon: Terminal,
                  badge: 'Knex'
                }
              ].map((item) => {
                const IconComponent = item.icon;
                const isActive = activeNav === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveNav(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-[var(--color-primary)] text-white shadow-sm'
                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg)]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <IconComponent className="w-4 h-4 shrink-0" />
                      {!sidebarCollapsed && <span>{item.label}</span>}
                    </div>
                    {!sidebarCollapsed && (
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md tabular-nums ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-[var(--color-bg)] text-[var(--color-text-muted)]'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Recuadro de Atajos de Teclado (OmniStock Pulse Spec) */}
            {!sidebarCollapsed && (
              <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                  Atajos Operativos
                </div>
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between text-[var(--color-text-muted)]">
                    <span>Búsqueda Global</span>
                    <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-[var(--color-surface)] border border-[var(--color-border)] rounded">
                      Ctrl + K
                    </kbd>
                  </div>
                  <div className="flex items-center justify-between text-[var(--color-text-muted)]">
                    <span>Biblioteca Widgets</span>
                    <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-[var(--color-surface)] border border-[var(--color-border)] rounded">
                      Alt + N
                    </kbd>
                  </div>
                  <div className="flex items-center justify-between text-[var(--color-text-muted)]">
                    <span>Cerrar Panel</span>
                    <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-[var(--color-surface)] border border-[var(--color-border)] rounded">
                      Esc
                    </kbd>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Parte Inferior: Simulador de Rol en Vivo (R0 - R7) y Perfil */}
          <div className="p-4 border-t border-[var(--color-border)] space-y-3">
            {!sidebarCollapsed && (
              <div className="p-2.5 rounded-xl border border-indigo-500/30 bg-indigo-500/5 space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-primary)] flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5" />
                  Simulador de Rol (RBAC)
                </label>
                <select
                  value={activeRoleKey}
                  onChange={(e) => {
                    setActiveRoleKey(e.target.value);
                    triggerToast(
                      `Vista adaptada a ${ROLES_CATALOG[e.target.value].label}`,
                      'info'
                    );
                  }}
                  className="w-full text-xs font-semibold bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border)] rounded-lg px-2 py-1.5"
                >
                  {Object.keys(ROLES_CATALOG).map((rKey) => (
                    <option key={rKey} value={rKey}>
                      {ROLES_CATALOG[rKey].label}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-[var(--color-text-muted)] leading-snug">
                  {currentRole.description}
                </p>
              </div>
            )}

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center font-bold text-xs shrink-0">
                CR
              </div>
              {!sidebarCollapsed && (
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold truncate">Carlos Rivera</div>
                  <div className="text-[11px] text-[var(--color-text-muted)] truncate">
                    carlos@pulse.io • {currentRole.shortLabel}
                  </div>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* ------------------------------------------------------------------
            COLUMNA CENTRAL: NAVBAR + CONTENIDO + FOOTER
        ------------------------------------------------------------------ */}
        <div className="flex-1 flex flex-col min-w-0">
          
          {/* NAVBAR SUPERIOR */}
          <header className="h-16 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 lg:px-6 flex items-center justify-between gap-3 sticky top-0 z-10">
            {/* Buscador Global (Ctrl+K) */}
            <div className="flex items-center gap-3 flex-1 max-w-md">
              <button
                onClick={() => setCommandPaletteOpen(true)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-xs text-[var(--color-text-muted)] hover:border-[var(--color-primary)] transition-colors"
              >
                <span className="flex items-center gap-2 truncate">
                  <Search className="w-4 h-4 text-[var(--color-primary)] shrink-0" />
                  <span>Buscar widget, SKU, lote o comando...</span>
                </span>
                <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-[var(--color-surface)] border border-[var(--color-border)] rounded">
                  Ctrl+K
                </kbd>
              </button>
            </div>

            {/* Controles Derechos del Navbar */}
            <div className="flex items-center gap-2.5">
              {/* Selector de Sucursal / Almacén */}
              <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-xs">
                <MapPin className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                <select
                  value={selectedBranchId}
                  onChange={(e) => {
                    setSelectedBranchId(e.target.value);
                    const br = BRANCH_NODES.find((n) => n.id === e.target.value);
                    triggerToast(`Alcance cambiado a ${br?.name}`, 'info');
                  }}
                  className="bg-transparent font-medium text-[var(--color-text)] focus:outline-none cursor-pointer"
                >
                  {BRANCH_NODES.map((br) => (
                    <option key={br.id} value={br.id} className="bg-[var(--color-surface)]">
                      {br.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Estado Sync en Línea */}
              <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl badge-optimal text-xs font-semibold tabular-nums">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span>Sync Activo ({currentBranch.latency})</span>
              </div>

              {/* Alternador de Densidad */}
              <button
                onClick={() => setCompactDensity(!compactDensity)}
                className={`p-2 rounded-xl border border-[var(--color-border)] text-xs font-medium flex items-center gap-1 transition-colors ${
                  compactDensity
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'bg-[var(--color-bg)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                }`}
                title="Alternar Densidad Compacta / Estándar"
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span className="hidden lg:inline">{compactDensity ? 'Compacto' : 'Estándar'}</span>
              </button>

              {/* Alternador Tema Claro / Oscuro */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                title="Cambiar Tema Claro / Oscuro (Variables CSS)"
              >
                {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
              </button>

              {/* Botón Primario + Agregar Widget */}
              <button
                onClick={() => setActiveNav(activeNav === 'library' ? 'dashboard' : 'library')}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-strong)] flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {activeNav === 'library' ? 'Volver al Lienzo' : 'Agregar Widget'}
                </span>
              </button>
            </div>
          </header>

          {/* ================================================================
              ÁREA DE CONTENIDO PRINCIPAL SEGÚN VISTA ACTIVA
          ================================================================ */}
          <main className={`flex-1 ${compactDensity ? 'p-3 lg:p-4' : 'p-4 lg:p-6'} space-y-5 overflow-y-auto`}>
            
            {/* --------------------------------------------------------------
                VISTA 1: DASHBOARD MODULAR DE WIDGETS (LIENZO PRINCIPAL)
            -------------------------------------------------------------- */}
            {activeNav === 'dashboard' && (
              <>
                {/* Barra de Control del Dashboard */}
                <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-sm">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-500/10 text-[var(--color-primary)]">
                        {currentBusiness.industry}
                      </span>
                      <h1 className="text-lg sm:text-xl font-bold tracking-tight text-[var(--color-text)]">
                        {activePreset.name}
                      </h1>
                      <span className="text-xs text-[var(--color-text-muted)] font-mono tabular-nums">
                        ({usedSlotsCount}/{maxSlots} slots)
                      </span>
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      Alcance activo: <strong>{currentBusiness.name}</strong> • Nodo:{' '}
                      <strong>{currentBranch.name}</strong> • Rol: <strong>{currentRole.label}</strong>
                    </p>
                  </div>

                  {/* Controles de Preset, Duplicar, Compartir y Modo Edición */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Selector de Preset */}
                    <select
                      value={activePresetId}
                      onChange={(e) => setActivePresetId(e.target.value)}
                      className="text-xs font-semibold bg-[var(--color-bg)] text-[var(--color-text)] border border-[var(--color-border)] rounded-xl px-3 py-2"
                    >
                      {presets.map((p) => (
                        <option key={p.id} value={p.id}>
                          📋 {p.name}
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={() => setNewDashboardModalOpen(true)}
                      className="p-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] hover:bg-slate-200/60 dark:hover:bg-slate-800 text-xs font-medium flex items-center gap-1"
                      title="Crear Nuevo Dashboard"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Nuevo</span>
                    </button>

                    <button
                      onClick={handleDuplicateDashboard}
                      className="p-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] hover:bg-slate-200/60 dark:hover:bg-slate-800 text-xs font-medium flex items-center gap-1"
                      title="Duplicar Dashboard Actual"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Duplicar</span>
                    </button>

                    <button
                      onClick={() => setShareModalOpen(true)}
                      className="p-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] hover:bg-slate-200/60 dark:hover:bg-slate-800 text-xs font-medium flex items-center gap-1"
                      title="Compartir Dashboard por Rol/Sucursal"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Compartir</span>
                    </button>

                    {!activePreset.isDefault && (
                      <button
                        onClick={handleDeleteDashboard}
                        className="p-2 rounded-xl border border-red-400/30 bg-red-500/10 text-red-600 hover:bg-red-500/20 text-xs font-medium"
                        title="Eliminar este Preset"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      onClick={handleResetFactoryPresets}
                      className="p-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-xs"
                      title="Restaurar Presets de Fábrica"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>

                    {/* Botón Modo Edición (Drag & Drop + Resize) */}
                    <button
                      onClick={() => {
                        setIsEditMode(!isEditMode);
                        triggerToast(
                          !isEditMode
                            ? 'Modo Edición Activado: Arrastra o redimensiona cualquier widget'
                            : 'Layout guardado en localStorage y listo para operar',
                          !isEditMode ? 'info' : 'optimal'
                        );
                      }}
                      className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                        isEditMode
                          ? 'bg-amber-500 text-white shadow-md ring-2 ring-amber-400/50'
                          : 'border border-[var(--color-primary)] text-[var(--color-primary)] bg-indigo-500/5 hover:bg-indigo-500/10'
                      }`}
                    >
                      {isEditMode ? (
                        <>
                          <Check className="w-4 h-4" /> Guardar Layout
                        </>
                      ) : (
                        <>
                          <GripVertical className="w-4 h-4" /> Personalizar Canvas
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Banner informativo cuando el Modo Edición está activo */}
                {isEditMode && (
                  <div className="p-3 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300 text-xs flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 shrink-0" />
                      <span>
                        <strong>Modo Personalización Activo:</strong> Arrastra las tarjetas desde el icono de 6 puntos, usa las flechas táctiles o cambia su proporción (<strong>1x1, 2x1, 2x2, 4x1</strong>). Todo cambio se guarda automáticamente.
                      </span>
                    </div>
                    <span className="font-mono text-[11px] tabular-nums">
                      Capacidad: {usedSlotsCount} / {maxSlots} slots
                    </span>
                  </div>
                )}

                {/* GRID DINÁMICO DE WIDGETS */}
                <div
                  className={`grid grid-cols-12 ${
                    compactDensity ? 'gap-3' : 'gap-4 lg:gap-5'
                  } items-stretch`}
                >
                  {activePreset.widgets.map((widgetInstance, index) => {
                    const catalogMeta = WIDGET_LIBRARY_CATALOG.find(
                      (c) => c.id === widgetInstance.id
                    );
                    if (!catalogMeta) return null;

                    const dims = sizeToDimensions(widgetInstance.size);
                    const isBeingDragged = draggedWidgetId === widgetInstance.id;
                    const isDragTarget = dragOverWidgetId === widgetInstance.id;

                    return (
                      <div
                        key={widgetInstance.id}
                        draggable={isEditMode}
                        onDragStart={(e) => handleDragStart(e, widgetInstance.id)}
                        onDragOver={(e) => handleDragOver(e, widgetInstance.id)}
                        onDrop={(e) => handleDrop(e, widgetInstance.id)}
                        className={`${dims.colSpanClass} ${dims.rowSpanClass} widget-card-surface flex flex-col justify-between ${
                          compactDensity ? 'p-3.5' : 'p-4 lg:p-5'
                        } ${isEditMode ? 'ring-1 ring-dashed ring-indigo-400/60 cursor-grab active:cursor-grabbing' : ''} ${
                          isBeingDragged ? 'opacity-50 scale-[0.98]' : ''
                        } ${isDragTarget ? 'ring-2 ring-[var(--color-primary)]' : ''}`}
                      >
                        {/* Cabecera Estándar de <WidgetCard /> */}
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-3.5 pb-2.5 border-b border-[var(--color-border)]">
                            <div className="flex items-center gap-2 min-w-0">
                              <button
                                className="text-[#94A3B8] hover:text-[var(--color-text)] cursor-grab active:cursor-grabbing p-0.5"
                                title="Manejador de arrastre de 6 puntos"
                              >
                                <GripVertical className="w-4 h-4" />
                              </button>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <h2 className="text-sm sm:text-base font-semibold text-[var(--color-text)] truncate">
                                    {catalogMeta.title}
                                  </h2>
                                  <span className="hidden sm:inline-block text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-muted)] tabular-nums">
                                    {widgetInstance.size}
                                  </span>
                                </div>
                                <p className="text-[11px] text-[var(--color-text-muted)] truncate">
                                  {catalogMeta.subtitle}
                                </p>
                              </div>
                            </div>

                            {/* Acciones de Cabecera del Widget */}
                            <div className="flex items-center gap-1 shrink-0">
                              {/* Botón Favorito */}
                              <button
                                onClick={() => handleToggleFavorite(widgetInstance.id)}
                                className={`p-1.5 rounded-lg border border-transparent hover:border-[var(--color-border)] transition-colors ${
                                  widgetInstance.is_favorite
                                    ? 'text-amber-400'
                                    : 'text-[var(--color-text-muted)]'
                                }`}
                                title="Marcar / Desmarcar Widget Favorito"
                              >
                                <Star
                                  className="w-4 h-4"
                                  fill={widgetInstance.is_favorite ? 'currentColor' : 'none'}
                                />
                              </button>

                              {/* Controles de Redimensionado y Orden en Modo Edición */}
                              {isEditMode && (
                                <div className="flex items-center gap-1 bg-[var(--color-bg)] p-1 rounded-lg border border-[var(--color-border)]">
                                  <button
                                    onClick={() => handleMoveWidgetStep(widgetInstance.id, 'left')}
                                    disabled={index === 0}
                                    className="p-1 rounded hover:bg-[var(--color-surface)] disabled:opacity-30"
                                    title="Mover antes"
                                  >
                                    <MoveLeft className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleMoveWidgetStep(widgetInstance.id, 'right')}
                                    disabled={index === activePreset.widgets.length - 1}
                                    className="p-1 rounded hover:bg-[var(--color-surface)] disabled:opacity-30"
                                    title="Mover después"
                                  >
                                    <MoveRight className="w-3.5 h-3.5" />
                                  </button>

                                  {['1x1', '2x1', '2x2', '4x1'].map((sz) => (
                                    <button
                                      key={sz}
                                      onClick={() => handleResizeWidget(widgetInstance.id, sz)}
                                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold ${
                                        widgetInstance.size === sz
                                          ? 'bg-[var(--color-primary)] text-white'
                                          : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                                      }`}
                                    >
                                      {sz}
                                    </button>
                                  ))}

                                  <button
                                    onClick={() => handleRemoveWidgetFromCanvas(widgetInstance.id)}
                                    className="p-1 rounded text-red-500 hover:bg-red-500/10"
                                    title="Quitar Widget del Dashboard"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Cuerpo del Widget */}
                          <div>{renderWidgetBody(widgetInstance)}</div>
                        </div>

                        {/* Pie de Metadatos del Widget */}
                        <div className="mt-3 pt-2 border-t border-[var(--color-border)]/60 flex items-center justify-between text-[10px] font-mono text-[var(--color-text-muted)] tabular-nums">
                          <span>
                            POS ({widgetInstance.pos_x}, {widgetInstance.pos_y}) • ORDEN #{widgetInstance.sort_order}
                          </span>
                          <span>PERMISO: {catalogMeta.requiredPermission}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* --------------------------------------------------------------
                VISTA 2: BIBLIOTECA DE WIDGETS (MARKETPLACE INTERNO)
            -------------------------------------------------------------- */}
            {activeNav === 'library' && (
              <div className="space-y-5">
                {/* Cabecera de Biblioteca y Barra de Capacidad de Ranuras */}
                <div className="p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-sm">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-[var(--color-primary)]" />
                      <h1 className="text-xl font-bold tracking-tight">
                        Biblioteca de Widgets Adaptables
                      </h1>
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      Explora, previsualiza y agrega bloques operativos diseñados para adaptarse a cualquier giro de negocio.
                    </p>
                  </div>

                  {/* Indicador de Ranuras Ocupadas (Slots Usados X / 16 disp.) */}
                  <div className="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] min-w-[260px] space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold tabular-nums">
                      <span>Capacidad del Lienzo Activo</span>
                      <span className="text-[var(--color-primary)] font-mono">
                        Slots Usados {usedSlotsCount} / {maxSlots} disp.
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          usedSlotsCount >= 14 ? 'bg-amber-500' : 'bg-[var(--color-primary)]'
                        }`}
                        style={{ width: `${Math.min(100, (usedSlotsCount / maxSlots) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Buscador y Píldoras de Filtro por Industria */}
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 text-[var(--color-text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={librarySearch}
                      onChange={(e) => setLibrarySearch(e.target.value)}
                      placeholder="Buscar por nombre, función o industria..."
                      className="w-full pl-9 pr-4 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {[
                      'Todos',
                      'Retail & Moda',
                      'Restaurantes & Alimentos',
                      'Ferretería & Maquinaria',
                      'Farmacia & Salud',
                      'Logística & E-commerce',
                      'Finanzas & Costos'
                    ].map((ind) => (
                      <button
                        key={ind}
                        onClick={() => setLibraryIndustryFilter(ind)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                          libraryIndustryFilter === ind
                            ? 'bg-[var(--color-primary)] text-white shadow-sm'
                            : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                        }`}
                      >
                        {ind}
                      </button>
                    ))}

                    <button
                      onClick={() => setOnlyFavoritesFilter(!onlyFavoritesFilter)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1 transition-all ${
                        onlyFavoritesFilter
                          ? 'bg-amber-500/15 border-amber-500 text-amber-600 dark:text-amber-300'
                          : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-muted)]'
                      }`}
                    >
                      <Star className="w-3.5 h-3.5" fill={onlyFavoritesFilter ? 'currentColor' : 'none'} />
                      Favoritos
                    </button>
                  </div>
                </div>

                {/* Cuadrícula de Tarjetas de la Biblioteca */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredLibraryWidgets.map((item) => {
                    const activeInstance = activePreset.widgets.find((w) => w.id === item.id);
                    const isAdded = Boolean(activeInstance);
                    const chosenSize =
                      selectedInitialSizes[item.id] || activeInstance?.size || item.defaultSize;

                    return (
                      <div
                        key={item.id}
                        className="widget-card-surface p-5 flex flex-col justify-between space-y-4"
                      >
                        <div className="space-y-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-[var(--color-primary)]">
                              {item.category}
                            </span>
                            <div className="flex items-center gap-1">
                              {isAdded && (
                                <span className="badge-optimal px-2 py-0.5 rounded-full text-[10px] font-semibold">
                                  En Lienzo
                                </span>
                              )}
                              <button
                                onClick={() => {
                                  if (isAdded) {
                                    handleToggleFavorite(item.id);
                                  } else {
                                    triggerToast('Agrega el widget al lienzo para marcarlo como favorito', 'info');
                                  }
                                }}
                                className={`p-1 rounded ${
                                  activeInstance?.is_favorite ? 'text-amber-400' : 'text-[var(--color-text-muted)]'
                                }`}
                              >
                                <Star
                                  className="w-4 h-4"
                                  fill={activeInstance?.is_favorite ? 'currentColor' : 'none'}
                                />
                              </button>
                            </div>
                          </div>

                          <div>
                            <h3 className="text-base font-bold text-[var(--color-text)]">
                              {item.title}
                            </h3>
                            <p className="text-xs text-[var(--color-text-muted)] mt-1 leading-relaxed">
                              {item.description}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-3 pt-3 border-t border-[var(--color-border)]">
                          {/* Selector de Tamaño Inicial */}
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[var(--color-text-muted)] font-medium">
                              Tamaño en Grid:
                            </span>
                            <div className="flex items-center gap-1">
                              {['1x1', '2x1', '2x2', '4x1'].map((sz) => (
                                <button
                                  key={sz}
                                  onClick={() => {
                                    setSelectedInitialSizes((prev) => ({ ...prev, [item.id]: sz }));
                                    if (isAdded) handleResizeWidget(item.id, sz);
                                  }}
                                  className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold border ${
                                    chosenSize === sz
                                      ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                                      : 'bg-[var(--color-bg)] text-[var(--color-text-muted)] border-[var(--color-border)]'
                                  }`}
                                >
                                  {sz}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Botones de Vista Previa y Agregar/Quitar */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setPreviewWidgetModal(item)}
                              className="flex-1 py-2 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] hover:bg-slate-200/60 dark:hover:bg-slate-800 text-xs font-semibold flex items-center justify-center gap-1.5"
                            >
                              <Eye className="w-3.5 h-3.5" /> Vista Previa
                            </button>

                            <button
                              onClick={() => handleAddWidgetToCanvas(item.id, chosenSize)}
                              className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                                isAdded
                                  ? 'border border-red-400/40 bg-red-500/10 text-red-600 hover:bg-red-500/20'
                                  : 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-strong)] text-white shadow-sm'
                              }`}
                            >
                              {isAdded ? (
                                <>
                                  <Trash2 className="w-3.5 h-3.5" /> Quitar
                                </>
                              ) : (
                                <>
                                  <Plus className="w-3.5 h-3.5" /> Añadir
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* --------------------------------------------------------------
                VISTA 3: INSPECTOR DE LAYOUT & PAYLOAD API JSON (PARA BACKEND 1)
            -------------------------------------------------------------- */}
            {activeNav === 'inspector' && (
              <div className="space-y-4">
                <div className="p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-indigo-500/10 text-[var(--color-primary)] font-bold">
                      Contrato Frontend 1 ↔ Backend 1 (Módulo 4: Dashboards)
                    </span>
                    <h1 className="text-xl font-bold mt-1">
                      Inspector en Vivo de Persistencia de Layout & Zod Schema
                    </h1>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      Este JSON refleja en tiempo real las coordenadas (pos_x, pos_y), dimensiones (width, height), orden y favoritos que se envían a Express 4 + Knex.js.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(JSON.stringify(liveBackendJsonPayload, null, 2));
                      triggerToast('Payload JSON copiado al portapapeles', 'optimal');
                    }}
                    className="px-4 py-2 rounded-xl bg-[var(--color-primary)] text-white text-xs font-semibold flex items-center gap-1.5 shrink-0"
                  >
                    <Copy className="w-4 h-4" /> Copiar Payload JSON
                  </button>
                </div>

                <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-slate-950 text-emerald-400 font-mono text-xs overflow-x-auto">
                  <pre>{JSON.stringify(liveBackendJsonPayload, null, 2)}</pre>
                </div>
              </div>
            )}
          </main>

          {/* FOOTER OPERATIVO */}
          <footer className="h-10 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 lg:px-6 flex items-center justify-between text-[11px] text-[var(--color-text-muted)] font-mono tabular-nums">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-[var(--color-text)]">OmniStock Pulse v3.4 Enterprise</span>
              <span className="hidden sm:inline">•</span>
              <span className="hidden sm:inline">Stack: React 18 + CSS Variables + Express 4 / Knex</span>
            </div>
            <div className="flex items-center gap-4">
              <span>Slots Usados: {usedSlotsCount} / {maxSlots} disp.</span>
              <span className="text-emerald-600 dark:text-emerald-400">Latencia: {currentBranch.latency}</span>
            </div>
          </footer>
        </div>
      </div>

      {/* ====================================================================
          MODALES INTERACTIVOS (VISTA PREVIA, COMPARTIR, NUEVO DASHBOARD, CTRL+K)
      ==================================================================== */}

      {/* 1. Modal de Vista Previa de Widget (Biblioteca) */}
      {previewWidgetModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-3xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border)] pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-indigo-500/10 text-[var(--color-primary)]">
                  Vista Previa en Vivo • Tamaño sugerido {previewWidgetModal.defaultSize}
                </span>
                <h2 className="text-lg font-bold text-[var(--color-text)] mt-1">
                  {previewWidgetModal.title}
                </h2>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {previewWidgetModal.description}
                </p>
              </div>
              <button
                onClick={() => setPreviewWidgetModal(null)}
                className="p-1.5 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Renderizado en vivo del Widget */}
            <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]">
              {renderWidgetBody({ id: previewWidgetModal.id, size: previewWidgetModal.defaultSize })}
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs font-mono text-[var(--color-text-muted)]">
                Permiso exigido: <strong>{previewWidgetModal.requiredPermission}</strong>
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPreviewWidgetModal(null)}
                  className="px-4 py-2 rounded-xl border border-[var(--color-border)] text-xs font-semibold"
                >
                  Cerrar
                </button>
                <button
                  onClick={() => {
                    handleAddWidgetToCanvas(previewWidgetModal.id, previewWidgetModal.defaultSize);
                    setPreviewWidgetModal(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-[var(--color-primary)] text-white text-xs font-semibold"
                >
                  Alternar en mi Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Modal para Crear Nuevo Dashboard */}
      {newDashboardModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateDashboard}
            className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold">Crear Nuevo Preset de Dashboard</h3>
              <button
                type="button"
                onClick={() => setNewDashboardModalOpen(false)}
                className="p-1 text-[var(--color-text-muted)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--color-text-muted)]">
                Nombre del Tablero Operativo
              </label>
              <input
                type="text"
                required
                value={newDashboardName}
                onChange={(e) => setNewDashboardName(e.target.value)}
                placeholder="Ej. Recepción Turno Matutino"
                className="w-full px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setNewDashboardModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-[var(--color-border)] text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[var(--color-primary)] text-white text-xs font-semibold"
              >
                Crear Dashboard
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 3. Modal para Compartir Dashboard */}
      {shareModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold">Compartir "{activePreset.name}"</h3>
              <button
                onClick={() => setShareModalOpen(false)}
                className="p-1 text-[var(--color-text-muted)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-[var(--color-text-muted)]">
              Asigna qué roles dentro de <strong>{currentBusiness.name}</strong> pueden utilizar esta disposición de widgets como plantilla:
            </p>
            <div className="space-y-2 text-xs">
              {Object.values(ROLES_CATALOG).map((r) => (
                <label
                  key={r.code}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]"
                >
                  <span className="font-semibold">{r.label}</span>
                  <input type="checkbox" defaultChecked className="rounded text-[var(--color-primary)]" />
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setShareModalOpen(false);
                  triggerToast(`Permisos de compartición actualizados para "${activePreset.name}"`, 'optimal');
                }}
                className="w-full py-2 rounded-xl bg-[var(--color-primary)] text-white text-xs font-semibold"
              >
                Guardar Alcance y Copiar Enlace Interno
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Paleta de Comandos Global (Ctrl + K) */}
      {commandPaletteOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-start justify-center pt-20 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl overflow-hidden">
            <div className="p-3.5 border-b border-[var(--color-border)] flex items-center gap-2.5">
              <Search className="w-4 h-4 text-[var(--color-primary)]" />
              <input
                type="text"
                autoFocus
                value={commandQuery}
                onChange={(e) => setCommandQuery(e.target.value)}
                placeholder="Escribe un comando, nombre de widget o SKU (ej. FIFO, Escáner, R7)..."
                className="w-full bg-transparent text-xs focus:outline-none"
              />
              <button
                onClick={() => setCommandPaletteOpen(false)}
                className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--color-bg)] border border-[var(--color-border)]"
              >
                ESC
              </button>
            </div>
            <div className="p-2 max-h-72 overflow-y-auto space-y-1 text-xs">
              <div className="px-2 py-1 text-[10px] font-bold uppercase text-[var(--color-text-muted)]">
                Acciones Rápidas
              </div>
              <button
                onClick={() => {
                  setIsEditMode((prev) => !prev);
                  setCommandPaletteOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-xl hover:bg-[var(--color-bg)] flex items-center justify-between"
              >
                <span>Alternar Modo Personalizar Canvas (Drag & Resize)</span>
                <span className="font-mono text-[10px] text-[var(--color-primary)]">Layout</span>
              </button>
              <button
                onClick={() => {
                  setActiveNav('library');
                  setCommandPaletteOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-xl hover:bg-[var(--color-bg)] flex items-center justify-between"
              >
                <span>Ir a la Biblioteca de Widgets</span>
                <span className="font-mono text-[10px] text-[var(--color-primary)]">Alt+N</span>
              </button>
              <button
                onClick={() => {
                  handleSimulateLaserScan();
                  setCommandPaletteOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-xl hover:bg-[var(--color-bg)] flex items-center justify-between"
              >
                <span>Simular Lectura de Escáner Láser EAN-13</span>
                <span className="font-mono text-[10px] text-emerald-500">Hardware HID</span>
              </button>
              <button
                onClick={() => {
                  setDarkMode((prev) => !prev);
                  setCommandPaletteOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-xl hover:bg-[var(--color-bg)] flex items-center justify-between"
              >
                <span>Alternar Tema Claro / Oscuro (CSS Tokens)</span>
                <span className="font-mono text-[10px] text-[var(--color-primary)]">UI</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          NOTIFICACIÓN TOAST FLOTANTE
      ==================================================================== */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 shadow-2xl flex items-center gap-2.5 text-xs font-semibold animate-bounce">
          <span
            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
              toastMessage.tone === 'critical'
                ? 'bg-red-500'
                : toastMessage.tone === 'warning'
                ? 'bg-amber-500'
                : 'bg-emerald-500'
            }`}
          />
          <span className="text-[var(--color-text)]">{toastMessage.msg}</span>
        </div>
      )}
    </div>
  );
}