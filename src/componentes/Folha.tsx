import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

// "Folha" (bottom sheet): painel que sobe de baixo, padrão do iOS.
// Tocar fora fecha. Fica acima do teclado graças à variável --teclado (ver useTeclado).
export function Folha({ aberta, aoFechar, titulo, children }: {
  aberta: boolean
  aoFechar: () => void
  titulo?: string
  children: ReactNode
}) {
  // trava a rolagem da página enquanto a folha está aberta
  useEffect(() => {
    if (!aberta) return
    const antes = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = antes
    }
  }, [aberta])

  if (!aberta) return null
  return createPortal(
    <div className="folha-fundo" onClick={aoFechar}>
      <div className="folha" role="dialog" aria-label={titulo} onClick={(e) => e.stopPropagation()}>
        <div className="folha-alca" />
        {titulo && <h2 className="folha-titulo">{titulo}</h2>}
        {children}
      </div>
    </div>,
    document.body,
  )
}

/**
 * No iOS, o teclado não encolhe a página: ele cobre a parte de baixo. Elementos
 * `position: fixed; bottom: 0` ficam escondidos atrás dele. A API visualViewport diz
 * quanto da tela está visível; a diferença vira a variável CSS --teclado.
 */
export function iniciarAjusteDoTeclado() {
  const vv = window.visualViewport
  if (!vv) return
  const atualizar = () => {
    const coberto = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
    document.documentElement.style.setProperty('--teclado', `${coberto}px`)
  }
  vv.addEventListener('resize', atualizar)
  vv.addEventListener('scroll', atualizar)
  atualizar()
}
