import { useEffect, useState } from 'react'

// Pide datos al servidor cada vez que cambia "clave" (un texto con los filtros actuales).
// pedir: función que regresa una promesa con los datos.
// Igual que en Productos: la respuesta recuerda con qué clave se pidió; si no es la actual, está cargando,
// y una respuesta vieja que llegue tarde se ignora. Mientras carga se siguen mostrando los datos anteriores.
export function useCarga(clave, pedir) {
  const [respuesta, setRespuesta] = useState({ clave: null, datos: null, error: null })

  useEffect(() => {
    let vigente = true
    pedir()
      .then((datos) => {
        if (vigente) setRespuesta({ clave, datos, error: null })
      })
      .catch((e) => {
        if (vigente) setRespuesta((anterior) => ({ clave, datos: anterior.datos, error: e.message }))
      })
    return () => {
      vigente = false
    }
    // pedir es una función nueva en cada render; lo que importa es la clave
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave])

  return {
    datos: respuesta.datos,
    cargando: respuesta.clave !== clave,
    error: respuesta.clave === clave ? respuesta.error : null,
  }
}
