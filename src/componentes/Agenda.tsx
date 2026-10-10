import { useEffect, useRef, useState, type PointerEvent } from 'react'
import type { Area, Entry } from '../db'
import { alternarFeito, horarioDoDia, minutos, paraHorario, salvarEntry, type ItemDoDia } from '../lib/dia'
import { gestos } from '../lib/gestos'
import type { DataISO } from '../lib/datas'
import { IconeFeito } from '../icones'

// Grade de horas como num calendário: os blocos ficam na posição do horário e o
// tempo livre aparece como espaço vazio entre eles.
// - Segurar um bloco e arrastar muda o horário só daquele dia (a base estica).
// - Segurar um horário vazio cria um evento ali (dá para arrastar antes de soltar).
// - O círculo no canto do bloco marca feito com um toque.
// - Arrastando perto da borda da tela, a página rola junto.

const PX_POR_HORA = 56
const ALTURA_MINIMA = 44 // alvo de toque mínimo, mesmo para blocos curtos
const PADRAO_INICIO = 7 * 60
const PADRAO_FIM = 23 * 60
const ULTIMO_MINUTO = 23 * 60 + 55
const PASSO = 5 // arrastar anda de 5 em 5 minutos
const ESPERA_ARRASTO = 400 // ms segurando antes de começar a arrastar
const TOLERANCIA = 8 // px que o dedo pode mexer durante a espera (senão é rolagem)
const ZONA_ESTICAR = 16 // px na base do bloco que esticam em vez de mover
const ESPERA_CRIAR = 500 // ms segurando no vazio para criar um evento
const PASSO_CRIAR = 15 // evento novo começa em múltiplos de 15 min
const DURACAO_NOVO = 60 // min
const BORDA_TOPO = 110 // px do topo da tela onde arrastar faz a página subir
const BORDA_BAIXO = 140 // px do fim da tela (acima das abas) onde a página desce

interface Posicionado {
  item: ItemDoDia
  ini: number
  fim: number
  coluna: number
  colunas: number
}

/** Distribui blocos que se sobrepõem lado a lado (como no Calendário do iPhone). */
function posicionar(blocos: { item: ItemDoDia; ini: number; fim: number }[]): Posicionado[] {
  const lista = blocos
    .map((b) => ({ ...b, coluna: 0, colunas: 1 }))
    .sort((a, b) => a.ini - b.ini || b.fim - a.fim)

  let grupo: Posicionado[] = []
  let fimDoGrupo = -1
  const fecharGrupo = () => {
    const n = Math.max(...grupo.map((p) => p.coluna)) + 1
    grupo.forEach((p) => (p.colunas = n))
  }
  for (const p of lista) {
    if (grupo.length && p.ini >= fimDoGrupo) {
      fecharGrupo()
      grupo = []
    }
    const ocupadas = new Set(grupo.filter((g) => g.fim > p.ini).map((g) => g.coluna))
    let c = 0
    while (ocupadas.has(c)) c++
    p.coluna = c
    grupo.push(p)
    fimDoGrupo = Math.max(fimDoGrupo, p.fim)
  }
  if (grupo.length) fecharGrupo()
  return lista
}

function useMinutoAtual() {
  const [agora, setAgora] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setAgora(new Date()), 60_000)
    return () => clearInterval(t)
  }, [])
  return agora.getHours() * 60 + agora.getMinutes()
}

const limitar = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max)

interface Gesto {
  modo: 'mover' | 'esticar' | 'criar'
  id?: string
  x0: number
  y0: number
  /** posição inicial na página (não na tela), para o bloco seguir o dedo mesmo rolando */
  paginaY0: number
  ultimoY: number
  ini0: number
  fim0: number
  ativo: boolean
  timer: number
}

export function Agenda({ date, blocos, entries, areas, ehHoje, aoAbrir, aoCriar }: {
  date: DataISO
  blocos: ItemDoDia[]
  entries: Map<string, Entry>
  areas: Map<string, Area>
  ehHoje: boolean
  aoAbrir: (item: ItemDoDia) => void
  aoCriar: (start: string, end: string) => void
}) {
  const agora = useMinutoAtual()
  const linhaAgora = useRef<HTMLDivElement>(null)
  const agenda = useRef<HTMLDivElement>(null)
  const gesto = useRef<Gesto | null>(null)
  const rolagem = useRef<number | null>(null)
  const ignorarClique = useRef(false)
  const [arrasto, setArrasto] = useState<{ id: string; ini: number; fim: number } | null>(null)
  const [fantasma, setFantasma] = useState<{ ini: number; fim: number } | null>(null)

  // Ao abrir o dia de hoje, se a hora atual estiver abaixo da tela, rola até ela
  // (como o Calendário do iPhone). Só uma vez por abertura, para não brigar com o dedo.
  useEffect(() => {
    const el = linhaAgora.current
    if (!ehHoje || !el) return
    const topo = el.getBoundingClientRect().top
    if (topo > window.innerHeight * 0.7) window.scrollTo({ top: window.scrollY + topo - window.innerHeight * 0.35 })
  }, [ehHoje])

  // No iOS, depois de segurar, mexer o dedo começaria a rolar a página. Cancelar o
  // touchmove enquanto arrasta impede isso (precisa ser "passive: false").
  useEffect(() => {
    const travar = (e: TouchEvent) => {
      if (gesto.current?.ativo) e.preventDefault()
    }
    document.addEventListener('touchmove', travar, { passive: false })
    return () => document.removeEventListener('touchmove', travar)
  }, [])

  const posicionados = posicionar(
    blocos.map((item) => {
      if (arrasto?.id === item.id) return { item, ini: arrasto.ini, fim: arrasto.fim }
      const h = horarioDoDia(item, entries.get(item.id))
      const ini = minutos(h.start!)
      const fim = h.end ? Math.max(minutos(h.end), ini + 15) : ini + 60
      return { item, ini, fim }
    }),
  )

  // A grade vai das 7h às 23h, esticando se algum bloco sair dessa faixa.
  const inicio = Math.min(PADRAO_INICIO, ...posicionados.map((p) => Math.floor(p.ini / 60) * 60))
  const fim = Math.max(PADRAO_FIM, ...posicionados.map((p) => Math.ceil(p.fim / 60) * 60))
  const y = (min: number) => ((min - inicio) / 60) * PX_POR_HORA
  const horas: number[] = []
  for (let h = inicio; h <= fim; h += 60) horas.push(h)

  function comecar(g: Omit<Gesto, 'ativo' | 'timer' | 'paginaY0' | 'ultimoY'>, el: Element, ponteiro: number, espera: number) {
    const novo: Gesto = {
      ...g,
      paginaY0: g.y0 + window.scrollY,
      ultimoY: g.y0,
      ativo: false,
      timer: window.setTimeout(() => {
        novo.ativo = true
        gestos.ocupado = true
        try {
          el.setPointerCapture(ponteiro)
        } catch {
          /* o dedo já saiu */
        }
        if (novo.modo === 'criar') setFantasma({ ini: novo.ini0, fim: novo.fim0 })
        else setArrasto({ id: novo.id!, ini: novo.ini0, fim: novo.fim0 })
      }, espera),
    }
    gesto.current = novo
  }

  function pressionarBloco(e: PointerEvent<HTMLDivElement>, p: Posicionado) {
    if (e.button !== 0) return
    const caixa = e.currentTarget.getBoundingClientRect()
    const modo = caixa.bottom - e.clientY <= ZONA_ESTICAR ? 'esticar' : 'mover'
    comecar({ modo, id: p.item.id, x0: e.clientX, y0: e.clientY, ini0: p.ini, fim0: p.fim }, e.currentTarget, e.pointerId, ESPERA_ARRASTO)
  }

  function pressionarVazio(e: PointerEvent<HTMLDivElement>) {
    if (e.button !== 0 || (e.target as Element).closest('.bloco') || !agenda.current) return
    const topo = agenda.current.getBoundingClientRect().top
    const minuto = inicio + ((e.clientY - topo) / PX_POR_HORA) * 60
    const ini = limitar(Math.floor(minuto / PASSO_CRIAR) * PASSO_CRIAR, 0, ULTIMO_MINUTO - DURACAO_NOVO)
    comecar({ modo: 'criar', x0: e.clientX, y0: e.clientY, ini0: ini, fim0: ini + DURACAO_NOVO }, agenda.current, e.pointerId, ESPERA_CRIAR)
  }

  /** Recalcula a posição do que está sendo arrastado a partir do dedo + rolagem. */
  function recalcular() {
    const g = gesto.current
    if (!g?.ativo) return
    const dy = g.ultimoY + window.scrollY - g.paginaY0
    const passo = g.modo === 'criar' ? PASSO_CRIAR : PASSO
    const delta = Math.round(((dy / PX_POR_HORA) * 60) / passo) * passo
    const duracao = g.fim0 - g.ini0
    if (g.modo === 'esticar') {
      setArrasto({ id: g.id!, ini: g.ini0, fim: limitar(g.fim0 + delta, g.ini0 + 15, ULTIMO_MINUTO) })
      return
    }
    const ini = limitar(g.ini0 + delta, 0, ULTIMO_MINUTO - duracao)
    if (g.modo === 'criar') setFantasma({ ini, fim: ini + duracao })
    else setArrasto({ id: g.id!, ini, fim: ini + duracao })
  }

  /** Perto da borda da tela, rola a página aos poucos enquanto o dedo estiver lá. */
  function rolarSePerto() {
    if (rolagem.current !== null) return
    const passo = () => {
      const g = gesto.current
      if (!g?.ativo) {
        rolagem.current = null
        return
      }
      const limiteBaixo = window.innerHeight - BORDA_BAIXO
      const v =
        g.ultimoY < BORDA_TOPO
          ? -Math.min(14, (BORDA_TOPO - g.ultimoY) / 6)
          : g.ultimoY > limiteBaixo
            ? Math.min(14, (g.ultimoY - limiteBaixo) / 6)
            : 0
      if (v === 0) {
        rolagem.current = null
        return
      }
      window.scrollBy(0, v)
      recalcular()
      rolagem.current = requestAnimationFrame(passo)
    }
    rolagem.current = requestAnimationFrame(passo)
  }

  function aoMover(e: PointerEvent) {
    const g = gesto.current
    if (!g) return
    if (!g.ativo) {
      // mexeu antes do tempo: é rolagem, não arrasto
      if (Math.abs(e.clientY - g.y0) > TOLERANCIA || Math.abs(e.clientX - g.x0) > TOLERANCIA) cancelar()
      return
    }
    g.ultimoY = e.clientY
    recalcular()
    rolarSePerto()
  }

  function aoSoltar() {
    const g = gesto.current
    if (g?.ativo) {
      // o toque que termina o gesto não abre a folha do bloco (e se o clique não vier, esquece)
      ignorarClique.current = true
      setTimeout(() => (ignorarClique.current = false), 400)
      if (g.modo === 'criar' && fantasma) {
        aoCriar(paraHorario(fantasma.ini), paraHorario(fantasma.fim))
      } else if (arrasto && (arrasto.ini !== g.ini0 || arrasto.fim !== g.fim0)) {
        void salvarEntry(date, g.id!, { start: paraHorario(arrasto.ini), end: paraHorario(arrasto.fim) })
      }
    }
    cancelar()
  }

  function cancelar() {
    if (gesto.current) clearTimeout(gesto.current.timer)
    gesto.current = null
    gestos.ocupado = false
    if (rolagem.current !== null) cancelAnimationFrame(rolagem.current)
    rolagem.current = null
    setArrasto(null)
    setFantasma(null)
  }

  return (
    <div
      ref={agenda}
      className="agenda"
      style={{ height: y(fim) + 1 }}
      onPointerDown={pressionarVazio}
      onPointerMove={aoMover}
      onPointerUp={aoSoltar}
      onPointerCancel={cancelar}
      onContextMenu={(e) => e.preventDefault()}
    >
      {horas.map((h) => (
        <div key={h} className="agenda-hora" style={{ top: y(h) }}>
          <span>{String(h / 60).padStart(2, '0')}:00</span>
        </div>
      ))}

      {ehHoje && agora >= inicio && agora <= fim && (
        <div ref={linhaAgora} className="agenda-agora" style={{ top: y(agora) }} aria-hidden="true" />
      )}

      <div className="agenda-trilho">
        {fantasma && (
          <div className="bloco-fantasma" style={{ top: y(fantasma.ini), height: y(fantasma.fim) - y(fantasma.ini) - 2 }}>
            {paraHorario(fantasma.ini)}–{paraHorario(fantasma.fim)}
          </div>
        )}

        {posicionados.map((p) => {
          const { item, ini, fim: f, coluna, colunas } = p
          const entry = entries.get(item.id)
          const area = item.areaId ? areas.get(item.areaId) : undefined
          const altura = Math.max(y(f) - y(ini), ALTURA_MINIMA)
          const arrastando = arrasto?.id === item.id
          const abrir = () => {
            if (ignorarClique.current) {
              ignorarClique.current = false
              return
            }
            aoAbrir(item)
          }
          // div com papel de botão (e não <button>), porque o círculo de "feito" é outro botão dentro dele
          return (
            <div
              key={item.id}
              role="button"
              tabIndex={0}
              className="bloco"
              data-estado={entry?.status}
              data-arrastando={arrastando || undefined}
              style={{
                top: y(ini),
                height: altura - 2,
                left: `calc(${(coluna / colunas) * 100}% + ${coluna ? 2 : 0}px)`,
                width: `calc(${100 / colunas}% - ${coluna ? 2 : 0}px)`,
                ['--cor-area' as string]: area?.color ?? 'var(--texto-suave)',
              }}
              onPointerDown={(e) => pressionarBloco(e, p)}
              onClick={abrir}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && aoAbrir(item)}
            >
              <span className="bloco-titulo">{item.title}</span>
              <span className="bloco-sub">
                {paraHorario(ini)}–{paraHorario(f)}
                {entry?.start && !arrastando && <span title="horário mudado só hoje"> · mudado</span>}
                {entry?.status === 'skipped' && ` · não feito${entry.reason ? `: ${entry.reason}` : ''}`}
              </span>
              {entry?.note && altura >= 72 && <span className="bloco-nota">{entry.note}</span>}
              <button
                className="bloco-check"
                aria-label={entry?.status === 'done' ? 'Desmarcar feito' : 'Marcar feito'}
                aria-pressed={entry?.status === 'done'}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation()
                  void alternarFeito(date, item, entry)
                }}
              >
                <span className="marca" data-estado={entry?.status}>
                  {entry?.status === 'done' && <IconeFeito />}
                </span>
              </button>
              <span className="bloco-alca" aria-hidden="true" />
            </div>
          )
        })}
      </div>
    </div>
  )
}
