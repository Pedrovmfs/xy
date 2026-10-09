import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Entry, type TipoItem } from '../db'
import { diaDaSemana, type DataISO } from './datas'

/** Um item que acontece num dia, venha da rotina ou de um avulso. */
export interface ItemDoDia {
  id: string
  title: string
  kind: TipoItem
  areaId?: string
  start?: string
  end?: string
  origem: 'rotina' | 'avulso'
}

export const idEntry = (date: DataISO, itemId: string) => `${date}|${itemId}`

/** 'HH:MM' → minutos desde 00:00 */
export function minutos(h: string): number {
  const [hh, mm] = h.split(':').map(Number)
  return hh * 60 + mm
}

export function ordenarPorHorario(a: ItemDoDia, b: ItemDoDia) {
  return (a.start ?? '99').localeCompare(b.start ?? '99') || a.title.localeCompare(b.title)
}

/** Itens do dia (rotina que vale naquele dia da semana + avulsos da data). */
export function useItensDoDia(date: DataISO): ItemDoDia[] | undefined {
  return useLiveQuery(async () => {
    const dia = diaDaSemana(date)
    const [rotina, avulsos] = await Promise.all([
      db.routine.toArray(),
      db.oneoffs.where('date').equals(date).toArray(),
    ])
    const itens: ItemDoDia[] = [
      ...rotina
        .filter((r) => r.weekdays.includes(dia))
        .map((r) => ({ ...r, origem: 'rotina' as const })),
      ...avulsos.map((o) => ({ ...o, origem: 'avulso' as const })),
    ]
    return itens.sort(ordenarPorHorario)
  }, [date])
}

/** Estados do dia indexados pelo id do item. */
export function useEntriesDoDia(date: DataISO): Map<string, Entry> | undefined {
  return useLiveQuery(async () => {
    const lista = await db.entries.where('date').equals(date).toArray()
    return new Map(lista.map((e) => [e.itemId, e]))
  }, [date])
}

/** Grava o estado de um item; se ficou tudo vazio, apaga o registro. */
export async function salvarEntry(date: DataISO, itemId: string, dados: Pick<Entry, 'status' | 'reason' | 'note'>) {
  const id = idEntry(date, itemId)
  const reason = dados.reason?.trim() || undefined
  const note = dados.note?.trim() || undefined
  if (!dados.status && !reason && !note) {
    await db.entries.delete(id)
    return
  }
  await db.entries.put({ id, date, itemId, status: dados.status, reason, note, updatedAt: new Date().toISOString() })
}
