import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { listarCategorias, obtenerProducto } from '../../api/productos.js'
import { usePuede } from '../../auth/usePuede.js'
import Badge from '../../components/Badge.jsx'
import Boton from '../../components/Boton.jsx'
import PrecioVenta from './PrecioVenta.jsx'
import ProductoImagen from './ProductoImagen.jsx'
import ProductoModal from './ProductoModal.jsx'
import { ESTADOS_STOCK, SIN_DATO, formatoDinero, nombreCategoria } from './productoFormato.js'
import './productos.css'
import './ProductoDetallePage.css'

export default function ProductoDetallePage() {
  const { id } = useParams() // viene de la URL /productos/:id, siempre como texto
  const location = useLocation()
  const puede = usePuede()
  const [editando, setEditando] = useState(false)
  const [categorias, setCategorias] = useState([])
  const [aviso, setAviso] = useState(null)
  const [copiado, setCopiado] = useState(false)

  // Para probar el escáner sin lector: se copia el código y se pega en el campo de lectura
  async function copiarCodigo() {
    try {
      await navigator.clipboard.writeText(producto.codigoBarras)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      // Sin permiso para el portapapeles: el código sigue visible para copiarlo a mano
    }
  }
  const [recargas, setRecargas] = useState(0)

  // Igual que en la lista: la respuesta recuerda con qué "clave" se pidió; si no es la actual, está cargando
  const clave = `${id}|${recargas}`
  const [respuesta, setRespuesta] = useState({ clave: null, producto: null, error: null })
  const cargando = respuesta.clave !== clave
  const producto = respuesta.producto
  const error = respuesta.clave === clave ? respuesta.error : null

  useEffect(() => {
    let vigente = true
    obtenerProducto(Number(id))
      .then((nuevo) => {
        if (vigente) setRespuesta({ clave, producto: nuevo, error: null })
      })
      .catch((e) => {
        if (vigente) setRespuesta({ clave, producto: null, error: e.message })
      })
    return () => {
      vigente = false
    }
  }, [clave, id])

  // Las categorías dan el nombre de la del producto (el producto solo trae su id) y llenan el formulario.
  // Si fallan, se muestra "—" en lugar del nombre.
  const puedeEditar = puede('products.update')
  useEffect(() => {
    listarCategorias()
      .then(setCategorias)
      .catch(() => setCategorias([]))
  }, [])

  function alGuardar(mensaje, tipo = 'exito') {
    setEditando(false)
    setAviso({ tipo, texto: mensaje })
    setRecargas((n) => n + 1)
  }

  // Si llegamos desde la lista, volvemos con los mismos filtros (la lista los manda en el state del enlace)
  const filtrosLista = location.state?.filtrosLista
  const volver = (
    <Link to={filtrosLista ? `/productos?${filtrosLista}` : '/productos'} className="detalle-volver">
      <span className="material-symbols-outlined" aria-hidden="true">
        arrow_back
      </span>
      Volver al catálogo
    </Link>
  )

  if (cargando && !producto)
    return (
      <section>
        {volver}
        <p>Cargando producto…</p>
      </section>
    )
  if (error) {
    return (
      <section>
        {volver}
        <p role="alert" className="productos-error">
          No se pudo cargar el producto: {error}
        </p>
      </section>
    )
  }

  const estado = ESTADOS_STOCK[producto.estadoStock]

  return (
    <section>
      {volver}

      <header className="detalle-encabezado">
        <div className="detalle-titulo">
          <ProductoImagen src={producto.imagen} alt={producto.nombre} tamano="grande" />
          <div>
            <h1>{producto.nombre}</h1>
            <div className="detalle-etiquetas">
              <span className="producto-sku">{producto.sku}</span>
              <Badge tono="info">{nombreCategoria(categorias, producto.categoriaId)}</Badge>
              {estado && (
                <Badge tono={estado.tono} punto>
                  {estado.texto}
                </Badge>
              )}
              {producto.archivado && <Badge tono="neutro">Archivado</Badge>}
            </div>
          </div>
        </div>
        {/* Un archivado se restaura desde la lista antes de editarlo */}
        {puedeEditar && !producto.archivado && (
          <Boton
            icono="edit"
            onClick={() => {
              setAviso(null)
              setEditando(true)
            }}
          >
            Editar
          </Boton>
        )}
      </header>

      {aviso && (
        <p role="status" className={`productos-aviso productos-aviso-${aviso.tipo}`}>
          {aviso.texto}
        </p>
      )}

      <div className="detalle-tarjetas">
        <article className="detalle-tarjeta">
          <h2>Inventario</h2>
          {/* Las existencias, el mínimo y la ubicación son por bodega; /products no los trae */}
          <dl>
            <dt>Existencias</dt>
            <dd className="cifra">{producto.existencias ?? SIN_DATO}</dd>
          </dl>
          <p className="detalle-nota">
            Existencias, mínimos y ubicación por bodega en <Link to="/inventario">Inventario › Existencias</Link>.
          </p>
        </article>

        <article className="detalle-tarjeta">
          <h2>Precios</h2>
          <dl>
            <dt>Precio de venta</dt>
            <dd className="cifra">
              <PrecioVenta valor={producto.precioVenta} />
            </dd>
            {/* Solo la UI lo oculta; sin costs.read el servidor ni siquiera manda el costo */}
            {puede('costs.read') && producto.precioCompra != null && (
              <>
                <dt>Costo</dt>
                <dd className="cifra">{formatoDinero.format(producto.precioCompra)}</dd>
              </>
            )}
          </dl>
        </article>

        <article className="detalle-tarjeta">
          <h2>Información</h2>
          <dl>
            <dt>Código de barras</dt>
            <dd className="detalle-codigo">
              <span className="cifra">{producto.codigoBarras ?? SIN_DATO}</span>
              {producto.codigoBarras && (
                <Boton
                  variante="secundario"
                  icono={copiado ? 'check' : 'content_copy'}
                  aria-label={copiado ? 'Código copiado' : 'Copiar código de barras'}
                  onClick={copiarCodigo}
                />
              )}
            </dd>
            <dt>Unidad</dt>
            <dd>{producto.unidad}</dd>
            <dt>Descripción</dt>
            <dd>{producto.descripcion || 'Sin descripción.'}</dd>
          </dl>
        </article>
      </div>

      {editando && (
        <ProductoModal
          idProducto={producto.id}
          categorias={categorias}
          onCerrar={() => setEditando(false)}
          onGuardado={alGuardar}
        />
      )}
    </section>
  )
}
