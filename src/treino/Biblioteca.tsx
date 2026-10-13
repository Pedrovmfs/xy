import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Exercise } from '../db'
import { novoId } from '../lib/id'
import { avisar } from '../lib/aviso'
import { normalizar } from '../lib/pensamentos'
import { Folha } from '../componentes/Folha'

// Biblioteca de exercícios: tudo que pode entrar num treino.

export function PaginaExercicios() {
  const exercicios = useLiveQuery(() => db.exercises.orderBy('name').toArray())
  const [busca, setBusca] = useState('')
  const [editando, setEditando] = useState<Exercise | 'novo' | null>(null)
  if (!exercicios) return null

  const termo = normalizar(busca.trim())
  const lista = exercicios.filter((e) => !termo || normalizar(`${e.name} ${e.muscle}`).includes(termo))

  return (
    <>
      <input className="entrada" type="search" placeholder="Buscar" value={busca} onChange={(e) => setBusca(e.target.value)} />
      <button className="botao-novo" onClick={() => setEditando('novo')}>+ novo exercício</button>
      <ul className="lista">
        {lista.map((e) => (
          <li key={e.id}>
            <button className="linha" onClick={() => setEditando(e)}>
              <span className="linha-texto">
                <span>{e.name}</span>
                <span className="linha-sub">
                  {[e.muscle, `± ${String(e.increment).replace('.', ',')} kg`].filter(Boolean).join(' · ')}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      {editando && (
        <EditorExercicio
          key={editando === 'novo' ? 'novo' : editando.id}
          exercicio={editando === 'novo' ? undefined : editando}
          nomeInicial={editando === 'novo' ? busca.trim() : undefined}
          aoFechar={() => setEditando(null)}
        />
      )}
    </>
  )
}

export function EditorExercicio({ exercicio, nomeInicial, aoFechar, aoCriar }: {
  exercicio?: Exercise
  nomeInicial?: string
  aoFechar: () => void
  aoCriar?: (e: Exercise) => void
}) {
  const [name, setName] = useState(exercicio?.name ?? nomeInicial ?? '')
  const [muscle, setMuscle] = useState(exercicio?.muscle ?? '')
  const [increment, setIncrement] = useState(String(exercicio?.increment ?? 2.5).replace('.', ','))
  const [note, setNote] = useState(exercicio?.note ?? '')

  const dados = useLiveQuery(async () => {
    const [todos, treinos] = await Promise.all([db.exercises.toArray(), db.workouts.toArray()])
    const grupos = [...new Set(todos.map((e) => e.muscle).filter(Boolean))].sort((a, b) => a.localeCompare(b))
    const usadoEm = exercicio ? treinos.filter((t) => t.items.some((i) => i.exerciseId === exercicio.id)).map((t) => t.name) : []
    return { grupos, usadoEm }
  })

  const inc = Number(increment.replace(',', '.'))
  const ok = name.trim() && inc > 0

  async function salvar() {
    if (!ok) return
    const registro: Exercise = {
      id: exercicio?.id ?? novoId(),
      name: name.trim(),
      muscle: muscle.trim().toLowerCase(),
      increment: inc,
      note: note.trim(),
      createdAt: exercicio?.createdAt ?? new Date().toISOString(),
    }
    await db.exercises.put(registro)
    if (!exercicio) aoCriar?.(registro)
    aoFechar()
  }

  async function apagar() {
    if (!exercicio || dados?.usadoEm.length) return
    await db.exercises.delete(exercicio.id)
    avisar(`${exercicio.name} apagado`, () => db.exercises.put(exercicio))
    aoFechar()
  }

  return (
    <Folha aberta aoFechar={aoFechar} titulo={exercicio ? 'Editar exercício' : 'Novo exercício'}>
      <label className="campo">
        <span className="rotulo">Nome</span>
        <input className="entrada" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Supino reto" />
      </label>
      <label className="campo">
        <span className="rotulo">Grupo muscular</span>
        <input className="entrada" value={muscle} onChange={(e) => setMuscle(e.target.value)} placeholder="Ex.: peito" />
      </label>
      {dados && dados.grupos.length > 0 && (
        <div className="fichas fichas-rolaveis">
          {dados.grupos.map((g) => (
            <button key={g} className="ficha ficha-pequena" aria-pressed={muscle.trim().toLowerCase() === g} onClick={() => setMuscle(g)}>
              {g}
            </button>
          ))}
        </div>
      )}
      <label className="campo">
        <span className="rotulo">Quanto o − / + muda a carga (kg)</span>
        <input className="entrada entrada-curta" inputMode="decimal" value={increment} onChange={(e) => setIncrement(e.target.value)} />
      </label>
      <label className="campo">
        <span className="rotulo">Nota fixa (aparece sempre no treino)</span>
        <input className="entrada" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex.: banco no 3, pegada aberta" />
      </label>
      <button className="botao-principal" onClick={salvar} disabled={!ok}>Salvar</button>
      {exercicio &&
        (dados?.usadoEm.length ? (
          <p className="nota-discreta centro">Está em {dados.usadoEm.join(', ')}; para apagar, tire de lá antes.</p>
        ) : (
          <>
            <button className="botao-apagar" onClick={apagar}>Apagar</button>
            <p className="nota-discreta centro">Os treinos já feitos continuam mostrando o nome.</p>
          </>
        ))}
    </Folha>
  )
}
