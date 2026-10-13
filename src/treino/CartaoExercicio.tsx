import { useState } from 'react'
import type { Exercise, SessionEntry, WorkoutSet } from '../db'
import { IconeFeito } from '../icones'
import {
  exercicioFeito,
  formatarSerie,
  NOME_TIPO,
  PROXIMO_TIPO,
  recordeDaSerie,
  seriesValidas,
} from './calculos'

// Um exercício na sessão: cabeçalho (nome, última vez, faixa de reps, nota fixa)
// e as séries. Cada série: tipo · − carga + · reps · ✓.

const lerNumero = (v: string): number | null => {
  const n = Number(v.replace(',', '.'))
  return v.trim() === '' || Number.isNaN(n) ? null : n
}
const mostrarNumero = (n: number | null) => (n == null ? '' : String(n).replace('.', ','))

export function CartaoExercicio({ entry, exercicio, anterior, recordes, aoMudarSerie, aoMarcar, aoAdicionarSerie, aoAbrirMenu }: {
  entry: SessionEntry
  exercicio?: Exercise
  anterior: SessionEntry | null
  recordes: { carga: number; estimado: number }
  aoMudarSerie: (i: number, s: WorkoutSet) => void
  /** marcar/desmarcar "feita" (inicia o descanso) */
  aoMarcar: (i: number, feita: boolean) => void
  aoAdicionarSerie: () => void
  aoAbrirMenu: () => void
}) {
  const feito = exercicioFeito(entry)
  const passo = exercicio?.increment || 2.5
  const ultima = anterior ? seriesValidas(anterior) : []

  return (
    <article className="ex-cartao" data-feito={feito || undefined}>
      <header className="ex-topo">
        <div className="ex-titulos">
          <h2 className="ex-nome">
            {entry.exerciseName}
            {feito && <span className="ex-check" aria-label="feito"><IconeFeito /></span>}
          </h2>
          <p className="ex-sub">
            {ultima.length > 0 ? `última vez: ${ultima.map(formatarSerie).join(' · ')}` : 'primeira vez'}
            {entry.repMin && entry.repMax ? ` · meta ${entry.repMin}–${entry.repMax}` : ''}
          </p>
          {exercicio?.note && <p className="ex-nota">{exercicio.note}</p>}
        </div>
        <button className="botao-icone ex-menu" onClick={aoAbrirMenu} aria-label={`Opções de ${entry.exerciseName}`}>
          ⋯
        </button>
      </header>

      <ol className="series">
        {entry.sets.map((s, i) => (
          <LinhaSerie
            key={i}
            serie={s}
            passo={passo}
            recorde={recordeDaSerie(s, recordes)}
            aoMudar={(nova) => aoMudarSerie(i, nova)}
            aoMarcar={(feita) => aoMarcar(i, feita)}
          />
        ))}
      </ol>
      <button className="ex-mais-serie" onClick={aoAdicionarSerie}>+ série</button>
    </article>
  )
}

function LinhaSerie({ serie, passo, recorde, aoMudar, aoMarcar }: {
  serie: WorkoutSet
  passo: number
  recorde: 'carga' | 'estimado' | null
  aoMudar: (s: WorkoutSet) => void
  aoMarcar: (feita: boolean) => void
}) {
  // texto do campo de carga enquanto digita (permite "42," no meio da digitação)
  const [cargaTexto, setCargaTexto] = useState<string | null>(null)
  const pronta = serie.weight != null && serie.reps != null

  const mudarCarga = (delta: number) => {
    const atual = serie.weight ?? 0
    const nova = Math.max(0, Math.round((atual + delta) * 100) / 100)
    setCargaTexto(null)
    aoMudar({ ...serie, weight: nova })
  }

  return (
    <li className="serie" data-tipo={serie.type} data-feita={serie.done || undefined}>
      <button
        className="serie-tipo"
        onClick={() => aoMudar({ ...serie, type: PROXIMO_TIPO[serie.type] })}
        aria-label={`Tipo: ${NOME_TIPO[serie.type]} (tocar para mudar)`}
      >
        {NOME_TIPO[serie.type]}
      </button>

      <div className="serie-carga">
        <button className="serie-passo" onClick={() => mudarCarga(-passo)} aria-label="Diminuir carga">−</button>
        <input
          className="serie-campo"
          inputMode="decimal"
          aria-label="Carga em kg"
          placeholder="kg"
          value={cargaTexto ?? mostrarNumero(serie.weight)}
          onChange={(e) => {
            setCargaTexto(e.target.value)
            aoMudar({ ...serie, weight: lerNumero(e.target.value) })
          }}
          onBlur={() => setCargaTexto(null)}
          onFocus={(e) => e.target.select()}
        />
        <button className="serie-passo" onClick={() => mudarCarga(passo)} aria-label="Aumentar carga">+</button>
      </div>

      <input
        className="serie-campo serie-reps"
        inputMode="numeric"
        aria-label="Repetições"
        placeholder="reps"
        value={serie.reps ?? ''}
        onFocus={(e) => e.target.select()}
        onChange={(e) => {
          const reps = lerNumero(e.target.value)
          const nova = { ...serie, reps: reps == null ? null : Math.round(reps) }
          aoMudar(nova)
          // na válida, digitar as reps já marca a série como feita (como no app antigo)
          if (serie.type === 'work' && !serie.done && nova.reps && nova.weight != null) aoMarcar(true)
        }}
      />

      <button
        className="serie-ok"
        aria-pressed={serie.done}
        aria-label={serie.done ? 'Desmarcar série' : 'Marcar série feita'}
        disabled={!pronta && !serie.done}
        onClick={() => aoMarcar(!serie.done)}
      >
        <span className="marca" data-estado={serie.done ? 'done' : undefined}>{serie.done && <IconeFeito />}</span>
      </button>

      {recorde && <span className="serie-recorde">{recorde === 'carga' ? 'maior carga até hoje' : 'melhor série até hoje'}</span>}
    </li>
  )
}
