# Inventario Mahoraga

Sistema de inventario modular.

- `frontend/`: la aplicación web (React 18 + Vite).
- `backend/`: aquí irá el backend (Express), todavía no está en el repositorio.

Bloque **Frontend 2**: Productos, Escáner e Inventario.

## Requisitos

- Node.js 22 o más reciente
- npm

## Cómo correrlo

```bash
cd frontend
npm install
npm run dev
```

Abre la dirección que muestra la terminal (normalmente `http://localhost:5173`).

Mientras no esté lista la API, la app funciona con **datos simulados**. En la barra de arriba hay un selector
**Rol de prueba** para ver la app como cualquier rol (R0–R7) y revisar qué se muestra u oculta según los permisos.

## Scripts

Todos se corren dentro de `frontend/` (primero `cd frontend`).

| Comando                | Qué hace                                  |
| ---------------------- | ----------------------------------------- |
| `npm run dev`          | Servidor de desarrollo                    |
| `npm run dev:red`      | Igual, con HTTPS y abierto a la red local |
| `npm run build`        | Compila para producción en `dist/`        |
| `npm run preview`      | Sirve lo compilado en `dist/`             |
| `npm test`             | Corre las pruebas (Vitest)                |
| `npm run lint`         | Revisa el código con ESLint               |
| `npm run format`       | Da formato al código con Prettier         |
| `npm run format:check` | Revisa el formato sin cambiar nada        |

**Escáner con el teléfono:** dentro de `frontend/` corre `npm run dev:red`, abre en el teléfono (en el mismo
Wi-Fi) la dirección "Network" que muestra la terminal y acepta la advertencia del certificado; la cámara solo
funciona con HTTPS.

## Datos simulados o API real

La variable `VITE_USE_MOCK` decide de dónde salen los datos:

- `true` (por defecto, en `frontend/.env.development`): datos simulados de `frontend/src/api/mock/`.
- `false`: llamadas reales a `/api`.

Para cambiarla solo en tu máquina, copia `frontend/.env.example` como `frontend/.env.local` y edítalo.

Los mocks responden con la misma forma que los backends (inglés, snake_case, `{ ok, data, pagination }`).
`frontend/src/api/traductores.js` pasa esas respuestas al español que usa la interfaz; cada archivo de
`frontend/src/api/` anota la ruta, el permiso y los campos de cada endpoint.

## Estructura

```
frontend/
  src/
    api/            Funciones para hablar con el backend; mock/ tiene los datos simulados
    auth/           Sesión del usuario y usePuede() para revisar permisos
    components/     Componentes base reutilizables (Boton, Input, Tabla, Modal...)
    modulos/
      productos/    Catálogo, detalle, formulario y acciones de productos
      escaner/      Escáner: lector USB, cámara o imagen; entradas, salidas y conteos
      inventario/   Existencias, movimientos, kardex y ajustes
    styles/         Tokens de diseño (colores, radios, fuente) y estilos globales
```

En desarrollo, `/componentes` muestra todos los componentes base con ejemplos y `/codigos-prueba` muestra los
códigos de barras de los productos simulados, para escanearlos desde la pantalla.

## Permisos

La interfaz pregunta por permisos, nunca por roles: `puede('costs.read')`. Solo oculta o deshabilita lo que el
usuario no puede hacer; quien autoriza de verdad es el servidor.

## Pendientes

Frontend (Inventario):

- Formulario de movimientos (transferencias y devoluciones) y botón "Recibir" para transferencias en tránsito.
  Las funciones ya están en `frontend/src/api/inventario.js`.
- Pantalla de conteos cíclicos (por ahora el conteo se hace desde el escáner, modo F3).
- Editar mínimo, máximo y ubicación por bodega (`POST /inventory/levels`; en la interfaz pedirá `products.update`).

Para alinear con Backend 2:

- Movimientos: el servidor pide `stock.movement.create`, que no existe en los permisos de Backend 1. La interfaz
  usa `stock.receive`, `stock.issue` y `stock.transfer`.
- `POST /inventory/levels` pide `stock.read`; debería pedir `products.update`.
- Rechazar ajustes: falta `POST /inventory/adjustments/:id/reject` (la interfaz ya lo usa).
- Búsqueda exacta por código para el escáner (hoy se filtra en el cliente sobre `?search=`).
- Crear y editar productos devuelve `cost_price` aunque no se tenga `costs.read`.
- Usar la sesión de Backend 1 (cookie `access_token`) en lugar de los encabezados de prueba.
