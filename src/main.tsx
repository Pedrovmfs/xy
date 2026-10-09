import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './fontes.css'
import './estilo.css'
import { App } from './App'
import { iniciarAjusteDoTeclado } from './componentes/Folha'

iniciarAjusteDoTeclado()

// Pede ao navegador para não apagar o IndexedDB quando faltar espaço.
// No Safari/iOS não tenho certeza de quanto isso ajuda (a política da Apple muda
// entre versões); o backup em JSON continua sendo a garantia de verdade.
navigator.storage?.persist?.().catch(() => {})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
