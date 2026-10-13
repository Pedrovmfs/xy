import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Workout, type WorkoutItem } from '../db'
import { novoId } from '../lib/id'
import { avisar } from '../lib/aviso'
import { useComAtraso } from '../lib/atraso'
import { Folha } from '../componentes/Folha'
import { NOME_TIPO, PROXIMO_TIPO } from './calculos'
import { EscolherExercicio } from './EscolherExercicio'

// Editar um treino-modelo. Como a tela do treino, guarda num estado local (digitar
// sem atraso) e grava no banco meio segundo depois de cada mudança e ao sair.
// Mudar o modelo não mexe nos treinos já feitos (cada sessão guardou o que foi feito).

type Menu = { tipo: 'item'; i: number } | { tipo: 'trocar'; i: number } | { tipo: 'adicionar' } | null

export function EditorTreino({ treinoId, aoSair }: { treinoId: string; aoSair: () => void }) {
  const [treino, setTreino] = useState<Workout | null>(null)
  const [menu, setMenu] = useState<Menu>(null)
  const pendente = useRef<Workout | null>(null)

  const dados = useLiveQuery(async () => {
    const [exercicios, treinos] = await Promise.all([db.exercises.toArray(), db.workouts.orderBy('order').toArray()])
    return { nomes: new Map(exercicios.map((e) => [e.id, e.name])), treinos }
  })

  // carrega só ao abrir (aoSair muda a cada render do pai; por isso fica numa ref)
  const sair = useRef(aoSair)
  sair.current = aoSair
  useEffect(() => {
    void db.workouts.get(treinoId).then((t) => (t ? setTreino(t) : sair.current()))
  }, [treinoId])

  const gravar = (t: Workout) => db.workouts.put({ ...t, updatedAt: new Date().toISOString() })
  const gravarDepois = useComAtraso((t: Workout) => {
    pendente.current = null
    return gravar(t)
  }, 500)
  useEffect(
    () => () => {
      if (pendente.current) void gravar(pendente.current)
    },
    [],
  )

  if (!treino || !dados) return null

  function mudar(fn: (t: Workout) => Workout, agora = false) {
    setTreino((atual) => {
      if (!atual) return atual
      const novo = fn(atual)
      // a ordem pode ter mudado no banco (setas da sequência): não sobrescrever
      if (agora) void gravar(novo)
      else {
        pendente.current = novo
        gravarDepois(novo)
      }
      return novo
    })
  }
  const mudarItem = (i: number, fn: (it: WorkoutItem) => WorkoutItem, agora = true) =>
    mudar((t) => ({ ...t, items: t.items.map((it, j) => (j === i ? fn(it) : it)) }), agora)

  const posicao = dados.treinos.findIndex((t) => t.id === treino.id)

  /** Troca de lugar com o vizinho na sequência (A → B → …), direto no banco. */
  async function moverNaSequencia(d: -1 | 1) {
    const lista = dados!.treinos
    const outro = lista[posicao + d]
    if (!outro) return
    const atual = lista[posicao]
    await db.transaction('rw', db.workouts, async () => {
      await db.workouts.update(atual.id, { order: outro.order })
      await db.workouts.update(outro.id, { order: atual.order })
    })
    setTreino((t) => (t ? { ...t, order: outro.order } : t))
  }

  async function duplicar() {
    const ultimo = dados!.treinos[dados!.treinos.length - 1]
    const agora = new Date().toISOString()
    const copia: Workout = { ...treino!, id: novoId(), name: `${treino!.name} (cópia)`, order: (ultimo?.order ?? 0) + 1, createdAt: agora, updatedAt: agora }
    await db.workouts.add(copia)
    avisar('Treino duplicado', () => db.workouts.delete(copia.id))
  }

  async function apagar() {
    const copia = treino!
    pendente.current = null
    await db.workouts.delete(copia.id)
    aoSair()
    avisar(`${copia.name} apagado`, () => db.workouts.put(copia))
  }

  return (
    <>
      <label className="campo">
        <span className="rotulo">Nome</span>
        <input className="entrada" value={treino.name} onChange={(e) => {
          const name = e.target.value
          mudar((t) => ({ ...t, name }))
        }} />
      </label>

      <div className="sequencia">
        <span className="rotulo">
          {posicao + 1}º na sequência de {dados.treinos.length}
        </span>
        <button className="ficha ficha-pequena" disabled={posicao <= 0} onClick={() => void moverNaSequencia(-1)}>↑ antes</button>
        <button className="ficha ficha-pequena" disabled={posicao >= dados.treinos.length - 1} onClick={() => void moverNaSequencia(1)}>↓ depois</button>
      </div>

      <h2 className="secao-titulo">Exercícios</h2>
      {treino.items.length === 0 && <p className="vazio">Nenhum exercício ainda.</p>}
      <ol className="itens-treino">
        {treino.items.map((it, i) => (
          <li key={`${i}-${it.exerciseId}`} className="item-treino">
            <button className="item-treino-nome" onClick={() => setMenu({ tipo: 'item', i })}>
              <span>{dados.nomes.get(it.exerciseId) ?? '(exercício apagado)'}</span>
              <span className="ex-menu" aria-hidden="true">⋯</span>
            </button>

            <div className="item-treino-series">
              {it.sets.map((tipo, k) => (
                <button key={k} className="ficha ficha-pequena serie-chip" data-tipo={tipo}
                  onClick={() => mudarItem(i, (x) => ({ ...x, sets: x.sets.map((s, j) => (j === k ? PROXIMO_TIPO[s] : s)) }))}
                  aria-label={`Série ${k + 1}: ${NOME_TIPO[tipo]} (tocar para mudar)`}>
                  {NOME_TIPO[tipo]}
                </button>
              ))}
              <button className="ficha ficha-pequena" aria-label="Tirar uma série" disabled={it.sets.length <= 1}
                onClick={() => mudarItem(i, (x) => ({ ...x, sets: x.sets.slice(0, -1) }))}>−</button>
              <button className="ficha ficha-pequena" aria-label="Pôr mais uma série"
                onClick={() => mudarItem(i, (x) => ({ ...x, sets: [...x.sets, 'work'] }))}>+</button>
            </div>

            <div className="item-treino-reps">
              <span className="rotulo">reps</span>
              <input className="serie-campo" inputMode="numeric" aria-label="Reps mínimas" placeholder="—" value={it.repMin ?? ''}
                onChange={(e) => {
                  const v = Number(e.target.value) || undefined
                  mudarItem(i, (x) => ({ ...x, repMin: v }), false)
                }} />
              <span className="rotulo">a</span>
              <input className="serie-campo" inputMode="numeric" aria-label="Reps máximas" placeholder="—" value={it.repMax ?? ''}
                onChange={(e) => {
                  const v = Number(e.target.value) || undefined
                  mudarItem(i, (x) => ({ ...x, repMax: v }), false)
                }} />
            </div>
          </li>
        ))}
      </ol>
      <p className="nota-discreta">Toque no tipo da série para mudar (aquec → prep → válida).</p>
      <button className="botao-novo" onClick={() => setMenu({ tipo: 'adicionar' })}>+ adicionar exercício</button>

      <button className="botao-secundario" onClick={() => void duplicar()}>Duplicar treino</button>
      <button className="botao-apagar" onClick={() => void apagar()}>Apagar treino</button>
      <p className="nota-discreta centro">Os treinos já feitos continuam no histórico.</p>

      {menu?.tipo === 'item' && (
        <Folha aberta aoFechar={() => setMenu(null)} titulo={dados.nomes.get(treino.items[menu.i].exerciseId) ?? 'Exercício'}>
          <ul className="lista">
            <li><button className="linha" onClick={() => setMenu({ tipo: 'trocar', i: menu.i })}>Trocar exercício</button></li>
            {menu.i > 0 && (
              <li><button className="linha" onClick={() => {
                const i = menu.i
                mudar((t) => {
                  const l = [...t.items]
                  ;[l[i - 1], l[i]] = [l[i], l[i - 1]]
                  return { ...t, items: l }
                }, true)
                setMenu(null)
              }}>Mover para cima</button></li>
            )}
            {menu.i < treino.items.length - 1 && (
              <li><button className="linha" onClick={() => {
                const i = menu.i
                mudar((t) => {
                  const l = [...t.items]
                  ;[l[i + 1], l[i]] = [l[i], l[i + 1]]
                  return { ...t, items: l }
                }, true)
                setMenu(null)
              }}>Mover para baixo</button></li>
            )}
            <li><button className="linha" onClick={() => {
              const i = menu.i
              const removido = treino.items[i]
              mudar((t) => ({ ...t, items: t.items.filter((_, j) => j !== i) }), true)
              setMenu(null)
              avisar('Exercício tirado do treino', () =>
                mudar((t) => ({ ...t, items: [...t.items.slice(0, i), removido, ...t.items.slice(i)] }), true))
            }}>Tirar do treino</button></li>
          </ul>
        </Folha>
      )}
      {menu?.tipo === 'trocar' && (
        <EscolherExercicio titulo="Trocar por" aoFechar={() => setMenu(null)} aoEscolher={(ex) => {
          const i = menu.i
          mudarItem(i, (x) => ({ ...x, exerciseId: ex.id }))
          setMenu(null)
        }} />
      )}
      {menu?.tipo === 'adicionar' && (
        <EscolherExercicio titulo="Adicionar exercício" aoFechar={() => setMenu(null)} aoEscolher={(ex) => {
          mudar((t) => ({ ...t, items: [...t.items, { exerciseId: ex.id, sets: ['prep', 'work', 'work'], repMin: 8, repMax: 10 }] }), true)
          setMenu(null)
        }} />
      )}
    </>
  )
}
