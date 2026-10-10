import { useEffect, useState } from 'react'
import { IconeEscrever } from '../icones'
import { EditorPensamento } from './EditorPensamento'

// Botão pequeno fixo → campo de texto. O editor fica montado mesmo fechado, então
// fechar tocando fora não perde o rascunho: ele volta na próxima abertura.
export function CapturaPensamento() {
  const [aberta, setAberta] = useState(false)
  const escondido = useEscondeAoRolar()
  return (
    <>
      <button
        className="botao-captura"
        data-escondido={escondido || undefined}
        onClick={() => setAberta(true)}
        aria-label="Anotar pensamento"
      >
        <IconeEscrever />
      </button>
      <EditorPensamento aberta={aberta} aoFechar={() => setAberta(false)} />
    </>
  )
}

/**
 * Some enquanto a pessoa rola para baixo (para não cobrir os blocos) e volta ao
 * rolar para cima ou um instante depois de parar.
 */
function useEscondeAoRolar() {
  const [escondido, setEscondido] = useState(false)
  useEffect(() => {
    let ultimo = window.scrollY
    let timer: number | undefined
    const aoRolar = () => {
      const y = window.scrollY
      if (y > ultimo + 4 && y > 40) setEscondido(true)
      else if (y < ultimo - 4) setEscondido(false)
      ultimo = y
      clearTimeout(timer)
      timer = window.setTimeout(() => setEscondido(false), 900)
    }
    window.addEventListener('scroll', aoRolar, { passive: true })
    return () => {
      window.removeEventListener('scroll', aoRolar)
      clearTimeout(timer)
    }
  }, [])
  return escondido
}
