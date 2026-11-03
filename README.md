# Inventario Mahoraga

Sistema de inventario modular. Este repositorio contiene el frontend (React 18 + Vite).

Bloque **Frontend 2**: Productos, Escáner e Inventario.

## Requisitos

- Node.js 22 o más reciente
- npm

## Cómo correrlo

```bash
npm install
npm run dev
```

Abre la dirección que muestra la terminal (normalmente `http://localhost:5173`).

Mientras no esté lista la API, la app funciona con **datos simulados**. En la barra de arriba hay un selector
**Rol de prueba** para ver la app como cualquier rol (R0–R7) y revisar qué se muestra u oculta según los permisos.

## Scripts

| Comando                | Qué hace                           |
| ---------------------- | ---------------------------------- |
| `npm run dev`          | Servidor de desarrollo             |
| `npm run build`        | Compila para producción en `dist/` |
| `npm run preview`      | Sirve lo compilado en `dist/`      |
| `npm test`             | Corre las pruebas (Vitest)         |
| `npm run lint`         | Revisa el código con ESLint        |
| `npm run format`       | Da formato al código con Prettier  |
| `npm run format:check` | Revisa el formato sin cambiar nada |

## Datos simulados o API real

La variable `VITE_USE_MOCK` decide de dónde salen los datos:

- `true` (por defecto, en `.env.development`): datos simulados de `src/api/mock/`.
- `false`: llamadas reales a `/api`.

Para cambiarla solo en tu máquina, copia `.env.example` como `.env.local` y edítalo.

Los formatos de respuesta que espera el frontend están anotados como **contrato provisional** al inicio de cada
archivo de `src/api/` (por ejemplo `src/api/productos.js`), para revisarlos con Backend 2.

## Estructura

```
src/
  api/            Funciones para hablar con el backend; mock/ tiene los datos simulados
  auth/           Sesión del usuario y usePuede() para revisar permisos
  components/     Componentes base reutilizables (Boton, Input, Tabla, Modal...)
  modulos/
    productos/    Catálogo, detalle, formulario y acciones de productos
    escaner/      Escáner (en desarrollo)
    inventario/   Inventario (pendiente)
  styles/         Tokens de diseño (colores, radios, fuente) y estilos globales
```

En desarrollo, `/componentes` muestra todos los componentes base con ejemplos.

## Permisos

La interfaz pregunta por permisos, nunca por roles: `puede('costs.read')`. Solo oculta o deshabilita lo que el
usuario no puede hacer; quien autoriza de verdad es el servidor.
