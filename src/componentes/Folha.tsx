import { useEffect, useRef, type PointerEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

const DURACAO_SAIDA = 220 // ms
const DISTANCIA_PARA_FECHAR = 110 // px puxados para baixo
const VELOCIDADE_PARA_FECHAR = 0.6 // px/ms: um "peteleco" rápido também fecha

// "Folha" (bottom sheet): painel que sobe de baixo, padrão do iOS.
// Fecha tocando fora ou segurando o topo (alça + título) e puxando para baixo.
// Fica acima do teclado graças à variável --teclado (ver iniciarAjusteDoTeclado).
export function Folha({ aberta, aoFechar, titulo, children }: {
  aberta: boolean
  aoFechar: () => void
  titulo?: string
  children: ReactNode
}) {
  const folha = useRef<HTMLDivElement>(null)
  const fundo = useRef<HTMLDivElement>(null)
  const fechando = useRef(false)
  const arrasto = useRef<{ y0: number; dy: number; ultimoY: number; ultimoT: number; velocidade: number } | null>(null)

  // trava a rolagem da página enquanto a folha está aberta
  useEffect(() => {
    if (!aberta) return
    fechando.current = false
    const antes = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = antes
    }
  }, [aberta])

  // Desliza para baixo e só então avisa o pai (que desmonta a folha).
  function fecharAnimado() {
    if (fechando.current) return
    fechando.current = true
    ;(document.activeElement as HTMLElement | null)?.blur?.() // recolhe o teclado junto
    const f = folha.current
    const b = fundo.current
    if (f) {
      f.style.transition = `transform ${DURACAO_SAIDA}ms ease-in`
      f.style.transform = 'translateY(110%)'
    }
    if (b) {
      b.style.transition = `background-color ${DURACAO_SAIDA}ms`
      b.style.backgroundColor = 'transparent'
    }
    setTimeout(aoFechar, DURACAO_SAIDA)
  }

  // As mudanças durante o arrasto vão direto no estilo (sem re-renderizar o React
  // a cada pixel), para o movimento ficar liso.
  function aoPressionar(e: PointerEvent<HTMLDivElement>) {
    if (e.button !== 0 || fechando.current) return
    e.currentTarget.setPointerCapture(e.pointerId)
    arrasto.current = { y0: e.clientY, dy: 0, ultimoY: e.clientY, ultimoT: e.timeStamp, velocidade: 0 }
    if (folha.current) folha.current.style.transition = 'none'
  }

  function aoMover(e: PointerEvent<HTMLDivElement>) {
    const a = arrasto.current
    if (!a) return
    const dt = e.timeStamp - a.ultimoT
    if (dt > 0) a.velocidade = (e.clientY - a.ultimoY) / dt
    a.ultimoY = e.clientY
    a.ultimoT = e.timeStamp
    a.dy = Math.max(0, e.clientY - a.y0)
    const f = folha.current
    if (f) f.style.transform = `translateY(${a.dy}px)`
    if (fundo.current && f) {
      const opacidade = 0.3 * (1 - Math.min(1, a.dy / f.offsetHeight))
      fundo.current.style.backgroundColor = `rgb(0 0 0 / ${opacidade})`
    }
  }

  function aoSoltar() {
    const a = arrasto.current
    arrasto.current = null
    if (!a) return
    if (a.dy > DISTANCIA_PARA_FECHAR || (a.dy > 10 && a.velocidade > VELOCIDADE_PARA_FECHAR)) {
      fecharAnimado()
      return
    }
    // não puxou o bastante: volta para o lugar
    const f = folha.current
    if (f) {
      f.style.transition = 'transform 0.2s ease-out'
      f.style.transform = ''
    }
    if (fundo.current) fundo.current.style.backgroundColor = ''
  }

  if (!aberta) return null
  return createPortal(
    <div className="folha-fundo" ref={fundo} onClick={fecharAnimado}>
      <div className="folha" ref={folha} role="dialog" aria-label={titulo} onClick={(e) => e.stopPropagation()}>
        <div
          className="folha-topo"
          onPointerDown={aoPressionar}
          onPointerMove={aoMover}
          onPointerUp={aoSoltar}
          onPointerCancel={aoSoltar}
        >
          <div className="folha-alca" />
          {titulo && <h2 className="folha-titulo">{titulo}</h2>}
        </div>
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
