// Pequeña espera para que se note el estado de carga, como con un servidor real.
// En los tests (Vitest usa MODE 'test') no esperamos, para que corran rápido.
const RETRASO = import.meta.env.MODE === 'test' ? 0 : 300

export function esperar(datos) {
  return new Promise((resolver) => setTimeout(() => resolver(datos), RETRASO))
}
