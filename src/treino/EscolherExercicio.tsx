import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Exercise } from '../db'
import { normalizar } from '../lib/pensamentos'
import { Folha } from '../componentes/Folha'
import { EditorExercicio } from './Biblioteca'

// Escolher um exercício da biblioteca (com busca) ou criar um novo: o botão
// "+ novo exercício" fica sempre no topo e abre o formulário completo; ao salvar,
// o exercício novo já é o escolhido.
export function EscolherExercicio({ titulo, aoEscolher, aoFechar }: {
  titulo: string
  aoEscolher: (ex: Exercise) => void
  aoFechar: () => void
}) {
  const [busca, setBusca] = useState('')
  const [criando, setCriando] = useState(false)
  const exercicios = useLiveQuery(() => db.exercises.orderBy('name').toArray())
  const termo = normalizar(busca.trim())
  const lista = (exercicios ?? []).filter((e) => !termo || normalizar(`${e.name} ${e.muscle}`).includes(termo))
  const nomeNovo = busca.trim() && !lista.some((e) => normalizar(e.name) === termo) ? busca.trim() : ''

  return (
    <Folha aberta aoFechar={aoFechar} titulo={titulo}>
      <input className="entrada" type="search" placeholder="Buscar" value={busca} onChange={(e) => setBusca(e.target.value)} />
      <button className="botao-novo" onClick={() => setCriando(true)}>
        {nomeNovo ? `+ criar “${nomeNovo}”` : '+ novo exercício'}
      </button>
      <ul className="lista lista-rolavel">
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
        {lista.length === 0 && <p className="vazio">Nenhum exercício com esse nome. Use o botão acima para criar.</p>}
      </ul>
      {criando && (
        <EditorExercicio nomeInicial={nomeNovo || undefined} aoCriar={aoEscolher} aoFechar={() => setCriando(false)} />
      )}
    </Folha>
  )
}
