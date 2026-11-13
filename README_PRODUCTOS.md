# Módulo de Productos, Categorías e Inventario - Inventarios Mahoraga

Sistema de gestión de inventario modular desarrollado en Node.js 22 LTS con Express 4, Knex.js y Zod.

---

## Pasos para Instalar y Probar

### 1. Instalar dependencias
```bash
npm install
```

### 2. Ejecutar las migraciones de base de datos
Crea las tablas `products`, `categories`, `warehouse_stock`, `kardex_movements`, `stock_counts` y `stock_adjustments`:
```bash
npm run migrate
```

### 3. Iniciar el servidor
```bash
npm run dev
# o con npm start
```

---

## 1. Endpoints de Productos (`/api/products`)

| Método | Endpoint | Permiso requerido | Descripción |
| :--- | :--- | :--- | :--- |
| **GET** | `/api/products` | `products.read` | Lista productos paginados y filtrables por `search`, `category_id`, `brand_id` y `status`. |
| **GET** | `/api/products/:id` | `products.read` | Detalle de un producto específico. Oculta `cost_price` si no tiene `costs.read`. |
| **POST** | `/api/products` | `products.create` | Crear producto. Permite enviar JSON o `multipart/form-data` con campo `image`. |
| **PUT** | `/api/products/:id` | `products.update` | Modificar datos del producto y opcionalmente actualizar su imagen. |
| **DELETE**| `/api/products/:id` | `products.archive`| Archiva el producto (`status = 'archived'`). |
| **PATCH** | `/api/products/:id/archive` | `products.archive`| Alias para archivar producto sin romper Kardex. |

---

## 2. Endpoints de Generadores y Carga Masiva (`/api/products`)

| Método | Endpoint | Permiso requerido | Descripción |
| :--- | :--- | :--- | :--- |
| **GET** | `/api/products/generate/sku` | `products.create` | Autogenera un SKU consecutivo con prefijo configurable (`?prefix=CAT`). |
| **GET** | `/api/products/generate/barcode` | `products.create` | Genera código EAN-13 válido con dígito verificador módulo 10 o CODE-128 (`?type=code128`). |
| **GET** | `/api/products/:id/label` | `products.read` | Genera payload estructurado y comandos ZPL para etiquetas térmicas Zebra ZT411. |
| **POST** | `/api/products/import` | `products.create` | Carga masiva en CSV validando fila por fila con Zod en transacción Knex (`?dryRun=true` para simular). |
| **GET** | `/api/products/export` | `products.read` | Exporta catálogo a CSV filtrado por categoría, marca o estado. Protege columna de costos sin `costs.read`. |

---

## 3. Endpoints de Categorías (`/api/categories`)

| Método | Endpoint | Permiso requerido | Descripción |
| :--- | :--- | :--- | :--- |
| **GET** | `/api/categories` | `products.read` | Lista categorías. Usa `?tree=true` para recibirlas anidadas como árbol jerárquico multinivel. |
| **GET** | `/api/categories/:id` | `products.read` | Detalle de la categoría junto con su categoría padre y sus subcategorías hijas directas. |
| **POST** | `/api/categories` | `products.create` | Crear categoría o subcategoría con `parent_id`, `icon_name` y `color_hex`. |
| **PUT** | `/api/categories/:id` | `products.update` | Modificar datos de la categoría evitando ciclos jerárquicos. |
| **DELETE**| `/api/categories/:id` | `products.update` | Elimina la categoría únicamente si no tiene productos activos asociados ni subcategorías. |

---

## 4. Endpoints de Inventario y Kardex (`/api/inventory`)

| Método | Endpoint | Permiso requerido | Descripción |
| :--- | :--- | :--- | :--- |
| **GET** | `/api/inventory/stock` | `stock.read` | Consulta existencias con cálculo dinámico: `Disponible = Físico - Reservado` y alertas (Óptimo, Stock Bajo, Agotado). |
| **GET** | `/api/inventory/kardex/:productId` | `stock.read` | Reconstruye la línea de tiempo contable y física (entradas, salidas, saldos y costos protegidos). |
| **POST** | `/api/inventory/levels` | `stock.read` | Configura niveles de stock mínimo, máximo y ubicaciones físicas (pasillo, rack, gaveta). |
| **POST** | `/api/inventory/counts` | `stock.count` | Inicia una sesión de conteo cíclico para el almacén. |
| **POST** | `/api/inventory/counts/:id/items`| `stock.count` | Registra cantidades por producto/lote; las diferencias generan solicitudes pendientes de aprobación, sin modificar directamente las existencias. |
| **GET** | `/api/inventory/adjustments` | `stock.adjust.approve` | Lista solicitudes de ajuste pendientes (o filtradas por `status`, `warehouse_id`, `product_id`) para revisión. |
| **POST** | `/api/inventory/adjustments/request`| `stock.adjust.request` | Genera una solicitud de ajuste de existencias con motivo y evidencia en estado pendiente. |
| **POST** | `/api/inventory/adjustments/:id/approve`| `stock.adjust.approve` | Aprobación transaccional por otro usuario; actualiza stock y Kardex en una sola operación. |
| **GET** | `/api/inventory/movements` | `stock.read` | Historial paginado de operaciones, con filtros `type`, `status` y `product_id`. |
| **POST** | `/api/inventory/movements` | `stock.movement.create` | Registra entradas (`receive`), salidas (`issue`), transferencias (`transfer`) y devoluciones (`return`), con clave `idempotency_key`. |
| **POST** | `/api/inventory/movements/:id/receive` | `stock.movement.create` | Recibe una transferencia en tránsito en el almacén destino; una recepción repetida no duplica existencias. |

Un movimiento incluye `warehouse_id`, `product_id`, `qty` y `idempotency_key`; acepta además `lot_number`, `unit_cost` y `reference_doc`. Una transferencia requiere `destination_warehouse_id`, descuenta el origen al despacharse y suma el destino únicamente al recibirse. Para devoluciones, `return_direction` es `customer` o `supplier`; una devolución de cliente admite `disposition: "available"` o `"quarantine"` (por defecto entra disponible). El stock en cuarentena también se contabiliza como reservado y no puede salir como disponible.

Todos los movimientos y sus registros de Kardex se guardan en la misma transacción; no existe borrado de movimientos confirmados. Los costos solo se exponen a usuarios con `costs.read`.

---

> **Encabezados para pruebas de permisos en desarrollo:**
> - `x-business-id: 1`
> - `x-user-id: 1` (en desarrollo; usa otro ID para simular una persona distinta al aprobar un ajuste)
> - `x-user-permissions: products.read,products.create,products.update,products.archive,costs.read,stock.read,stock.count,stock.adjust.request,stock.adjust.approve,stock.movement.create,reports.read,reports.export`

## 5. Reportes y Exportación (`/api/reports`)

Los reportes requieren `reports.read`; descargar un archivo requiere `reports.export`. Las consultas aceptan `from`, `to`, `warehouse_id`, `product_id`, `supplier_id`, `category_id`, `page` y `limit` (máximo 500 filas por página). El pronóstico de quiebre usa `threshold_days` de historial de salidas para estimar si el stock disponible alcanzaría para menos de 24 horas.

| Método | Endpoint | Permiso | Descripción |
| :--- | :--- | :--- | :--- |
| **GET** | `/api/reports/inventory-valuation` | `reports.read` | Existencias por almacén/lote y valuación con costo promedio. |
| **GET** | `/api/reports/movement-history` | `reports.read` | Kardex por periodo, producto y almacén. |
| **GET** | `/api/reports/supplier-receipts` | `reports.read` | Entradas completadas agrupadas por proveedor en el periodo. |
| **GET** | `/api/reports/sales-dispatches` | `reports.read` | Salidas de venta agrupadas por producto y almacén. |
| **GET** | `/api/reports/low-stock` | `reports.read` | Stock disponible bajo mínimo y productos con riesgo estimado de quiebre en 24 horas. |
| **GET** | `/api/reports/product-margins` | `reports.read` | Precio, costo y margen bruto unitario actual por producto. |
| **GET** | `/api/reports/category-performance` | `reports.read` | Productos activos y despachos agrupados por categoría. |
| **GET** | `/api/reports/top-selling` | `reports.read` | Productos con más unidades despachadas en el periodo. |
| **GET** | `/api/reports/slow-moving` | `reports.read` | Existencias activas ordenadas por antigüedad del último despacho. |
| **GET** | `/api/reports/product-catalog` | `reports.read` | Catálogo de productos y precios actuales. |
| **GET** | `/api/reports/:report/export?format=csv\|xlsx\|pdf` | `reports.export` | Exporta cualquiera de los reportes anteriores; respeta filtros, paginación y permisos de costos. |
| **GET** | `/api/reports/exports/audit` | `reports.read` | Historial de exportaciones, filtrable por reporte, formato y usuario. |

El sistema actual no almacena una entidad separada de ventas ni el precio de venta histórico: los reportes de ventas y categorías estiman ingresos con el precio actual del producto y contabilizan los movimientos `issue` como despachos. Los reportes de proveedor presentan su ID porque aún no existe un catálogo de proveedores. Los costos, valuaciones y márgenes se omiten sin `costs.read`; cada exportación exitosa registra usuario, negocio, filtros, formato, reporte, cantidad de filas y fecha en `report_export_audit`.

Para pruebas de reportes en desarrollo, agrega `reports.read,reports.export` al encabezado `x-user-permissions`.
