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
| **POST** | `/api/inventory/counts/:id/items`| `stock.count` | Registra cantidades físicas contadas por el almacenista y calcula diferencias contra el sistema. |
| **POST** | `/api/inventory/adjustments/request`| `stock.adjust.request` | Genera una solicitud de ajuste de existencias con motivo y evidencia en estado pendiente. |
| **POST** | `/api/inventory/adjustments/:id/approve`| `stock.adjust.approve` | Aprobación transaccional del supervisor/gerente que impacta el stock físico y genera registro en el Kardex. |

---

> **Encabezados para pruebas de permisos en desarrollo:**
> - `x-business-id: 1`
> - `x-user-permissions: products.read,products.create,products.update,products.archive,costs.read,stock.read,stock.count,stock.adjust.request,stock.adjust.approve`
