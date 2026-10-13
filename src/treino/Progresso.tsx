import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Session } from '../db'
import { deDataISO, formatarDataCurta, formatarDataLonga, hoje, somarDias } from '../lib/datas'
import { inicioDaSemana } from '../lib/semana'
import { avisar } from '../lib/aviso'
import { GraficoLinha } from '../componentes/GraficoLinha'
import { duracaoMin, e1rm, formatarPeso, formatarSerie, NOME_TIPO, preenchida } from './calculos'
import { formatarKm, ritmo } from './cardio'
import { formatarVolume, recordesDoExercicio, resumoDaSessao, seriesPorGrupo, vezesDoExercicio } from './historico'
import { abrirTreino } from './estado'

// Histórico das sessões e progresso por exercício. Tudo factual: números como foram.

const finalizadas = (s: Session[]) =>
  s.filter((x) => x.finishedAt).sort((a, b) => (b.date + b.startedAt).localeCompare(a.date + a.startedAt))

/** Uma linha de sessão (usada no Treino e no histórico completo). */
export function LinhaSessao({ s, aoAbrir }: { s: Session; aoAbrir: () => void }) {
  const r = resumoDaSessao(s)
  return (
    <li>
      <button className="linha" onClick={aoAbrir}>
        <span className="linha-texto">
          <span>{s.workoutName}</span>
          <span className="linha-sub">
            {s.date === hoje() ? 'hoje' : formatarDataLonga(s.date)} · {duracaoMin(s)} min · {r.validas} séries válidas
          </span>
        </span>
      </button>
    </li>
  )
}

export function useSessoesFinalizadas() {
  return useLiveQuery(async () => finalizadas(await db.sessions.toArray()))
}

export function PaginaHistorico({ aoAbrirSessao }: { aoAbrirSessao: (id: string) => void }) {
  const sessoes = useSessoesFinalizadas()
  if (!sessoes) return null
  if (sessoes.length === 0) return <p className="vazio">Nenhum treino finalizado ainda.</p>

  // agrupa por mês
  const meses: { nome: string; itens: Session[] }[] = []
  for (const s of sessoes) {
    const nome = deDataISO(s.date).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    const ultimo = meses[meses.length - 1]
    if (ultimo?.nome === nome) ultimo.itens.push(s)
    else meses.push({ nome, itens: [s] })
  }
  return (
    <>
      {meses.map((m) => (
        <div key={m.nome}>
          <h3 className="secao-titulo mes-titulo">
            {m.nome} · {m.itens.length} {m.itens.length === 1 ? 'treino' : 'treinos'}
          </h3>
          <ul className="lista">
            {m.itens.map((s) => (
              <LinhaSessao key={s.id} s={s} aoAbrir={() => aoAbrirSessao(s.id)} />
            ))}
          </ul>
        </div>
      ))}
    </>
  )
}

export function DetalheSessao({ sessaoId, aoSair }: { sessaoId: string; aoSair: () => void }) {
  const dados = useLiveQuery(async () => {
    const [s, cardio] = await Promise.all([db.sessions.get(sessaoId), db.cardio.where('sessionId').equals(sessaoId).toArray()])
    return { s, cardio }
  }, [sessaoId])
  const [confirmar, setConfirmar] = useState(false)
  if (!dados) return null
  const s = dados.s
  if (!s) return <p className="vazio">Esse treino não existe mais.</p>
  const r = resumoDaSessao(s)

  async function reabrir() {
    await db.sessions.update(s!.id, { finishedAt: undefined })
    abrirTreino(s!.id)
  }

  async function apagar() {
    if (!confirmar) {
      setConfirmar(true)
      return
    }
    const copia = s!
    await db.sessions.delete(copia.id)
    aoSair()
    avisar('Treino apagado', () => db.sessions.put(copia))
  }

  return (
    <>
      <p className="folha-sub">
        {formatarDataLonga(s.date)} · {duracaoMin(s)} min · {r.validas} séries válidas · {formatarVolume(r.volume)}
      </p>
      {s.entries.map((e, i) => {
        const feitas = e.sets.filter((x) => x.done && preenchida(x))
        return (
          <div key={i} className="detalhe-exercicio">
            <h3 className="ex-nome">{e.exerciseName}</h3>
            {feitas.length === 0 ? (
              <p className="nota-discreta">sem série feita</p>
            ) : (
              <ul className="detalhe-series">
                {feitas.map((x, j) => (
                  <li key={j} data-tipo={x.type}>
                    <span>{NOME_TIPO[x.type]}</span>
                    <span>{formatarSerie(x)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      })}
      {dados.cardio.map((c) => (
        <p key={c.id} className="detalhe-cardio">
          {c.type} · {formatarKm(c.km)}
          {c.minutes ? ` · ${c.minutes} min` : ''}
          {ritmo(c) ? ` · ${ritmo(c)}` : ''}
        </p>
      ))}
      {s.notes && <p className="detalhe-nota">{s.notes}</p>}

      <button className="botao-secundario" onClick={() => void reabrir()}>Reabrir para corrigir</button>
      <button className="botao-apagar" onClick={() => void apagar()}>
        {confirmar ? 'Tocar de novo para apagar' : 'Apagar este treino'}
      </button>
    </>
  )
}

export function PaginaProgresso({ aoAbrirExercicio }: { aoAbrirExercicio: (id: string) => void }) {
  const dados = useLiveQuery(async () => {
    const [sessoes, exercicios] = await Promise.all([db.sessions.toArray(), db.exercises.toArray()])
    return { sessoes: finalizadas(sessoes), exercicios: new Map(exercicios.map((e) => [e.id, e])) }
  })
  if (!dados) return null
  if (dados.sessoes.length === 0) return <p className="vazio">O progresso aparece aqui depois dos primeiros treinos.</p>

  const h = hoje()
  const inicio = inicioDaSemana(h)
  const estaSemana = seriesPorGrupo(dados.sessoes, dados.exercicios, inicio, somarDias(inicio, 6))
  const passada = seriesPorGrupo(dados.sessoes, dados.exercicios, somarDias(inicio, -7), somarDias(inicio, -1))
  const grupos = [...new Set([...estaSemana.keys(), ...passada.keys()])].sort(
    (a, b) => (estaSemana.get(b) ?? 0) - (estaSemana.get(a) ?? 0) || a.localeCompare(b),
  )
  const maior = Math.max(1, ...grupos.map((g) => Math.max(estaSemana.get(g) ?? 0, passada.get(g) ?? 0)))

  // exercícios com histórico, do feito mais recentemente ao mais antigo
  const ultimaData = new Map<string, string>()
  for (const s of dados.sessoes) {
    for (const e of s.entries) {
      if (e.sets.some((x) => x.done && x.type === 'work') && !ultimaData.has(e.exerciseId)) ultimaData.set(e.exerciseId, s.date)
    }
  }
  const comHistorico = [...ultimaData.entries()]

  return (
    <>
      <h3 className="secao-titulo">Séries válidas por grupo · esta semana</h3>
      {grupos.length === 0 ? (
        <p className="nota-discreta">Nenhuma série válida nas últimas duas semanas.</p>
      ) : (
        <ul className="barras">
          {grupos.map((g) => {
            const n = estaSemana.get(g) ?? 0
            return (
              <li key={g} className="barra-linha">
                <span className="barra-rotulo">{g}</span>
                <span className="barra-trilho">
                  {n > 0 && <span className="barra" style={{ width: `${(n / maior) * 100}%` }} />}
                  <span className="barra-valor">{n}</span>
                </span>
                <span className="barra-antes">sem. passada: {passada.get(g) ?? 0}</span>
              </li>
            )
          })}
        </ul>
      )}

      <h3 className="secao-titulo">Exercícios</h3>
      <ul className="lista">
        {comHistorico.map(([id, data]) => {
          const vezes = vezesDoExercicio(dados.sessoes, id)
          const ultima = vezes[vezes.length - 1]
          const nome = dados.exercicios.get(id)?.name ?? dados.sessoes.flatMap((s) => s.entries).find((e) => e.exerciseId === id)?.exerciseName
          return (
            <li key={id}>
              <button className="linha" onClick={() => aoAbrirExercicio(id)}>
                <span className="linha-texto">
                  <span>{nome}</span>
                  <span className="linha-sub">
                    {data === h ? 'hoje' : formatarDataCurta(data)}
                    {ultima ? ` · melhor ${formatarSerie(ultima.validas.reduce((m, v) => (e1rm(v.weight!, v.reps!) > e1rm(m.weight!, m.reps!) ? v : m)))}` : ''}
                    {` · ${vezes.length} ${vezes.length === 1 ? 'vez' : 'vezes'}`}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </>
  )
}

type Medida = 'estimado' | 'carga' | 'volume'
const MEDIDAS: { valor: Medida; nome: string; descricao: string }[] = [
  { valor: 'estimado', nome: '1RM estimado', descricao: 'Melhor 1RM estimado (Epley) de cada treino' },
  { valor: 'carga', nome: 'Maior carga', descricao: 'Maior carga numa série válida em cada treino' },
  { valor: 'volume', nome: 'Volume', descricao: 'Carga × reps das séries válidas em cada treino' },
]

export function ProgressoExercicio({ exerciseId }: { exerciseId: string }) {
  const [medida, setMedida] = useState<Medida>('estimado')
  const sessoes = useSessoesFinalizadas()
  if (!sessoes) return null
  const vezes = vezesDoExercicio(sessoes, exerciseId)
  if (vezes.length === 0) return <p className="vazio">Ainda sem séries válidas nesse exercício.</p>
  const rec = recordesDoExercicio(vezes)!
  const atual = MEDIDAS.find((m) => m.valor === medida)!
  const formatar = (v: number) => (medida === 'volume' ? formatarVolume(v) : formatarPeso(Math.round(v * 10) / 10))

  return (
    <>
      <div className="segmentado" role="group" aria-label="O que mostrar">
        {MEDIDAS.map((m) => (
          <button key={m.valor} aria-pressed={medida === m.valor} onClick={() => setMedida(m.valor)}>
            {m.nome}
          </button>
        ))}
      </div>
      <p className="nota-discreta grafico-legenda">{atual.descricao}</p>
      <GraficoLinha
        pontos={vezes.map((v) => ({ data: v.date, valor: v[medida] }))}
        formatar={formatar}
        descricao={`${atual.descricao}: de ${formatar(vezes[0][medida])} a ${formatar(vezes[vezes.length - 1][medida])}`}
      />

      <h3 className="secao-titulo">Recordes</h3>
      <div className="recordes">
        <div className="recorde">
          <span className="recorde-rotulo">Maior carga</span>
          <span className="recorde-valor">{formatarPeso(rec.carga.carga)}</span>
          <span className="recorde-data">{formatarDataCurta(rec.carga.date)}</span>
        </div>
        <div className="recorde">
          <span className="recorde-rotulo">1RM estimado</span>
          <span className="recorde-valor">{formatarPeso(Math.round(rec.estimado.estimado * 10) / 10)}</span>
          <span className="recorde-data">{formatarDataCurta(rec.estimado.date)}</span>
        </div>
        <div className="recorde">
          <span className="recorde-rotulo">Maior volume</span>
          <span className="recorde-valor">{formatarVolume(rec.volume.volume)}</span>
          <span className="recorde-data">{formatarDataCurta(rec.volume.date)}</span>
        </div>
      </div>

      <h3 className="secao-titulo">Cada vez</h3>
      <ul className="lista">
        {[...vezes].reverse().map((v) => (
          <li key={v.sessionId} className="vez">
            <span className="vez-data">{v.date === hoje() ? 'hoje' : formatarDataLonga(v.date)}</span>
            <span className="vez-series">{v.validas.map(formatarSerie).join(' · ')}</span>
          </li>
        ))}
      </ul>
    </>
  )
}
