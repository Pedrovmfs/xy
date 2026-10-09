import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'

// Peças de formulário usadas nos editores de Ajustes.

// Ordem de exibição começando na segunda (0 = domingo no Date.getDay).
const ORDEM_DIAS = [1, 2, 3, 4, 5, 6, 0]
const LETRAS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const NOMES = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']

export function SeletorDias({ valor, aoMudar }: { valor: number[]; aoMudar: (dias: number[]) => void }) {
  return (
    <div className="dias" role="group" aria-label="Dias da semana">
      {ORDEM_DIAS.map((d) => (
        <button
          key={d}
          type="button"
          className="dia"
          aria-label={NOMES[d]}
          aria-pressed={valor.includes(d)}
          onClick={() => aoMudar(valor.includes(d) ? valor.filter((x) => x !== d) : [...valor, d].sort())}
        >
          {LETRAS[d]}
        </button>
      ))}
    </div>
  )
}

/** "seg, qua, sex" / "todo dia" / "seg a sex" */
export function resumoDias(dias: number[]): string {
  const ord = ORDEM_DIAS.filter((d) => dias.includes(d))
  if (ord.length === 7) return 'todo dia'
  if (ord.length === 0) return 'nenhum dia'
  if (ord.length === 5 && [1, 2, 3, 4, 5].every((d) => dias.includes(d))) return 'seg a sex'
  if (ord.length === 2 && dias.includes(0) && dias.includes(6)) return 'fim de semana'
  return ord.map((d) => NOMES[d].slice(0, 3)).join(', ')
}

export function SeletorArea({ valor, aoMudar }: { valor?: string; aoMudar: (id?: string) => void }) {
  const areas = useLiveQuery(() => db.areas.orderBy('order').toArray())
  return (
    <div className="fichas">
      <button type="button" className="ficha" aria-pressed={!valor} onClick={() => aoMudar(undefined)}>
        nenhuma
      </button>
      {areas?.map((a) => (
        <button key={a.id} type="button" className="ficha" aria-pressed={valor === a.id} onClick={() => aoMudar(a.id)}>
          <span className="ponto-area" style={{ background: a.color }} />
          {a.name}
        </button>
      ))}
    </div>
  )
}

// Cores suaves, que funcionam no claro e no escuro. Nenhum vermelho de alarme.
export const CORES = [
  '#6f8fb0', '#7fa383', '#b08a6f', '#a383a8', '#a8a07a',
  '#8a9a9c', '#c09a5b', '#6fa3a0', '#9a8fc0', '#b07f8f',
]

export function SeletorCor({ valor, aoMudar }: { valor: string; aoMudar: (cor: string) => void }) {
  return (
    <div className="cores" role="group" aria-label="Cor">
      {CORES.map((c) => (
        <button
          key={c}
          type="button"
          className="cor"
          style={{ background: c }}
          aria-label={c}
          aria-pressed={valor === c}
          onClick={() => aoMudar(c)}
        />
      ))}
    </div>
  )
}

export function Segmentado<T extends string>({ opcoes, valor, aoMudar }: {
  opcoes: { valor: T; nome: string }[]
  valor: T
  aoMudar: (v: T) => void
}) {
  return (
    <div className="segmentado" style={{ gridTemplateColumns: `repeat(${opcoes.length}, 1fr)` }} role="group">
      {opcoes.map((o) => (
        <button key={o.valor} type="button" aria-pressed={valor === o.valor} onClick={() => aoMudar(o.valor)}>
          {o.nome}
        </button>
      ))}
    </div>
  )
}
