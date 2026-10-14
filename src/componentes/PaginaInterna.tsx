import type { ReactNode } from 'react'
import { useDeslizar } from '../lib/deslizar'
import { IconeVoltar } from '../icones'

/** Página dentro de uma aba, com voltar (botão ou deslizar da borda esquerda). */
export function PaginaInterna({ titulo, nomeVoltar, aoVoltar, children }: {
  titulo: string
  nomeVoltar: string
  aoVoltar: () => void
  children: ReactNode
}) {
  const deslize = useDeslizar({ podeComecar: (e) => e.clientX < 40, sentidos: [1], aoConfirmar: aoVoltar })
  return (
    <section className="area-detalhe" {...deslize.handlers}>
      <div ref={deslize.alvo}>
        <button className="area-voltar" onClick={aoVoltar}>
          <IconeVoltar /> {nomeVoltar}
        </button>
        <h2 className="area-titulo">{titulo}</h2>
        {children}
      </div>
    </section>
  )
}
