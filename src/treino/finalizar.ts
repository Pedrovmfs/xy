import { db, type Session } from '../db'
import { idEntry, salvarEntry, valeNoDia } from '../lib/dia'
import { duracaoMin, seriesValidas } from './calculos'

/** Item do calendário que "é" este treino: o que abriu, ou o primeiro que abre treino no dia. */
async function itemDoTreino(s: Session): Promise<string | undefined> {
  if (s.itemId) return s.itemId
  const [rotina, avulsos] = await Promise.all([
    db.routine.toArray(),
    db.oneoffs.where('date').equals(s.date).toArray(),
  ])
  return (
    rotina.find((r) => r.opensWorkout && valeNoDia(r, s.date))?.id ?? avulsos.find((o) => o.opensWorkout)?.id
  )
}

export function resumoDoTreino(s: Session): string {
  const validas = s.entries.reduce((t, e) => t + seriesValidas(e).length, 0)
  return `${s.workoutName} · ${validas} séries válidas · ${duracaoMin(s)} min`
}

/**
 * Finaliza a sessão e marca o item do calendário como feito (com um resumo na nota,
 * se ela estiver vazia). Devolve uma função que desfaz tudo.
 */
export async function finalizarTreino(s: Session): Promise<() => Promise<void>> {
  const final: Session = { ...s, finishedAt: new Date().toISOString() }
  const itemId = await itemDoTreino(s)
  const entryAnterior = itemId ? await db.entries.get(idEntry(s.date, itemId)) : undefined

  await db.sessions.put(final)
  if (itemId) {
    await salvarEntry(s.date, itemId, { status: 'done', note: entryAnterior?.note || resumoDoTreino(final) })
  }

  return async () => {
    await db.sessions.put({ ...final, finishedAt: undefined })
    if (itemId) {
      if (entryAnterior) await db.entries.put(entryAnterior)
      else await db.entries.delete(idEntry(s.date, itemId))
    }
  }
}
