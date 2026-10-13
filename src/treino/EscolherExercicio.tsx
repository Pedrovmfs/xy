import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Exercise } from '../db'
import { novoId } from '../lib/id'
import { normalizar } from '../lib/pensamentos'
import { Folha } from '../componentes/Folha'

// Escolher um exercício da biblioteca (com busca) ou criar um novo na hora.
export function EscolherExercicio({ titulo, aoEscolher, aoFechar }: {
  titulo: string
  aoEscolher: (ex: Exercise) => void
  aoFechar: () => void
}) {
  const [busca, setBusca] = useState('')
  const exercicios = useLiveQuery(() => db.exercises.orderBy('name').toArray())
  const termo = normalizar(busca.trim())
  const lista = (exercicios ?? []).filter((e) => !termo || normalizar(`${e.name} ${e.muscle}`).includes(termo))

  async function criar() {
    const ex: Exercise = { id: novoId(), name: busca.trim(), muscle: '', increment: 2.5, note: '', createdAt: new Date().toISOString() }
    await db.exercises.add(ex)
    aoEscolher(ex)
  }

  return (
    <Folha aberta aoFechar={aoFechar} titulo={titulo}>
      <input className="entrada" type="search" placeholder="Buscar ou criar" value={busca} onChange={(e) => setBusca(e.target.value)} />
      <ul className="lista lista-rolavel">
        {busca.trim() && !lista.some((e) => normalizar(e.name) === termo) && (
          <li>
            <button className="linha" onClick={() => void criar()}>
              <span className="linha-texto">
                <span>+ criar “{busca.trim()}”</span>
                <span className="linha-sub">exercício novo na biblioteca</span>
              </span>
            </button>
          </li>
        )}
        {lista.map((e) => (
          <li key={e.id}>
            <button className="linha" onClick={() => aoEscolher(e)}>
              <span className="linha-texto">
                <span>{e.name}</span>
                {e.muscle && <span className="linha-sub">{e.muscle}</span>}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Folha>
  )
}
