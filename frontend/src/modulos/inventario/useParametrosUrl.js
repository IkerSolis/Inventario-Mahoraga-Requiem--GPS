import { useSearchParams } from 'react-router-dom'

// Filtros y página guardados en la URL (?bodega=1&estado=bajo&pagina=2), como en Productos:
// se conservan al recargar y se pueden compartir como enlace.
// Devuelve [leer(nombre), cambiar({ nombre: valor })]. Los valores vacíos se quitan de la URL,
// y cualquier cambio que no sea de página regresa a la página 1.
export function useParametrosUrl() {
  const [parametros, setParametros] = useSearchParams()

  function leer(nombre) {
    return parametros.get(nombre) ?? ''
  }

  function cambiar(cambios) {
    setParametros(
      (actuales) => {
        const nuevos = new URLSearchParams(actuales)
        if (!('pagina' in cambios)) nuevos.delete('pagina')
        for (const [clave, valor] of Object.entries(cambios)) {
          if (valor === '' || valor == null || (clave === 'pagina' && Number(valor) === 1)) nuevos.delete(clave)
          else nuevos.set(clave, String(valor))
        }
        return nuevos
      },
      { replace: true },
    )
  }

  return [leer, cambiar]
}
