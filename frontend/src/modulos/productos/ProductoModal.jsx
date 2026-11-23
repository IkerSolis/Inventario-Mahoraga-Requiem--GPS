import { useEffect, useId, useMemo, useState } from 'react'
import {
  actualizarProducto,
  crearProducto,
  generarCodigoBarras,
  generarSku,
  obtenerProducto,
} from '../../api/productos.js'
import { usePuede } from '../../auth/usePuede.js'
import Boton from '../../components/Boton.jsx'
import Input from '../../components/Input.jsx'
import Modal from '../../components/Modal.jsx'
import Select from '../../components/Select.jsx'
import Textarea from '../../components/Textarea.jsx'
import ProductoImagen from './ProductoImagen.jsx'
import { UNIDADES, erroresPorCampo, esquemaSegunPermisos, validarImagen } from './productoSchema.js'
import './productos.css'
import './ProductoModal.css'

// Los <input> trabajan con texto, así que los números se pasan a texto para el formulario
function valoresIniciales(producto) {
  return {
    sku: producto?.sku ?? '',
    codigoBarras: producto?.codigoBarras ?? '',
    nombre: producto?.nombre ?? '',
    descripcion: producto?.descripcion ?? '',
    categoriaId: producto?.categoriaId?.toString() ?? '',
    unidad: producto?.unidad ?? 'pieza',
    precioCompra: producto?.precioCompra?.toString() ?? '',
    precioVenta: producto?.precioVenta?.toString() ?? '',
  }
}

// idProducto: null para crear uno nuevo, o el id del producto a editar.
// categorias: [{ id, nombre }] que ya cargó la página.
// Al editar se pide el producto completo al servidor, así el formulario abre con los datos más recientes.
// La página lo monta al abrir y lo desmonta al cerrar, así el formulario siempre empieza limpio.
export default function ProductoModal({ idProducto, categorias, onCerrar, onGuardado }) {
  const puede = usePuede()
  const esNuevo = idProducto == null
  const puedeVerCosto = puede('costs.read')
  const puedeEditarPrecio = puede('prices.manage')
  const idFormulario = useId()

  const [producto, setProducto] = useState(null)
  const [cargando, setCargando] = useState(!esNuevo)
  const [errorCarga, setErrorCarga] = useState(null)
  const [valores, setValores] = useState(() => valoresIniciales(null))
  const [errores, setErrores] = useState({})
  const [errorServidor, setErrorServidor] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [archivo, setArchivo] = useState(null) // imagen nueva elegida (File), todavía sin subir
  const [generandoCodigo, setGenerandoCodigo] = useState(false)

  // Vista previa: el navegador crea una URL temporal para el archivo; se libera al cambiarlo o al cerrar
  const vistaPrevia = useMemo(() => (archivo ? URL.createObjectURL(archivo) : null), [archivo])
  useEffect(() => {
    return () => {
      if (vistaPrevia) URL.revokeObjectURL(vistaPrevia)
    }
  }, [vistaPrevia])

  // Al crear, el SKU lo propone el servidor (GET /products/generate/sku); se puede cambiar antes de guardar.
  // Si falla, el campo queda vacío para escribirlo a mano.
  useEffect(() => {
    if (!esNuevo) return
    let vigente = true
    generarSku()
      .then((sku) => {
        if (vigente) setValores((actuales) => (actuales.sku ? actuales : { ...actuales, sku }))
      })
      .catch(() => {})
    return () => {
      vigente = false
    }
  }, [esNuevo])

  useEffect(() => {
    if (esNuevo) return
    let vigente = true
    obtenerProducto(idProducto)
      .then((respuesta) => {
        if (!vigente) return
        setProducto(respuesta)
        setValores(valoresIniciales(respuesta))
      })
      .catch((error) => {
        if (vigente) setErrorCarga(error.message)
      })
      .finally(() => {
        if (vigente) setCargando(false)
      })
    return () => {
      vigente = false
    }
  }, [esNuevo, idProducto])

  // Si la categoría del producto no viene en la lista (inactiva, o falló la carga), se agrega con su número
  const idCategoria = Number(valores.categoriaId)
  const opcionesCategoria =
    !idCategoria || categorias.some((c) => c.id === idCategoria)
      ? categorias
      : [{ id: idCategoria, nombre: `Categoría ${idCategoria}` }, ...categorias]

  function cambiar(e) {
    const { name, value } = e.target
    setValores({ ...valores, [name]: value })
    // Al corregir un campo, su error desaparece
    if (errores[name]) setErrores({ ...errores, [name]: undefined })
  }

  // El servidor genera un EAN-13 válido (750 + 9 dígitos + verificador)
  async function generarCodigo() {
    setGenerandoCodigo(true)
    try {
      const codigo = await generarCodigoBarras()
      setValores((actuales) => ({ ...actuales, codigoBarras: codigo }))
      setErrores((actuales) => ({ ...actuales, codigoBarras: undefined }))
    } catch (error) {
      setErrores((actuales) => ({ ...actuales, codigoBarras: `No se pudo generar: ${error.message}` }))
    } finally {
      setGenerandoCodigo(false)
    }
  }

  // La imagen se valida en cuanto se elige, sin esperar a guardar
  function elegirImagen(e) {
    const elegido = e.target.files[0]
    if (!elegido) return
    const problema = validarImagen(elegido)
    if (problema) {
      e.target.value = '' // vacía el campo para que no parezca elegida
      setArchivo(null)
      setErrores({ ...errores, imagen: problema })
      return
    }
    setArchivo(elegido)
    setErrores({ ...errores, imagen: undefined })
  }

  async function guardar(e) {
    e.preventDefault()
    const esquema = esquemaSegunPermisos({ puedeEditarCosto: puedeVerCosto, puedeEditarPrecio })
    const resultado = esquema.safeParse(valores)
    if (!resultado.success || errores.imagen) {
      const erroresZod = resultado.success ? {} : erroresPorCampo(resultado.error)
      setErrores({ ...erroresZod, imagen: errores.imagen })
      return
    }

    setGuardando(true)
    setErrorServidor(null)
    try {
      // La imagen viaja en la misma petición (multipart, campo "image"); si no hay, va como JSON
      if (esNuevo) await crearProducto(resultado.data, archivo)
      else await actualizarProducto(producto.id, resultado.data, archivo)
      onGuardado(esNuevo ? 'Producto creado.' : 'Cambios guardados.')
    } catch (error) {
      setErrorServidor(error.message)
    } finally {
      setGuardando(false)
    }
  }

  // Atajo para no repetir name/value/onChange/error en cada campo
  function campo(nombre) {
    return { name: nombre, value: valores[nombre], onChange: cambiar, error: errores[nombre] }
  }

  const hayErrores = Object.values(errores).some(Boolean)

  return (
    <Modal
      abierto
      amplio
      onCerrar={onCerrar}
      titulo={esNuevo ? 'Nuevo producto' : `Editar producto${producto ? ` · ${producto.sku}` : ''}`}
      acciones={
        <>
          <Boton variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton type="submit" form={idFormulario} cargando={guardando} disabled={cargando || Boolean(errorCarga)}>
            {esNuevo ? 'Crear producto' : 'Guardar cambios'}
          </Boton>
        </>
      }
    >
      {cargando && <p>Cargando producto…</p>}
      {errorCarga && (
        <p role="alert" className="productos-aviso productos-aviso-error">
          No se pudo cargar el producto: {errorCarga}
        </p>
      )}

      {/* noValidate: los mensajes los da Zod, no el navegador */}
      {!cargando && !errorCarga && (
        <form id={idFormulario} className="producto-form" onSubmit={guardar} noValidate>
          {hayErrores && (
            <p role="alert" className="productos-aviso productos-aviso-error producto-form-completo">
              Revisa los campos marcados.
            </p>
          )}
          {errorServidor && (
            <p role="alert" className="productos-aviso productos-aviso-error producto-form-completo">
              No se pudo guardar: {errorServidor}
            </p>
          )}

          <div className="producto-form-completo">
            <Input etiqueta="Nombre" maxLength={120} autoFocus {...campo('nombre')} />
          </div>
          <Input etiqueta={esNuevo ? 'SKU (propuesto por el sistema)' : 'SKU'} maxLength={64} {...campo('sku')} />
          <div className="producto-form-codigo">
            <Input etiqueta="Código de barras (opcional)" maxLength={100} {...campo('codigoBarras')} />
            {puede('products.create') && (
              <Boton variante="secundario" icono="barcode" cargando={generandoCodigo} onClick={generarCodigo}>
                Generar
              </Boton>
            )}
          </div>
          <div className="producto-form-completo">
            <Textarea etiqueta="Descripción (opcional)" maxLength={500} {...campo('descripcion')} />
          </div>

          {/* Muestra la imagen nueva si eligieron una; si no, la que ya tenía el producto */}
          <div className="producto-form-completo producto-form-imagen">
            <ProductoImagen src={vistaPrevia ?? producto?.imagen} alt="Vista previa de la imagen" tamano="grande" />
            <Input
              etiqueta="Imagen (opcional, PNG o JPG de hasta 5 MB)"
              type="file"
              accept="image/png,image/jpeg"
              onChange={elegirImagen}
              error={errores.imagen}
            />
          </div>

          <Select etiqueta="Categoría" {...campo('categoriaId')}>
            <option value="">Elige una categoría</option>
            {opcionesCategoria.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </Select>

          <Select etiqueta="Unidad" {...campo('unidad')}>
            {UNIDADES.map((unidad) => (
              <option key={unidad} value={unidad}>
                {unidad}
              </option>
            ))}
          </Select>

          {puedeVerCosto && (
            <Input etiqueta="Costo" type="number" min={0} step="0.01" inputMode="decimal" {...campo('precioCompra')} />
          )}
          <Input
            etiqueta={puedeEditarPrecio ? 'Precio de venta' : 'Precio de venta (sin permiso para editar)'}
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            disabled={!puedeEditarPrecio}
            {...campo('precioVenta')}
          />

          <p className="producto-form-completo producto-form-nota">
            El stock mínimo, el máximo y la ubicación (pasillo, rack, gaveta) se configuran por bodega en Inventario ›
            Existencias.
          </p>
        </form>
      )}
    </Modal>
  )
}
