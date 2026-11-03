# Inventarios Mahoraga / OmniStock Pulse - Backend 1

API REST para el bloque **Backend 1** de Inventarios Mahoraga, responsable de:
1. **Sistema de Autenticación** (Login, Logout, Refresh Tokens con rotación, recuperación y cambio de contraseñas, telemetría de sesiones en `user_sessions`).
2. **Gestión de Usuarios** (CRUD completo con Zod, carga de avatares con Multer, Soft Delete, asignación de roles y alcances por sucursal/almacén, desactivación inmediata de sesiones).
3. **Roles y Permisos** (Jerarquía predeterminada R0 a R7, catálogo de 30 permisos atómicos, matriz RBAC, protección estricta del Propietario R0).
4. **Dashboards y Widgets** (Gestión de lienzos dinámicos, posicionamiento en Grid de 16 ranuras de OmniStock Pulse, widgets favoritos y duplicación).
5. **Configuración y Ubicaciones** (Empresa, límites de aprobación, sucursales, almacenes y persistencia de temas CSS).

---

## 🚀 Tecnologías y Reglas de Arquitectura

* **Lenguaje:** JavaScript (Node.js 22 LTS / CommonJS).
* **Framework Web:** Express 4 estructurado modularmente bajo el prefijo `/api`.
* **Acceso a Datos y Migraciones:** Knex.js con soporte dual para **SQLite** (desarrollo local y pruebas) y **PostgreSQL 16** (producción).
* **Multi-negocio Obligatorio:** Todas las tablas y consultas principales integran `business_id`.
* **Seguridad:**
  * JWT en cookies `HttpOnly`, `Secure` y `SameSite`.
  * Hashing seguro de contraseñas con `bcryptjs` (salt factor >= 10).
  * Cabeceras de seguridad HTTP con `Helmet`.
  * Protección contra ataques de fuerza bruta con `express-rate-limit`.
  * Principio de menor privilegio y denegación por defecto en backend.
* **Validación:** Esquemas `Zod` aplicados antes de interactuar con la base de datos.
* **Archivos:** `Multer` con filtros estrictos de MIME type (PNG, JPG, WEBP) y límite de 5MB.
* **Pruebas:** `node:test` y `Supertest`.

---

## 📂 Estructura de Directorios

```
backend/
├── data/                       # Archivo SQLite para desarrollo local
├── src/
│   ├── app.js                  # Configuración de Express, middlewares y rutas
│   ├── server.js               # Punto de entrada y arranque del servidor
│   ├── config/                 # Configuración de entorno
│   ├── database/
│   │   ├── connection.js       # Instancia Knex configurada según NODE_ENV
│   │   ├── migrations/         # Migraciones versionadas (4 migraciones)
│   │   └── seeds/              # Semillas iniciales (negocio, R0-R7, 30 permisos)
│   ├── middlewares/
│   │   ├── authMiddleware.js   # authenticateToken, requirePermission, requireScope
│   │   ├── auditMiddleware.js  # Trazabilidad en audit_logs
│   │   ├── rateLimiter.js      # Límite de intentos en login y recuperación
│   │   └── errorHandler.js     # Formato semántico de errores (Zod 400, 401, 403, 500)
│   ├── modules/
│   │   ├── auth/               # Controller, routes y validaciones Zod de Auth
│   │   ├── users/              # Controller, routes y validaciones Zod de Usuarios
│   │   ├── roles/              # Controller, routes y validaciones Zod de Roles/Permisos
│   │   ├── dashboards/         # Controller, routes y validaciones de Widgets/Grid
│   │   └── settings/           # Controller, routes de Configuración/Sucursales
│   └── utils/
│       ├── jwt.js              # Firma y verificación JWT con rotación de tokens
│       ├── mailer.js           # Envío transaccional Nodemailer (Brevo/Mailtrap)
│       └── multer.js           # Procesamiento seguro de imágenes
├── tests/                      # Suite de pruebas con node:test + Supertest
│   ├── helpers.js              # Utilidades de base de datos en memoria y logins
│   ├── auth.test.js
│   ├── users.test.js
│   ├── roles.test.js
│   ├── dashboards.test.js
│   └── settings.test.js
├── uploads/                    # Almacenamiento local de fotos y logotipos
│   ├── avatars/
│   └── logos/
├── knexfile.js                 # Configuración de entornos de base de datos
├── package.json
└── Dockerfile
```

---

## 🛠️ Instalación y Puesta en Marcha

### 1. Requisitos Previos
* Node.js v22 LTS o superior (v24 compatible).
* npm v10 o superior.

### 2. Instalación de Dependencias
```bash
cd backend
npm install
```

### 3. Configurar Variables de Entorno
Copia el archivo de ejemplo `.env.example` a `.env`:
```bash
cp .env.example .env
```

### 4. Ejecutar Migraciones y Semilla Inicial
```bash
# Ejecutar migraciones Knex
npm run migrate

# Sembrar catálogo de permisos, roles R0-R7 y usuario Propietario inicial
npm run seed
```

### 5. Iniciar Servidor en Modo Desarrollo
```bash
npm run dev
```
El servidor escuchará en `http://localhost:4000`.

---

## 🧪 Pruebas Automatizadas

La suite de pruebas automatizadas está construida con el ejecutor nativo `node:test` y `Supertest`, utilizando una base de datos SQLite en memoria:

```bash
# Ejecutar todas las pruebas
npm test

# Ejecutar por módulo específico
npm run test:auth
npm run test:users
npm run test:roles
npm run test:dashboards
npm run test:settings
```

---

## 🛡️ Jerarquía de Roles (R0–R7) y Catálogo de Permisos

### Roles Predeterminados Sembrados:
* `R0 · owner` (**Propietario / Dueño**): Acceso total, reservado al titular inicial. Inmutable y protegido contra borrado o degradación.
* `R1 · system_admin` (**Administrador del sistema**): Administra usuarios, roles, catálogos, sucursales y parámetros. No puede alterar a R0.
* `R2 · inventory_manager` (**Gerente de inventario**): Supervisa stock, kárdex, movimientos, aprueba ajustes según límites.
* `R3 · warehouse_supervisor` (**Supervisor de almacén**): Supervisa operaciones diarias, valida conteos y recepciones.
* `R4 · warehouse_operator` (**Almacenista / Operador**): Registra entradas/salidas/conteos. Puede **solicitar** ajustes de stock, pero nunca aprobarlos.
* `R5 · purchasing` (**Compras**): Proveedores y órdenes de compra.
* `R6 · sales` (**Ventas / Mostrador**): Catálogo, existencias y pedidos de venta.
* `R7 · auditor` (**Auditor / Consulta**): **Solo lectura estricta** en todo el sistema. Prohibido crear, editar o eliminar datos.

### 30 Permisos Atómicos (`modulo.accion`):
1. **Usuarios:** `users.read`, `users.create`, `users.update`, `users.disable`, `users.assign_roles`.
2. **Roles:** `roles.read`, `roles.manage`.
3. **Configuración y Ubicaciones:** `settings.manage`, `locations.manage`.
4. **Productos y Categorías:** `products.read`, `products.create`, `products.update`, `products.archive`.
5. **Inventario:** `stock.read`, `stock.receive`, `stock.issue`, `stock.transfer`, `stock.count`.
6. **Ajustes:** `stock.adjust.request`, `stock.adjust.approve`.
7. **Compras:** `purchases.read`, `purchases.create`, `purchases.approve`.
8. **Ventas:** `sales.read`, `sales.create`.
9. **Costos y Precios:** `costs.read`, `prices.manage`.
10. **Reportes y Auditoría:** `reports.read`, `reports.export`, `audit.read`.

---

## 📡 Catálogo de Endpoints de la API (`/api`)

### Autenticación (`/api/auth`)
| Método | Endpoint | Permiso / Acceso | Descripción |
|---|---|---|---|
| `POST` | `/api/auth/login` | Público (Rate limited) | Inicia sesión, emite JWT HttpOnly y registra telemetría |
| `POST` | `/api/auth/refresh` | Público / Cookie | Rotación de Refresh Token |
| `POST` | `/api/auth/logout` | Autenticado | Revoca sesión en DB y borra cookies |
| `GET` | `/api/auth/me` | Autenticado | Perfil propio, roles, permisos y alcances |
| `POST` | `/api/auth/forgot-password` | Público | Solicita enlace de recuperación por correo |
| `POST` | `/api/auth/reset-password` | Público | Restablece contraseña mediante token |
| `POST` | `/api/auth/change-password` | Autenticado | Cambia contraseña (valida historial de 3 últimas) |
| `GET` | `/api/auth/sessions` | Autenticado | Consulta sesiones activas (IP, navegador, último acceso) |
| `DELETE` | `/api/auth/sessions/:id` | Autenticado | Cierra una sesión remota específica |

### Usuarios (`/api/users`)
| Método | Endpoint | Permiso | Descripción |
|---|---|---|---|
| `GET` | `/api/users` | `users.read` | Directorio de usuarios con filtros, búsqueda y paginación |
| `GET` | `/api/users/:id` | `users.read` | Detalle de usuario, roles asignados y sucursales |
| `POST` | `/api/users` | `users.create` | Crea o invita un usuario (soporta avatar vía Multer) |
| `PUT` | `/api/users/:id` | `users.update` | Actualiza datos básicos y roles |
| `PATCH` | `/api/users/:id/status`| `users.disable` | Activa o desactiva (revoca sesiones de inmediato) |
| `DELETE` | `/api/users/:id` | `users.disable` | Soft Delete (`deleted_at`); protegido para R0 |

### Roles y Permisos (`/api/roles` y `/api/permissions`)
| Método | Endpoint | Permiso | Descripción |
|---|---|---|---|
| `GET` | `/api/roles` | `roles.read` | Lista roles con conteo de usuarios y permisos |
| `GET` | `/api/roles/:id` | `roles.read` | Detalle del rol y su matriz de permisos |
| `POST` | `/api/roles` | `roles.manage` | Crea rol personalizado |
| `PUT` | `/api/roles/:id` | `roles.manage` | Actualiza rol y permisos (R0 protegido) |
| `DELETE` | `/api/roles/:id` | `roles.manage` | Elimina rol (bloqueado si tiene usuarios o es del sistema) |
| `GET` | `/api/permissions` | `roles.read` | Catálogo de los 30 permisos atómicos por módulo |

### Dashboards y Widgets (`/api/dashboards`)
| Método | Endpoint | Permiso | Descripción |
|---|---|---|---|
| `GET` | `/api/dashboards` | Autenticado | Lista lienzos propios y compartidos con el negocio |
| `GET` | `/api/dashboards/:id` | Autenticado | Detalle con widgets y coordenadas del Grid |
| `POST` | `/api/dashboards` | Autenticado | Crea dashboard con validación Zod de coordenadas |
| `PUT` | `/api/dashboards/:id` | Autenticado | Actualiza layout y widgets del Grid |
| `DELETE` | `/api/dashboards/:id` | Autenticado | Elimina dashboard (protege el único predeterminado) |
| `POST` | `/api/dashboards/:id/duplicate`| Autenticado | Clona un dashboard completo con sus widgets |
| `PATCH` | `/api/dashboards/widgets/:id/favorite`| Autenticado | Marca / desmarca widget como favorito |

### Configuración y Sucursales (`/api/settings`)
| Método | Endpoint | Permiso | Descripción |
|---|---|---|---|
| `GET` | `/api/settings/company` | `settings.manage` | Datos fiscales de la empresa y límites de aprobación |
| `PUT` | `/api/settings/company` | `settings.manage` | Modifica datos comerciales y parámetros |
| `POST` | `/api/settings/company/logo` | `settings.manage` | Carga de logotipo oficial (Multer) |
| `GET` | `/api/settings/theme` | Autenticado | Tokens de diseño CSS para OmniStock Pulse |
| `PUT` | `/api/settings/theme` | `settings.manage` | Actualiza variables CSS del tema |
| `GET` | `/api/settings/branches` | Autenticado | Lista sucursales |
| `POST` | `/api/settings/branches` | `locations.manage` | Registra nueva sucursal |
| `GET` | `/api/settings/warehouses` | Autenticado | Lista almacenes (filtrable por `branchId`) |
| `POST` | `/api/settings/warehouses` | `locations.manage` | Registra nuevo almacén |

