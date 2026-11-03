import { useId } from 'react'
import Badge from '../../components/Badge.jsx'
import Boton from '../../components/Boton.jsx'
import Input from '../../components/Input.jsx'
import { PASOS_RAPIDOS, textoCantidad, textoDiferencia, totalNuevo, validarCantidad } from './escanerLogica.js'

const TEXTOS = {
  entrada: { cantidad: 'Cantidad a ingresar', ubicacion: 'Ubicación destino', boton: 'Confirmar entrada' },
  salida: { cantidad: 'Cantidad a sacar', ubicacion: 'Ubicación de origen', boton: 'Confirmar salida' },
  conteo: { cantidad: 'Cantidad contada', ubicacion: 'Ubicación contada', boton: 'Registrar conteo' },
}

// Formulario para confirmar la lectura actual.
// No es un <form> a propósito: si Enter confirmara y el lector USB escribiera en la cantidad,
// se registraría un número enorme. Se confirma con el botón o con Ctrl+Enter.
export default function ConfirmacionMovimiento({
  tipo,
  lectura,
  documento,
  confirmando,
  error,
  onCambiar,
  onSumar,
  onCambiarDocumento,
  onConfirmar,
}) {
  const idError = useId()
  const textos = TEXTOS[tipo]
  const { producto } = lectura
  const problema = validarCantidad(tipo, lectura.cantidad, producto.existencias)
  const cantidad = Number(lectura.cantidad)
  const diferencia = cantidad - producto.existencias

  return (
    <div className="confirmacion">
      <div className="confirmacion-cantidad">
        <div className="confirmacion-encabezado">
          <span>{textos.cantidad}</span>
          {!problema && tipo !== 'conteo' && (
            <span className="cifra">Total nuevo: {totalNuevo(tipo, producto.existencias, cantidad)}</span>
          )}
          {!problema && tipo === 'conteo' && (
            <Badge tono={diferencia === 0 ? 'optimo' : 'alerta'} punto>
              {diferencia === 0 ? 'Sin diferencia' : `Diferencia ${textoDiferencia(diferencia)}`}
            </Badge>
          )}
        </div>

        <div className="confirmacion-stepper">
          <Boton variante="secundario" icono="remove" aria-label="Restar 1" onClick={() => onSumar(-1)} />
          <input
            className="campo-control confirmacion-numero cifra"
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            aria-label={textos.cantidad}
            aria-invalid={problema ? true : undefined}
            aria-describedby={problema ? idError : undefined}
            value={lectura.cantidad}
            onChange={(e) => onCambiar({ cantidad: e.target.value })}
          />
          <Boton variante="secundario" icono="add" aria-label="Sumar 1" onClick={() => onSumar(1)} />
        </div>

        <div className="confirmacion-pasos" role="group" aria-label="Sumar rápido">
          {PASOS_RAPIDOS.map((paso) => (
            <button key={paso} type="button" className="confirmacion-paso cifra" onClick={() => onSumar(paso)}>
              +{paso}
            </button>
          ))}
        </div>

        {problema && (
          <p id={idError} className="campo-error">
            {problema}
          </p>
        )}
      </div>

      <fieldset className="confirmacion-ubicacion">
        <legend>{textos.ubicacion}</legend>
        <Input etiqueta="Pasillo" value={lectura.pasillo} onChange={(e) => onCambiar({ pasillo: e.target.value })} />
        <Input etiqueta="Rack" value={lectura.rack} onChange={(e) => onCambiar({ rack: e.target.value })} />
        <Input etiqueta="Gaveta" value={lectura.gaveta} onChange={(e) => onCambiar({ gaveta: e.target.value })} />
      </fieldset>

      {/* El documento se conserva entre lecturas del mismo modo: normalmente se reciben varios productos de la misma orden */}
      <Input
        etiqueta="Documento (opcional)"
        placeholder="OC-1234, RMA-56, remisión…"
        value={documento}
        onChange={(e) => onCambiarDocumento(e.target.value)}
      />

      {error && (
        <p role="alert" className="escaner-error">
          No se pudo registrar: {error}
        </p>
      )}

      <Boton icono="check_circle" cargando={confirmando} disabled={Boolean(problema)} onClick={onConfirmar}>
        {textos.boton} ({problema ? '…' : textoCantidad(tipo, cantidad)}) <kbd>Ctrl + Enter</kbd>
      </Boton>
    </div>
  )
}
