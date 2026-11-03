import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// HTTPS solo con "npm run dev:red" (npm guarda el nombre del script en npm_lifecycle_event).
// Sirve para abrir la app desde el teléfono por la red local: el navegador solo permite usar la cámara
// en https o en localhost. El certificado es autofirmado, así que el teléfono pedirá aceptarlo una vez.
const usarHttps = process.env.npm_lifecycle_event === 'dev:red'

export default defineConfig({
  plugins: [react(), usarHttps && basicSsl()],
})
