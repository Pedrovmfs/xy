import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Cardio, type Session, type Workout } from '../db'
import { deDataISO, formatarDataLonga, hoje, NOMES_DIAS_CURTOS, somarDias, type DataISO } from '../lib/datas'
import { diasDaSemana, inicioDaSemana } from '../lib/semana'
import { Folha } from '../componentes/Folha'
import { duracaoMin, proximoTreino } from '../treino/calculos'
import { abrirTreino } from '../treino/estado'
import { EscolherTreino } from '../treino/EscolherTreino'
import { EditorCardio } from '../treino/EditorCardio'
import { formatarKm, ritmo, somaKm } from '../treino/cardio'
import { salvarMetas, useMetasTreino } from '../treino/metas'
import type { MetasTreino } from '../treino/semente'
import { EditorTreino } from '../treino/EditorTreino'
import { PaginaExercicios } from '../treino/Biblioteca'
import { DetalheSessao, LinhaSessao, PaginaHistorico, PaginaProgresso, ProgressoExercicio } from '../treino/Progresso'
import { PaginaInterna } from '../componentes/PaginaInterna'
import { novoId } from '../lib/id'
import { IconeAvancar } from '../icones'

// Aba Treino: o controle da academia mora aqui (o bloco no calendário é só o
// compromisso do dia). Tudo neutro: "3 de 5", sem sequência que quebra.

const SEMANAS_NO_MAPA = 17 // ~4 meses no calendário de caixinhas

export function Treino() {
  const metas = useMetasTreino()
  const dados = useLiveQuery(async () => {
    const [sessoes, cardio, treinos] = await Promise.all([
      db.sessions.toArray(),
      db.cardio.toArray(),
      db.workouts.orderBy('order').toArray(),
    ])
    return { sessoes, cardio, treinos }
  })
  const [escolhendo, setEscolhendo] = useState(false)
  const [cardioAberto, setCardioAberto] = useState<Cardio | 'novo' | null>(null)
  const [editandoMetas, setEditandoMetas] = useState(false)
  // páginas internas da aba (editar um treino, biblioteca de exercícios)
  // pilha: Histórico → um treino → voltar volta para o Histórico
  const [pilha, setPilha] = useState<Pagina[]>([])
  const pagina = pilha[pilha.length - 1]
  const setPagina = (p: Pagina | null) => setPilha(p ? [...pilha, p] : [])
  const voltar = () => setPilha((x) => x.slice(0, -1))

  if (!dados || !metas) return null

  if (pagina) {
    const exercicioNome = (id: string) =>
      dados.sessoes.flatMap((s) => s.entries).find((e) => e.exerciseId === id)?.exerciseName ?? 'Exercício'
    const titulo =
      pagina.tipo === 'exercicios' ? 'Exercícios'
      : pagina.tipo === 'historico' ? 'Histórico'
      : pagina.tipo === 'progresso' ? 'Progresso'
      : pagina.tipo === 'sessao' ? (dados.sessoes.find((s) => s.id === pagina.id)?.workoutName ?? 'Treino')
      : pagina.tipo === 'exercicio' ? exercicioNome(pagina.id)
      : (dados.treinos.find((t) => t.id === pagina.id)?.name ?? 'Treino')
    const anterior = pilha.length > 1 ? pilha[pilha.length - 2] : null
    const nomeVoltar = anterior?.tipo === 'historico' ? 'Histórico' : anterior?.tipo === 'progresso' ? 'Progresso' : 'Treino'
    return (
      <PaginaInterna key={pilha.length} titulo={titulo} nomeVoltar={nomeVoltar} aoVoltar={voltar}>
        {pagina.tipo === 'treino' && <EditorTreino key={pagina.id} treinoId={pagina.id} aoSair={voltar} />}
        {pagina.tipo === 'exercicios' && <PaginaExercicios />}
        {pagina.tipo === 'historico' && <PaginaHistorico aoAbrirSessao={(id) => setPagina({ tipo: 'sessao', id })} />}
        {pagina.tipo === 'sessao' && <DetalheSessao sessaoId={pagina.id} aoSair={voltar} />}
        {pagina.tipo === 'progresso' && <PaginaProgresso aoAbrirExercicio={(id) => setPagina({ tipo: 'exercicio', id })} />}
        {pagina.tipo === 'exercicio' && <ProgressoExercicio exerciseId={pagina.id} />}
      </PaginaInterna>
    )
  }

  async function novoTreino() {
    const agora = new Date().toISOString()
    const ultimo = dados!.treinos[dados!.treinos.length - 1]
    const id = novoId()
    await db.workouts.add({ id, name: 'Novo treino', order: (ultimo?.order ?? -1) + 1, items: [], createdAt: agora, updatedAt: agora })
    setPagina({ tipo: 'treino', id })
  }

  const h = hoje()
  const feitas = dados.sessoes.filter((s) => s.finishedAt)
  const inicio = inicioDaSemana(h)
  const semana = diasDaSemana(inicio)
  const treinosDaSemana = feitas.filter((s) => s.date >= inicio && s.date <= semana[6])
  const cardioDaSemana = dados.cardio.filter((c) => c.date >= inicio && c.date <= semana[6]).sort((a, b) => b.date.localeCompare(a.date))

  return (
    <section className="aba-treino">
      <CartaoHoje sessoes={dados.sessoes} treinos={dados.treinos} aoEscolher={() => setEscolhendo(true)} />

      <h2 className="secao-titulo">Esta semana</h2>
      <div className="treino-semana">
        {semana.map((d, i) => {
          const doDia = treinosDaSemana.filter((s) => s.date === d)
          const km = somaKm(dados.cardio.filter((c) => c.date === d))
          return (
            <div key={d} className="treino-dia" data-hoje={d === h || undefined} data-treinou={doDia.length > 0 || undefined}>
              <span className="treino-dia-nome">{NOMES_DIAS_CURTOS[(i + 1) % 7]}</span>
              <span className="treino-dia-marca">{doDia.length ? letraDoTreino(doDia[0]) : ''}</span>
              <span className="treino-dia-km">{km ? formatarKm(km).replace(' km', '') : ''}</span>
            </div>
          )
        })}
      </div>
      <p className="treino-conta">
        <Pontos feitos={treinosDaSemana.length} meta={metas.treinosPorSemana} />
        {treinosDaSemana.length} de {metas.treinosPorSemana} treinos
      </p>

      <h2 className="secao-titulo">Cardio</h2>
      <div className="cardio-resumo">
        <span className="cardio-total">
          {formatarKm(somaKm(cardioDaSemana))} <span className="cardio-meta">de {formatarKm(metas.kmPorSemana)} na semana</span>
        </span>
        <span className="barra-neutra">
          <span style={{ width: `${Math.min(100, (somaKm(cardioDaSemana) / metas.kmPorSemana) * 100)}%` }} />
        </span>
      </div>
      {cardioDaSemana.length > 0 && (
        <ul className="lista">
          {cardioDaSemana.map((c) => (
            <li key={c.id}>
              <button className="linha" onClick={() => setCardioAberto(c)}>
                <span className="linha-texto">
                  <span>
                    {c.type} · {formatarKm(c.km)}
                    {ritmo(c) ? ` · ${ritmo(c)}` : ''}
                  </span>
                  <span className="linha-sub">
                    {c.date === h ? 'hoje' : formatarDataLonga(c.date)}
                    {c.minutes ? ` · ${c.minutes} min` : ''}
                    {c.note ? ` · ${c.note}` : ''}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <button className="botao-novo" onClick={() => setCardioAberto('novo')}>+ registrar cardio</button>

      <Frequencia feitas={feitas} cardio={dados.cardio} />

      <h2 className="secao-titulo">Histórico</h2>
      {feitas.length === 0 ? (
        <p className="nota-discreta">Os treinos finalizados aparecem aqui.</p>
      ) : (
        <ul className="lista">
          {[...feitas]
            .sort((a, b) => (b.date + b.startedAt).localeCompare(a.date + a.startedAt))
            .slice(0, 3)
            .map((s) => (
              <LinhaSessao key={s.id} s={s} aoAbrir={() => setPagina({ tipo: 'sessao', id: s.id })} />
            ))}
        </ul>
      )}
      {feitas.length > 3 && (
        <button className="botao-novo" onClick={() => setPagina({ tipo: 'historico' })}>ver todos ({feitas.length})</button>
      )}
      <button className="linha" onClick={() => setPagina({ tipo: 'progresso' })}>
        <span className="linha-texto">
          <span>Progresso</span>
          <span className="linha-sub">evolução por exercício, recordes, séries por grupo muscular</span>
        </span>
        <IconeAvancar />
      </button>

      <h2 className="secao-titulo">Meus treinos</h2>
      <ul className="lista">
        {dados.treinos.map((t) => (
          <li key={t.id}>
            <button className="linha" onClick={() => setPagina({ tipo: 'treino', id: t.id })}>
              <span className="linha-texto">
                <span>{t.name}</span>
                <span className="linha-sub">{t.items.length} {t.items.length === 1 ? 'exercício' : 'exercícios'}</span>
              </span>
              <IconeAvancar />
            </button>
          </li>
        ))}
      </ul>
      <button className="botao-novo" onClick={() => void novoTreino()}>+ novo treino</button>
      <button className="linha" onClick={() => setPagina({ tipo: 'exercicios' })}>
        <span className="linha-texto">
          <span>Exercícios</span>
          <span className="linha-sub">a biblioteca: grupo muscular, incremento da carga, nota fixa</span>
        </span>
        <IconeAvancar />
      </button>

      <button className="linha treino-metas" onClick={() => setEditandoMetas(true)}>
        <span className="linha-texto">
          <span>Metas e descanso</span>
          <span className="linha-sub">
            {metas.treinosPorSemana} treinos e {formatarKm(metas.kmPorSemana)} por semana · descanso {metas.descanso.warmup}/
            {metas.descanso.prep}/{metas.descanso.work} s
          </span>
        </span>
      </button>

      {escolhendo && <EscolherTreino date={h} aoFechar={() => setEscolhendo(false)} />}
      {cardioAberto && (
        <EditorCardio
          key={cardioAberto === 'novo' ? 'novo' : cardioAberto.id}
          cardio={cardioAberto === 'novo' ? undefined : cardioAberto}
          aoFechar={() => setCardioAberto(null)}
        />
      )}
      {editandoMetas && <EditorMetas metas={metas} aoFechar={() => setEditandoMetas(false)} />}
    </section>
  )
}

/** Páginas internas da aba. */
type Pagina =
  | { tipo: 'treino'; id: string }
  | { tipo: 'exercicios' }
  | { tipo: 'historico' }
  | { tipo: 'sessao'; id: string }
  | { tipo: 'progresso' }
  | { tipo: 'exercicio'; id: string }

/** "Treino A — Push" → "A"; se não seguir esse padrão, a primeira letra. */
function letraDoTreino(s: Session): string {
  const m = s.workoutName.match(/treino\s+(\S+)/i)
  return (m ? m[1] : s.workoutName).slice(0, 2).toUpperCase()
}

function Pontos({ feitos, meta }: { feitos: number; meta: number }) {
  return (
    <span className="treino-pontos" aria-hidden="true">
      {Array.from({ length: Math.max(meta, feitos) }, (_, i) => (
        <span key={i} className="meta-ponto" data-cheio={i < feitos || undefined} />
      ))}
    </span>
  )
}

function CartaoHoje({ sessoes, treinos, aoEscolher }: {
  sessoes: Session[]
  treinos: Workout[]
  aoEscolher: () => void
}) {
  const h = hoje()
  const emAndamento = sessoes.filter((s) => !s.finishedAt).sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0]
  const deHoje = sessoes.filter((s) => s.finishedAt && s.date === h)

  if (emAndamento) {
    return (
      <div className="cartao-hoje">
        <span className="cartao-rotulo">em andamento · {duracaoMin(emAndamento)} min</span>
        <span className="cartao-titulo">{emAndamento.workoutName}</span>
        <button className="botao-principal" onClick={() => abrirTreino(emAndamento.id)}>Continuar</button>
      </div>
    )
  }

  const sugerido = proximoTreino(treinos, sessoes)
  return (
    <div className="cartao-hoje">
      {deHoje.length > 0 && (
        <span className="cartao-rotulo">
          hoje: {deHoje.map((s) => `${s.workoutName} · ${duracaoMin(s)} min`).join(', ')}
        </span>
      )}
      {sugerido ? (
        <>
          <span className="cartao-rotulo">{deHoje.length ? 'próximo da sequência' : 'próximo treino'}</span>
          <span className="cartao-titulo">{sugerido.name}</span>
          <button className="botao-principal" onClick={aoEscolher}>Começar</button>
        </>
      ) : (
        <button className="botao-principal" onClick={aoEscolher}>Começar treino</button>
      )}
    </div>
  )
}

function Frequencia({ feitas, cardio }: { feitas: Session[]; cardio: Cardio[] }) {
  const h = hoje()
  const ha30 = somarDias(h, -29)
  const treinos30 = feitas.filter((s) => s.date >= ha30 && s.date <= h).length
  const km30 = somaKm(cardio.filter((c) => c.date >= ha30 && c.date <= h))

  const diasComTreino = new Set(feitas.map((s) => s.date))
  const diasComCardio = new Set(cardio.map((c) => c.date))
  const primeira = somarDias(inicioDaSemana(h), -7 * (SEMANAS_NO_MAPA - 1))
  const semanas = Array.from({ length: SEMANAS_NO_MAPA }, (_, i) => diasDaSemana(somarDias(primeira, 7 * i)))

  return (
    <>
      <h2 className="secao-titulo">Frequência</h2>
      <p className="treino-conta">
        últimos 30 dias: {treinos30} {treinos30 === 1 ? 'treino' : 'treinos'} · {formatarKm(km30)} de cardio
      </p>
      <div className="mapa" role="img" aria-label="Calendário dos dias com treino nos últimos meses">
        <div className="mapa-meses">
          <span />
          {semanas.map((s, i) => {
            const d = deDataISO(s[0])
            const novoMes = i === 0 || deDataISO(semanas[i - 1][0]).getMonth() !== d.getMonth()
            return <span key={s[0]}>{novoMes ? d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '') : ''}</span>
          })}
        </div>
        <div className="mapa-grade">
          <div className="mapa-coluna mapa-dias-semana" aria-hidden="true">
            {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((l, i) => <span key={i}>{i % 2 === 0 ? l : ''}</span>)}
          </div>
          {semanas.map((s) => (
            <div key={s[0]} className="mapa-coluna">
              {s.map((d: DataISO) => (
                <span
                  key={d}
                  className="mapa-dia"
                  data-futuro={d > h || undefined}
                  data-treino={diasComTreino.has(d) || undefined}
                  data-cardio={(!diasComTreino.has(d) && diasComCardio.has(d)) || undefined}
                  data-hoje={d === h || undefined}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="mapa-legenda">
          <span><span className="mapa-dia" data-treino /> treino</span>
          <span><span className="mapa-dia" data-cardio /> só cardio</span>
        </div>
      </div>
    </>
  )
}

function EditorMetas({ metas, aoFechar }: { metas: MetasTreino; aoFechar: () => void }) {
  // texto enquanto digita (dá para apagar e escrever de novo); vira número ao salvar
  const texto = (n: number) => String(n).replace('.', ',')
  const [campos, setCampos] = useState({
    treinos: texto(metas.treinosPorSemana),
    km: texto(metas.kmPorSemana),
    warmup: texto(metas.descanso.warmup),
    prep: texto(metas.descanso.prep),
    work: texto(metas.descanso.work),
  })
  const num = (v: string, padrao: number, min: number) => {
    const n = Number(v.replace(',', '.'))
    return Number.isFinite(n) && n >= min ? n : padrao
  }

  async function salvar() {
    await salvarMetas({
      treinosPorSemana: Math.round(num(campos.treinos, metas.treinosPorSemana, 1)),
      kmPorSemana: num(campos.km, metas.kmPorSemana, 0.1),
      descanso: {
        warmup: Math.round(num(campos.warmup, metas.descanso.warmup, 5)),
        prep: Math.round(num(campos.prep, metas.descanso.prep, 5)),
        work: Math.round(num(campos.work, metas.descanso.work, 5)),
      },
    })
    aoFechar()
  }

  const campo = (chave: keyof typeof campos, rotulo: string, modo: 'numeric' | 'decimal' = 'numeric') => (
    <label className="campo">
      <span className="rotulo">{rotulo}</span>
      <input className="entrada entrada-grande" inputMode={modo} value={campos[chave]}
        onChange={(e) => setCampos({ ...campos, [chave]: e.target.value })} />
    </label>
  )

  return (
    <Folha aberta aoFechar={aoFechar} titulo="Metas e descanso">
      <div className="cardio-numeros">
        {campo('treinos', 'Treinos por semana')}
        {campo('km', 'Cardio (km por semana)', 'decimal')}
      </div>
      <span className="rotulo campo">Descanso depois de cada tipo de série (segundos)</span>
      <div className="cardio-numeros tres">
        {campo('warmup', 'aquec')}
        {campo('prep', 'prep')}
        {campo('work', 'válida')}
      </div>
      <button className="botao-principal" onClick={salvar}>Salvar</button>
    </Folha>
  )
}
