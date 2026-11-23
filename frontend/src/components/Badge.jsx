import './Badge.css'

// tono: 'optimo' | 'alerta' | 'critico' | 'neutro' | 'info'
// punto: muestra un círculo de color antes del texto (para estados)
export default function Badge({ tono = 'neutro', punto = false, children }) {
  return (
    <span className={`badge badge-${tono}`}>
      {punto && <span className="badge-punto" aria-hidden="true" />}
      {children}
    </span>
  )
}
