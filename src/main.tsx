import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './fontes.css'
import './estilo.css'
import { App } from './App'
import { registerSW } from 'virtual:pwa-register'
import { iniciarAjusteDoTeclado } from './componentes/Folha'

iniciarAjusteDoTeclado()

// Atualização automática. O navegador só procura versão nova quando a página carrega,
// mas no iPhone o app instalado quase nunca recarrega: ao reabrir, o iOS só tira a
// tela da memória. Então pedimos a checagem sempre que o app volta para a frente
// (e a cada hora, se ficar aberto). Achou versão nova → instala → a página recarrega
// sozinha (modo autoUpdate do vite-plugin-pwa). Sem internet, a checagem só falha quieta.
registerSW({
  immediate: true,
  onRegisteredSW(_url, registro) {
    if (!registro) return
    const checar = () => registro.update().catch(() => {})
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void checar()
    })
    setInterval(checar, 60 * 60 * 1000)
  },
})

// Pede ao navegador para não apagar o IndexedDB quando faltar espaço.
// No Safari/iOS não tenho certeza de quanto isso ajuda (a política da Apple muda
// entre versões); o backup em JSON continua sendo a garantia de verdade.
navigator.storage?.persist?.().catch(() => {})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
