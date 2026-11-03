import { useState } from 'react'
import Badge from './components/Badge.jsx'
import Boton from './components/Boton.jsx'
import Input from './components/Input.jsx'
import Modal from './components/Modal.jsx'
import Paginacion from './components/Paginacion.jsx'
import Select from './components/Select.jsx'
import Tabla from './components/Tabla.jsx'

// Página de muestra de los componentes base. Solo existe en desarrollo (ver App.jsx).
const filasDemo = Array.from({ length: 23 }, (_, i) => ({
  id: i + 1,
  nombre: `Elemento ${i + 1}`,
  cantidad: (i * 37) % 120,
}))

const columnasDemo = [
  { clave: 'nombre', titulo: 'Nombre' },
  { clave: 'cantidad', titulo: 'Cantidad', alinear: 'derecha' },
  {
    clave: 'estado',
    titulo: 'Estado',
    render: (fila) =>
      fila.cantidad === 0 ? (
        <Badge tono="neutro" punto>
          Agotado
        </Badge>
      ) : fila.cantidad < 20 ? (
        <Badge tono="critico" punto>
          Crítico
        </Badge>
      ) : (
        <Badge tono="optimo" punto>
          Óptimo
        </Badge>
      ),
  },
]

export default function ComponentesDemo() {
  const [modalAbierto, setModalAbierto] = useState(false)
  const [compacta, setCompacta] = useState(false)
  const [seleccionadas, setSeleccionadas] = useState([])
  const [pagina, setPagina] = useState(1)
  const [porPagina, setPorPagina] = useState(10)

  const filasPagina = filasDemo.slice((pagina - 1) * porPagina, pagina * porPagina)

  return (
    <div style={{ display: 'grid', gap: '2rem', maxWidth: '60rem' }}>
      <h1>Componentes base</h1>

      <section>
        <h2>Boton</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          <Boton icono="add">Primario</Boton>
          <Boton variante="secundario">Secundario</Boton>
          <Boton variante="peligro" icono="delete">
            Peligro
          </Boton>
          <Boton cargando>Guardando</Boton>
          <Boton disabled>Deshabilitado</Boton>
          <Boton variante="secundario" icono="edit" aria-label="Editar" />
        </div>
      </section>

      <section>
        <h2>Input y Select</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(14rem, 1fr))', gap: '1rem' }}>
          <Input etiqueta="Nombre" placeholder="Escribe un nombre" />
          <Input etiqueta="Precio" type="number" error="El precio debe ser mayor a 0" />
          <Select etiqueta="Unidad">
            <option>Pieza</option>
            <option>Caja</option>
          </Select>
        </div>
      </section>

      <section>
        <h2>Badge</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          <Badge tono="optimo" punto>
            Óptimo
          </Badge>
          <Badge tono="alerta" punto>
            Stock bajo
          </Badge>
          <Badge tono="critico" punto>
            Crítico
          </Badge>
          <Badge tono="neutro" punto>
            Agotado
          </Badge>
          <Badge tono="info">Categoría</Badge>
        </div>
      </section>

      <section>
        <h2>Tabla y Paginacion</h2>
        <p>
          <label>
            <input type="checkbox" checked={compacta} onChange={(e) => setCompacta(e.target.checked)} /> Compacta
          </label>{' '}
          · Seleccionadas: {seleccionadas.length}
        </p>
        <Tabla
          columnas={columnasDemo}
          filas={filasPagina}
          compacta={compacta}
          seleccionadas={seleccionadas}
          onCambiarSeleccion={setSeleccionadas}
        />
        <Paginacion
          pagina={pagina}
          porPagina={porPagina}
          totalElementos={filasDemo.length}
          onCambiar={setPagina}
          onCambiarPorPagina={(n) => {
            setPorPagina(n)
            setPagina(1)
          }}
        />
        <Tabla columnas={columnasDemo} filas={[]} />
      </section>

      <section>
        <h2>Modal</h2>
        <Boton onClick={() => setModalAbierto(true)}>Abrir modal</Boton>
        <Modal
          abierto={modalAbierto}
          onCerrar={() => setModalAbierto(false)}
          titulo="Ejemplo de modal"
          acciones={
            <>
              <Boton variante="secundario" onClick={() => setModalAbierto(false)}>
                Cancelar
              </Boton>
              <Boton onClick={() => setModalAbierto(false)}>Aceptar</Boton>
            </>
          }
        >
          <Input etiqueta="Campo dentro del modal" />
        </Modal>
      </section>
    </div>
  )
}
