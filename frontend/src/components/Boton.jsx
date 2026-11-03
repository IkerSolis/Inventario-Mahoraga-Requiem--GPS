import './Boton.css'

// variante: 'primario' | 'secundario' | 'peligro'
// cargando: deshabilita el botón y muestra un indicador (evita el doble envío)
// Si el botón solo lleva ícono, pasar aria-label con el texto.
export default function Boton({
  variante = 'primario',
  icono,
  cargando = false,
  disabled,
  type = 'button',
  children,
  ...resto
}) {
  const simbolo = cargando ? 'progress_activity' : icono

  return (
    <button
      type={type}
      className={`boton boton-${variante}`}
      disabled={disabled || cargando}
      aria-busy={cargando || undefined}
      {...resto}
    >
      {simbolo && (
        <span className={`material-symbols-outlined ${cargando ? 'girando' : ''}`} aria-hidden="true">
          {simbolo}
        </span>
      )}
      {children}
    </button>
  )
}
