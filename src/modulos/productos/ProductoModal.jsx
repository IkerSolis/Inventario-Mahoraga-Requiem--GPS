import { useEffect, useId, useState } from 'react'
import { actualizarProducto, crearProducto, obtenerProducto } from '../../api/productos.js'
import { usePuede } from '../../auth/usePuede.js'
import Boton from '../../components/Boton.jsx'
import Input from '../../components/Input.jsx'
import Modal from '../../components/Modal.jsx'
import Select from '../../components/Select.jsx'
import Textarea from '../../components/Textarea.jsx'
import { UNIDADES, erroresPorCampo, esquemaSegunPermisos } from './productoSchema.js'
import './productos.css'
import './ProductoModal.css'

// Los <input> trabajan con texto, así que los números se pasan a texto para el formulario
function valoresIniciales(producto) {
  return {
    nombre: producto?.nombre ?? '',
    descripcion: producto?.descripcion ?? '',
    categoria: producto?.categoria ?? '',
    marca: producto?.marca ?? '',
    unidad: producto?.unidad ?? 'pieza',
    precioCompra: producto?.precioCompra?.toString() ?? '',
    precioVenta: producto?.precioVenta?.toString() ?? '',
    stockMinimo: producto?.stockMinimo?.toString() ?? '',
    pasillo: producto?.pasillo ?? '',
    rack: producto?.rack ?? '',
    gaveta: producto?.gaveta ?? '',
  }
}

// idProducto: null para crear uno nuevo, o el id del producto a editar.
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

  // Si la categoría del producto no viene en la lista (por ejemplo, si falló la carga), la agregamos
  const opcionesCategoria =
    !valores.categoria || categorias.includes(valores.categoria) ? categorias : [valores.categoria, ...categorias]

  function cambiar(e) {
    const { name, value } = e.target
    setValores({ ...valores, [name]: value })
    // Al corregir un campo, su error desaparece
    if (errores[name]) setErrores({ ...errores, [name]: undefined })
  }

  async function guardar(e) {
    e.preventDefault()
    const esquema = esquemaSegunPermisos({ puedeEditarCosto: puedeVerCosto, puedeEditarPrecio })
    const resultado = esquema.safeParse(valores)
    if (!resultado.success) {
      setErrores(erroresPorCampo(resultado.error))
      return
    }

    setGuardando(true)
    setErrorServidor(null)
    try {
      if (esNuevo) await crearProducto(resultado.data)
      else await actualizarProducto(producto.id, resultado.data)
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
          <Boton variante="secundario" onClick={onCerrar}>Cancelar</Boton>
          <Boton type="submit" form={idFormulario} cargando={guardando} disabled={cargando || Boolean(errorCarga)}>
            {esNuevo ? 'Crear producto' : 'Guardar cambios'}
          </Boton>
        </>
      }
    >
      {cargando && <p>Cargando producto…</p>}
      {errorCarga && (
        <p role="alert" className="productos-aviso productos-aviso-error">No se pudo cargar el producto: {errorCarga}</p>
      )}

      {/* noValidate: los mensajes los da Zod, no el navegador */}
      {!cargando && !errorCarga && (
        <form id={idFormulario} className="producto-form" onSubmit={guardar} noValidate>
          {hayErrores && (
            <p role="alert" className="productos-aviso productos-aviso-error producto-form-completo">Revisa los campos marcados.</p>
          )}
          {errorServidor && (
            <p role="alert" className="productos-aviso productos-aviso-error producto-form-completo">
              No se pudo guardar: {errorServidor}
            </p>
          )}

          <div className="producto-form-completo">
            <Input etiqueta="Nombre" maxLength={120} autoFocus {...campo('nombre')} />
          </div>
          <div className="producto-form-completo">
            <Textarea etiqueta="Descripción (opcional)" maxLength={500} {...campo('descripcion')} />
          </div>

          <Select etiqueta="Categoría" {...campo('categoria')}>
            <option value="">Elige una categoría</option>
            {opcionesCategoria.map((nombre) => (
              <option key={nombre} value={nombre}>{nombre}</option>
            ))}
          </Select>
          <Input etiqueta="Marca (opcional)" maxLength={60} {...campo('marca')} />

          <Select etiqueta="Unidad" {...campo('unidad')}>
            {UNIDADES.map((unidad) => (
              <option key={unidad} value={unidad}>{unidad}</option>
            ))}
          </Select>
          <Input etiqueta="Stock mínimo" type="number" min={0} step={1} inputMode="numeric" {...campo('stockMinimo')} />

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

          <fieldset className="producto-ubicacion producto-form-completo">
            <legend>Ubicación en almacén</legend>
            <Input etiqueta="Pasillo" maxLength={10} {...campo('pasillo')} />
            <Input etiqueta="Rack" maxLength={10} {...campo('rack')} />
            <Input etiqueta="Gaveta" maxLength={10} {...campo('gaveta')} />
          </fieldset>
        </form>
      )}
    </Modal>
  )
}
