# Módulo 1: CRUD de Productos - Inventarios Mahoraga 
Implementation del modulo CRUD de productos 
## Pasos para Instalar y Probar

### 1. Instalar dependencias
```bash
npm install
```

### 2. Ejecutar la migración de la base de datos
Para crear la tabla `products` en SQLite (entorno de desarrollo local):
```bash
npm run migrate
```

### 3. Iniciar el servidor
```bash
npm run dev
# o con npm start
```
## Endpoints del CRUD (`/api/products`)

| Método | Endpoint | Permiso requerido | Descripción |
| :--- | :--- | :--- | :--- |
| **GET** | `/api/products` | `products.read` | Lista productos paginados y filtrables por `search`, `category_id`, `brand_id` y `status`. |
| **GET** | `/api/products/:id` | `products.read` | Detalle de un producto específico. |
| **POST** | `/api/products` | `products.create` | Crear producto. Permite enviar JSON o `multipart/form-data` con campo `image`. |
| **PUT** | `/api/products/:id` | `products.update` | Modificar datos del producto y opcionalmente actualizar su imagen. |
| **DELETE**| `/api/products/:id` | `products.archive`| Archiva el producto (`status = 'archived'`). |
| **PATCH** | `/api/products/:id/archive` | `products.archive`| Alias para archivar producto. |

## Endpoints de Categorías (`/api/categories`)

| Método | Endpoint | Permiso requerido | Descripción |
| :--- | :--- | :--- | :--- |
| **GET** | `/api/categories` | `products.read` | Lista categorías. Usa `?tree=true` para recibirlas anidadas como árbol jerárquico multinivel. |
| **GET** | `/api/categories/:id` | `products.read` | Detalle de la categoría junto con su categoría padre y sus subcategorías hijas directas. |
| **POST** | `/api/categories` | `products.create` | Crear categoría o subcategoría (asignando `parent_id`). Soporta `icon_name` y `color_hex`. |
| **PUT** | `/api/categories/:id` | `products.update` | Modificar datos de la categoría (evita autorreferencias cíclicas). |
| **DELETE**| `/api/categories/:id` | `products.update` | Elimina la categoría **únicamente si no tiene productos activos asociados** ni subcategorías. |

> Puedes enviar los siguientes encabezados HTTP para simular negocio y permisos:
> - `x-business-id: 1`
> - `x-user-permissions: products.read,products.create,products.update,products.archive,costs.read`