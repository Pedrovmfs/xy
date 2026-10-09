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

/** O item (da rotina ou hábito) vale nessa data? Dia da semana + vigência. */
export function valeNoDia(x: { weekdays: number[]; startsOn?: DataISO; until?: DataISO }, date: DataISO): boolean {
  return (
    x.weekdays.includes(diaDaSemana(date)) &&
    (!x.startsOn || date >= x.startsOn) &&
    (!x.until || date < x.until)
  )
}

/** Itens do dia (rotina que vale naquele dia da semana + avulsos da data). */
export function useItensDoDia(date: DataISO): ItemDoDia[] | undefined {
  return useLiveQuery(async () => {
    const [rotina, avulsos] = await Promise.all([
      db.routine.toArray(),
      db.oneoffs.where('date').equals(date).toArray(),
    ])
    const itens: ItemDoDia[] = [
      ...rotina
        .filter((r) => valeNoDia(r, date))
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

/** 'HH:MM' a partir de minutos desde 00:00 */
export function paraHorario(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
}

/** Horário que vale no dia: o ajustado naquele dia, se houver, senão o da rotina. */
export function horarioDoDia(item: ItemDoDia, entry?: Entry): { start?: string; end?: string; ajustado: boolean } {
  if (entry?.start) return { start: entry.start, end: entry.end, ajustado: true }
  return { start: item.start, end: item.end, ajustado: false }
}

type CamposEntry = Pick<Entry, 'status' | 'reason' | 'note' | 'start' | 'end'>

/**
 * Altera só os campos passados do estado de um item no dia (o resto continua como
 * está). Se ficou tudo vazio, apaga o registro.
 */
export async function salvarEntry(date: DataISO, itemId: string, mudancas: Partial<CamposEntry>) {
  const id = idEntry(date, itemId)
  await db.transaction('rw', db.entries, async () => {
    const atual = await db.entries.get(id)
    const m = { ...atual, ...mudancas }
    const campos: CamposEntry = {
      status: m.status,
      reason: m.status === 'skipped' ? m.reason?.trim() || undefined : undefined,
      note: m.note?.trim() || undefined,
      start: m.start || undefined,
      end: m.start ? m.end : undefined,
    }
    if (Object.values(campos).every((v) => v === undefined)) {
      await db.entries.delete(id)
      return
    }
    await db.entries.put({ id, date, itemId, ...campos, updatedAt: new Date().toISOString() })
  })
}
