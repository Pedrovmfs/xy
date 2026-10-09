import { useEffect, useRef, useState } from 'react'
import type { Area, Entry } from '../db'
import { minutos, type ItemDoDia } from '../lib/dia'
import { IconeFeito } from '../icones'

// Grade de horas como num calendário: os blocos ficam na posição do horário e o
// tempo livre aparece como espaço vazio entre eles.

const PX_POR_HORA = 56
const ALTURA_MINIMA = 44 // alvo de toque mínimo, mesmo para blocos curtos
const PADRAO_INICIO = 7 * 60
const PADRAO_FIM = 23 * 60

interface Posicionado {
  item: ItemDoDia
  ini: number
  fim: number
  coluna: number
  colunas: number
}

/** Distribui blocos que se sobrepõem lado a lado (como no Calendário do iPhone). */
function posicionar(blocos: ItemDoDia[]): Posicionado[] {
  const lista = blocos
    .map((item) => {
      const ini = minutos(item.start!)
      const fim = item.end ? Math.max(minutos(item.end), ini + 15) : ini + 60
      return { item, ini, fim, coluna: 0, colunas: 1 }
    })
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

export function Agenda({ blocos, entries, areas, ehHoje, aoAbrir }: {
  blocos: ItemDoDia[]
  entries: Map<string, Entry>
  areas: Map<string, Area>
  ehHoje: boolean
  aoAbrir: (item: ItemDoDia) => void
}) {
  const agora = useMinutoAtual()
  const linhaAgora = useRef<HTMLDivElement>(null)

  // Ao abrir o dia de hoje, se a hora atual estiver abaixo da tela, rola até ela
  // (como o Calendário do iPhone). Só uma vez por abertura, para não brigar com o dedo.
  useEffect(() => {
    const el = linhaAgora.current
    if (!ehHoje || !el) return
    const topo = el.getBoundingClientRect().top
    if (topo > window.innerHeight * 0.7) window.scrollTo({ top: window.scrollY + topo - window.innerHeight * 0.35 })
  }, [ehHoje])
  const posicionados = posicionar(blocos)

  // A grade vai das 7h às 23h, esticando se algum bloco sair dessa faixa.
  const inicio = Math.min(PADRAO_INICIO, ...posicionados.map((p) => Math.floor(p.ini / 60) * 60))
  const fim = Math.max(PADRAO_FIM, ...posicionados.map((p) => Math.ceil(p.fim / 60) * 60))
  const y = (min: number) => ((min - inicio) / 60) * PX_POR_HORA
  const horas: number[] = []
  for (let h = inicio; h <= fim; h += 60) horas.push(h)

  return (
    <div className="agenda" style={{ height: y(fim) + 1 }}>
      {horas.map((h) => (
        <div key={h} className="agenda-hora" style={{ top: y(h) }}>
          <span>{String(h / 60).padStart(2, '0')}:00</span>
        </div>
      ))}

      {ehHoje && agora >= inicio && agora <= fim && (
        <div ref={linhaAgora} className="agenda-agora" style={{ top: y(agora) }} aria-hidden="true" />
      )}

      <div className="agenda-trilho">
        {posicionados.map(({ item, ini, fim: f, coluna, colunas }) => {
          const entry = entries.get(item.id)
          const area = item.areaId ? areas.get(item.areaId) : undefined
          const altura = Math.max(y(f) - y(ini), ALTURA_MINIMA)
          return (
            <button
              key={item.id}
              className="bloco"
              data-estado={entry?.status}
              style={{
                top: y(ini),
                height: altura - 2,
                left: `calc(${(coluna / colunas) * 100}% + ${coluna ? 2 : 0}px)`,
                width: `calc(${100 / colunas}% - ${coluna ? 2 : 0}px)`,
                ['--cor-area' as string]: area?.color ?? 'var(--texto-suave)',
              }}
              onClick={() => aoAbrir(item)}
            >
              <span className="bloco-titulo">
                {item.title}
                {entry?.status === 'done' && <span className="bloco-feito" aria-label="feito"><IconeFeito /></span>}
              </span>
              <span className="bloco-sub">
                {item.start}–{item.end}
                {entry?.status === 'skipped' && ` · não feito${entry.reason ? `: ${entry.reason}` : ''}`}
              </span>
              {entry?.note && altura >= 72 && <span className="bloco-nota">{entry.note}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
