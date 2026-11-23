import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { SesionProvider } from './auth/SesionContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import App from './App.jsx'
import './styles/tokens.css'
import './styles/global.css'
import './styles/frontend3-variables.css'
import './styles/frontend3-global.css'
import './styles/tailwind-utilities.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <SesionProvider>
          <App />
        </SesionProvider>
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
)
