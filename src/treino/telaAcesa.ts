import { useEffect } from 'react'

/**
 * Mantém a tela acesa enquanto o treino está aberto (Screen Wake Lock API).
 * No iPhone funciona no Safari 16.4+; em app instalado na Tela de Início, só a partir
 * do iOS 18.4, se não me engano (vale confirmar). Onde não existir, simplesmente não faz nada.
 * O iOS solta a trava quando o app sai da tela, então pedimos de novo ao voltar.
 */
export function useTelaAcesa() {
  useEffect(() => {
    let trava: WakeLockSentinel | null = null
    let ativo = true
    const pedir = async () => {
      try {
        if (ativo && document.visibilityState === 'visible' && 'wakeLock' in navigator) {
          trava = await navigator.wakeLock.request('screen')
        }
      } catch {
        /* sem suporte ou negado */
      }
    }
    void pedir()
    document.addEventListener('visibilitychange', pedir)
    return () => {
      ativo = false
      document.removeEventListener('visibilitychange', pedir)
      void trava?.release().catch(() => {})
    }
  }, [])
}
