import { useRef, type MouseEvent, type PointerEvent } from 'react'
import { gestos } from './gestos'

// Deslizar para o lado (trocar de dia no Hoje; voltar em Ajustes).
//
// Como não brigar com a rolagem: a área tem `touch-action: pan-y` no CSS, então o
// navegador cuida da rolagem vertical sozinho e só os movimentos horizontais chegam
// aqui. Se o dedo começar a ir mais para cima/baixo do que para o lado, desistimos.

const DECIDIR = 10 // px até decidir se o gesto é horizontal ou vertical
const LIMITE = 70 // px arrastados para confirmar
const VELOCIDADE = 0.45 // px/ms: deslize rápido confirma mesmo curto
const DURACAO = 160 // ms das animações

interface Opcoes {
  /** O gesto pode começar aqui? (ex.: só perto da borda esquerda) */
  podeComecar?: (e: PointerEvent) => boolean
  /** Quais sentidos valem: 1 = para a direita, -1 = para a esquerda. */
  sentidos: (1 | -1)[]
  /** Chamado com o sentido depois que o conteúdo saiu da tela. */
  aoConfirmar: (sentido: 1 | -1) => void
}

export function useDeslizar({ podeComecar, sentidos, aoConfirmar }: Opcoes) {
  const alvo = useRef<HTMLDivElement>(null)
  const g = useRef<{ x0: number; y0: number; dx: number; t: number; v: number; horizontal: boolean | null } | null>(null)
  const engolirClique = useRef(false)

  const estilo = (transform: string, opacidade: string, transicao: string) => {
    const el = alvo.current
    if (!el) return
    el.style.transition = transicao
    el.style.transform = transform
    el.style.opacity = opacidade
  }

  function onPointerDown(e: PointerEvent) {
    if (e.button !== 0 || gestos.ocupado || (podeComecar && !podeComecar(e))) return
    // eventos de dentro de uma folha "sobem" pela árvore do React até aqui: ignorar
    if ((e.target as Element).closest('.folha-fundo')) return
    g.current = { x0: e.clientX, y0: e.clientY, dx: 0, t: e.timeStamp, v: 0, horizontal: null }
  }

  function onPointerMove(e: PointerEvent) {
    const a = g.current
    if (!a) return
    if (gestos.ocupado) {
      // um bloco começou a ser arrastado: este gesto não é mais nosso
      g.current = null
      estilo('', '', `transform ${DURACAO}ms`)
      return
    }
    const dx = e.clientX - a.x0
    const dy = e.clientY - a.y0
    if (a.horizontal === null) {
      if (Math.abs(dx) < DECIDIR && Math.abs(dy) < DECIDIR) return
      a.horizontal = Math.abs(dx) > Math.abs(dy) * 1.2
      if (!a.horizontal) {
        g.current = null
        return
      }
    }
    const dt = e.timeStamp - a.t
    if (dt > 0) a.v = (dx - a.dx) / dt
    a.t = e.timeStamp
    a.dx = dx
    // no sentido que não vale, o conteúdo resiste (anda só um pouquinho)
    const sentido = dx > 0 ? 1 : -1
    const efetivo = sentidos.includes(sentido) ? dx : dx * 0.15
    estilo(`translateX(${efetivo}px)`, String(1 - Math.min(0.5, Math.abs(efetivo) / 600)), 'none')
  }

  function onPointerUp() {
    const a = g.current
    g.current = null
    if (!a?.horizontal) return
    engolirClique.current = true
    setTimeout(() => (engolirClique.current = false), 300)
    const sentido: 1 | -1 = a.dx > 0 ? 1 : -1
    const confirmou =
      sentidos.includes(sentido) && (Math.abs(a.dx) > LIMITE || (Math.abs(a.dx) > 20 && Math.abs(a.v) > VELOCIDADE))
    if (!confirmou) {
      estilo('', '', `transform ${DURACAO}ms ease-out, opacity ${DURACAO}ms`)
      return
    }
    // sai pelo lado do dedo, troca o conteúdo e entra pelo outro lado
    estilo(`translateX(${sentido * 100}%)`, '0', `transform ${DURACAO}ms ease-in, opacity ${DURACAO}ms`)
    setTimeout(() => {
      aoConfirmar(sentido)
      estilo(`translateX(${-sentido * 30}%)`, '0', 'none')
      requestAnimationFrame(() =>
        requestAnimationFrame(() => estilo('', '', `transform ${DURACAO}ms ease-out, opacity ${DURACAO}ms`)),
      )
    }, DURACAO)
  }

  function onPointerCancel() {
    // o navegador assumiu o gesto (rolagem): volta tudo para o lugar
    if (g.current?.horizontal) estilo('', '', `transform ${DURACAO}ms`)
    g.current = null
  }

  // depois de deslizar com o mouse, o "clique" do fim do gesto não deve abrir nada
  function onClickCapture(e: MouseEvent) {
    if (engolirClique.current) {
      e.stopPropagation()
      e.preventDefault()
      engolirClique.current = false
    }
  }

  return { alvo, handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onClickCapture } }
}
