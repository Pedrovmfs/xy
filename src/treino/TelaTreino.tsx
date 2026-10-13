import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Exercise, type Session, type SessionEntry, type TipoSerie, type WorkoutSet } from '../db'
import { avisar } from '../lib/aviso'
import { useComAtraso } from '../lib/atraso'
import { Folha } from '../componentes/Folha'
import { IconeVoltar } from '../icones'
import { CartaoExercicio } from './CartaoExercicio'
import { BarraDescanso } from './BarraDescanso'
import { EscolherExercicio } from './EscolherExercicio'
import { duracaoMin, entradaNova, exercicioFeito, recordesAnteriores, ultimaVez } from './calculos'
import { DESCANSO_PADRAO, iniciarDescanso, pararDescanso } from './descanso'
import { fecharTreino } from './estado'
import { finalizarTreino } from './finalizar'
import { useTelaAcesa } from './telaAcesa'

// Tela do treino em andamento. A sessão fica num estado local (para digitar sem
// atraso) e é gravada no banco meio segundo depois de cada mudança, na hora ao
// marcar séries, e ao sair da tela. Se o iOS fechar o app, nada se perde.

type Menu = { tipo: 'exercicio'; indice: number } | { tipo: 'trocar'; indice: number } | { tipo: 'adicionar' } | null

export function TelaTreino({ sessaoId }: { sessaoId: string }) {
  const [sessao, setSessao] = useState<Session | null>(null)
  const [menu, setMenu] = useState<Menu>(null)
  const [confirmarFim, setConfirmarFim] = useState(false)
  const [confirmarDescarte, setConfirmarDescarte] = useState(false)
  const ultimaVersao = useRef<Session | null>(null)
  useTelaAcesa()

  const dados = useLiveQuery(async () => {
    const [exercicios, sessoes, descanso] = await Promise.all([
      db.exercises.toArray(),
      db.sessions.toArray(),
      db.meta.get('treino:descanso'),
    ])
    return {
      exercicios: new Map(exercicios.map((e) => [e.id, e])),
      sessoes,
      descanso: { ...DESCANSO_PADRAO, ...(descanso?.value as Partial<Record<TipoSerie, number>> | undefined) },
    }
  })

  // carrega a sessão uma vez
  useEffect(() => {
    void db.sessions.get(sessaoId).then((s) => {
      if (s) setSessao(s)
      else fecharTreino() // sessão não existe mais (ex.: descartada)
    })
  }, [sessaoId])

  const gravar = (s: Session) => db.sessions.put(s)
  const gravarDepois = useComAtraso(gravar, 500)

  // ao sair da tela (ou o iOS mandar o app para o fundo), grava o que estiver pendente
  useEffect(() => {
    const salvarAgora = () => ultimaVersao.current && void gravar(ultimaVersao.current)
    document.addEventListener('visibilitychange', salvarAgora)
    return () => {
      document.removeEventListener('visibilitychange', salvarAgora)
      salvarAgora()
    }
  }, [])

  // o cronômetro do topo anda sozinho
  const [, setTique] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setTique((x) => x + 1), 30_000)
    return () => clearInterval(t)
  }, [])

  if (!sessao || !dados) return null

  function mudar(fn: (s: Session) => Session, agora = false) {
    setSessao((atual) => {
      if (!atual) return atual
      const nova = fn(atual)
      ultimaVersao.current = nova
      if (agora) void gravar(nova)
      else gravarDepois(nova)
      return nova
    })
  }

  const mudarEntrada = (i: number, fn: (e: SessionEntry) => SessionEntry, agora = false) =>
    mudar((s) => ({ ...s, entries: s.entries.map((e, j) => (j === i ? fn(e) : e)) }), agora)

  function mudarSerie(i: number, j: number, serie: WorkoutSet) {
    mudarEntrada(i, (e) => ({ ...e, sets: e.sets.map((s, k) => (k === j ? serie : s)) }))
  }

  function marcar(i: number, j: number, feita: boolean) {
    mudarEntrada(i, (e) => ({ ...e, sets: e.sets.map((s, k) => (k === j ? { ...s, done: feita } : s)) }), true)
    if (feita) iniciarDescanso(dados!.descanso[sessao!.entries[i].sets[j].type])
  }

  function adicionarSerie(i: number) {
    mudarEntrada(i, (e) => {
      const ultima = e.sets[e.sets.length - 1]
      // copia a de cima (tipo e carga), sem reps: como uma série nova de verdade
      const nova: WorkoutSet = { type: ultima?.type ?? 'work', weight: ultima?.weight ?? null, reps: null, done: false }
      return { ...e, sets: [...e.sets, nova] }
    }, true)
  }

  function entradaDe(ex: Exercise, base?: SessionEntry): SessionEntry {
    const tipos = base?.sets.map((s) => s.type) ?? ['prep', 'work', 'work']
    return entradaNova(ex, tipos, dados!.sessoes, { repMin: base?.repMin, repMax: base?.repMax })
  }

  async function finalizar() {
    const semSerie = sessao!.entries.filter((e) => !exercicioFeito(e)).length
    if (semSerie > 0 && !confirmarFim) {
      setConfirmarFim(true)
      return
    }
    pararDescanso()
    ultimaVersao.current = null
    const desfazer = await finalizarTreino(sessao!)
    fecharTreino()
    avisar('Treino salvo', desfazer)
  }

  async function descartar() {
    if (!confirmarDescarte) {
      setConfirmarDescarte(true)
      return
    }
    const copia = sessao!
    ultimaVersao.current = null
    pararDescanso()
    await db.sessions.delete(copia.id)
    fecharTreino()
    avisar('Treino descartado', () => db.sessions.put(copia))
  }

  const semSerie = sessao.entries.filter((e) => !exercicioFeito(e)).length

  return (
    <>
      <header className="topo">
        <button className="botao-icone" onClick={fecharTreino} aria-label="Sair do treino (continua em andamento)">
          <IconeVoltar />
        </button>
        <div className="topo-centro">
          <h1 className="topo-titulo">{sessao.workoutName}</h1>
          <span className="topo-sub">{duracaoMin(sessao)} min</span>
        </div>
        <span className="botao-icone" />
      </header>

      <main className="conteudo treino">
        {sessao.entries.length === 0 && <p className="vazio">Nenhum exercício ainda.</p>}

        {sessao.entries.map((e, i) => (
          <CartaoExercicio
            key={`${i}-${e.exerciseId}`}
            entry={e}
            exercicio={dados.exercicios.get(e.exerciseId)}
            anterior={ultimaVez(dados.sessoes, e.exerciseId, sessao.id)}
            recordes={recordesAnteriores(dados.sessoes, e.exerciseId, sessao.id)}
            aoMudarSerie={(j, s) => mudarSerie(i, j, s)}
            aoMarcar={(j, feita) => marcar(i, j, feita)}
            aoAdicionarSerie={() => adicionarSerie(i)}
            aoAbrirMenu={() => setMenu({ tipo: 'exercicio', indice: i })}
          />
        ))}

        <button className="botao-novo" onClick={() => setMenu({ tipo: 'adicionar' })}>+ adicionar exercício</button>

        <label className="campo">
          <span className="rotulo">Nota do treino</span>
          <textarea
            className="entrada"
            rows={2}
            placeholder="Como foi? (opcional)"
            value={sessao.notes ?? ''}
            onChange={(ev) => {
              const notes = ev.target.value
              mudar((s) => ({ ...s, notes }))
            }}
          />
        </label>

        {confirmarFim && semSerie > 0 && (
          <p className="aviso">
            {semSerie === 1 ? '1 exercício ficou' : `${semSerie} exercícios ficaram`} sem série válida. Tudo bem: toque de
            novo para finalizar assim mesmo.
          </p>
        )}
        <button className="botao-principal" onClick={() => void finalizar()}>
          {confirmarFim && semSerie > 0 ? 'Finalizar assim mesmo' : 'Finalizar treino'}
        </button>
        <button className="botao-apagar" onClick={() => void descartar()}>
          {confirmarDescarte ? 'Tocar de novo para descartar' : 'Descartar treino'}
        </button>
      </main>

      <BarraDescanso />

      {menu?.tipo === 'exercicio' && (
        <MenuExercicio
          nome={sessao.entries[menu.indice].exerciseName}
          primeiro={menu.indice === 0}
          ultimo={menu.indice === sessao.entries.length - 1}
          podeRemoverSerie={sessao.entries[menu.indice].sets.length > 0}
          aoFechar={() => setMenu(null)}
          aoTrocar={() => setMenu({ tipo: 'trocar', indice: menu.indice })}
          aoMover={(d) => {
            const i = menu.indice
            mudar((s) => {
              const lista = [...s.entries]
              ;[lista[i], lista[i + d]] = [lista[i + d], lista[i]]
              return { ...s, entries: lista }
            }, true)
            setMenu(null)
          }}
          aoRemoverSerie={() => {
            mudarEntrada(menu.indice, (e) => ({ ...e, sets: e.sets.slice(0, -1) }), true)
            setMenu(null)
          }}
          aoRemover={() => {
            const i = menu.indice
            const removida = sessao.entries[i]
            mudar((s) => ({ ...s, entries: s.entries.filter((_, j) => j !== i) }), true)
            setMenu(null)
            avisar(`${removida.exerciseName} removido`, () =>
              mudar((s) => ({ ...s, entries: [...s.entries.slice(0, i), removida, ...s.entries.slice(i)] }), true),
            )
          }}
        />
      )}

      {menu?.tipo === 'trocar' && (
        <EscolherExercicio
          titulo="Trocar por"
          aoFechar={() => setMenu(null)}
          aoEscolher={(ex) => {
            const i = menu.indice
            mudarEntrada(i, (e) => entradaDe(ex, e), true)
            setMenu(null)
          }}
        />
      )}

      {menu?.tipo === 'adicionar' && (
        <EscolherExercicio
          titulo="Adicionar exercício"
          aoFechar={() => setMenu(null)}
          aoEscolher={(ex) => {
            mudar((s) => ({ ...s, entries: [...s.entries, entradaDe(ex)] }), true)
            setMenu(null)
          }}
        />
      )}
    </>
  )
}

function MenuExercicio({ nome, primeiro, ultimo, podeRemoverSerie, aoFechar, aoTrocar, aoMover, aoRemoverSerie, aoRemover }: {
  nome: string
  primeiro: boolean
  ultimo: boolean
  podeRemoverSerie: boolean
  aoFechar: () => void
  aoTrocar: () => void
  aoMover: (d: -1 | 1) => void
  aoRemoverSerie: () => void
  aoRemover: () => void
}) {
  return (
    <Folha aberta aoFechar={aoFechar} titulo={nome}>
      <ul className="lista">
        <li><button className="linha" onClick={aoTrocar}>Trocar exercício</button></li>
        {!primeiro && <li><button className="linha" onClick={() => aoMover(-1)}>Mover para cima</button></li>}
        {!ultimo && <li><button className="linha" onClick={() => aoMover(1)}>Mover para baixo</button></li>}
        {podeRemoverSerie && <li><button className="linha" onClick={aoRemoverSerie}>Remover a última série</button></li>}
        <li><button className="linha" onClick={aoRemover}>Remover do treino de hoje</button></li>
      </ul>
      <p className="nota-discreta centro">Mudanças aqui valem só para hoje; o treino-modelo continua igual.</p>
    </Folha>
  )
}
