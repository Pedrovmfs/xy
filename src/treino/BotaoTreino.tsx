import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import type { DataISO } from '../lib/datas'
import { abrirTreino } from './estado'
import { EscolherTreino } from './EscolherTreino'

/** Sessão em andamento (no máximo uma faz sentido; se houver mais, a mais recente). */
export function useTreinoEmAndamento() {
  return useLiveQuery(async () => {
    const abertas = (await db.sessions.toArray()).filter((s) => !s.finishedAt)
    return abertas.sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0] ?? null
  })
}

// Na folha de um item que abre treino: "Começar treino" (ou "Continuar", se já houver um aberto).
export function BotaoTreino({ date, itemId }: { date: DataISO; itemId: string }) {
  const emAndamento = useTreinoEmAndamento()
  const [escolhendo, setEscolhendo] = useState(false)
  if (emAndamento === undefined) return null

  return (
    <>
      <button
        className="botao-principal botao-treino"
        onClick={() => (emAndamento ? abrirTreino(emAndamento.id) : setEscolhendo(true))}
      >
        {emAndamento ? `Continuar ${emAndamento.workoutName}` : 'Começar treino'}
      </button>
      {escolhendo && <EscolherTreino date={date} itemId={itemId} aoFechar={() => setEscolhendo(false)} />}
    </>
  )
}
