import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Day } from '../db'
import { somarDias, type DataISO } from '../lib/datas'
import { avisar } from '../lib/aviso'

// Corpo: água, peso, sono e passos, guardados no registro do dia (tabela days).
// Números como foram; o peso aparece também pela média de 7 dias (o diário oscila).

export interface MetasCorpo {
  /** água por dia, em ml */
  aguaMl: number
  /** quanto o "+ copo" soma, em ml */
  copoMl: number
  /** passos: média por dia ao longo da semana */
  passosDia: number
}
export const METAS_CORPO: MetasCorpo = { aguaMl: 3000, copoMl: 250, passosDia: 15000 }
const CHAVE = 'corpo:metas'

export function useMetasCorpo(): MetasCorpo | undefined {
  return useLiveQuery(async () => ({ ...METAS_CORPO, ...((await db.meta.get(CHAVE))?.value as Partial<MetasCorpo> | undefined) }))
}
export const salvarMetasCorpo = (m: MetasCorpo) => db.meta.put({ key: CHAVE, value: m })

type CamposCorpo = Pick<Day, 'water' | 'weight' | 'sleep' | 'steps'>

/** Muda só os campos passados do dia (o comentário e o resto ficam como estão). */
export async function salvarCorpo(date: DataISO, mudancas: Partial<CamposCorpo>) {
  await db.transaction('rw', db.days, async () => {
    const atual = await db.days.get(date)
    const novo: Day = { ...atual, date, ...mudancas }
    // campo apagado (vazio/zero) sai do registro
    for (const k of ['water', 'weight', 'sleep', 'steps'] as const) if (!novo[k]) delete novo[k]
    if (Object.keys(novo).length === 1) await db.days.delete(date)
    else await db.days.put(novo)
  })
}

export async function somarAgua(date: DataISO, ml: number, atual = 0) {
  const novo = Math.max(0, atual + ml)
  await salvarCorpo(date, { water: novo })
  if (ml > 0) avisar(`+${ml} ml de água`, () => salvarCorpo(date, { water: atual }))
}

export function useDia(date: DataISO) {
  return useLiveQuery(async () => (await db.days.get(date)) ?? { date }, [date])
}

/** Dias de `de` até `ate` (inclusive) que têm registro. */
export function useDias(de: DataISO, ate: DataISO) {
  return useLiveQuery(() => db.days.where('date').between(de, ate, true, true).toArray(), [de, ate])
}

/** Média do peso nos 7 dias que terminam em `date` (só os dias com peso). */
export function mediaPeso(dias: Day[], date: DataISO): number | undefined {
  const de = somarDias(date, -6)
  const pesos = dias.filter((d) => d.weight && d.date >= de && d.date <= date).map((d) => d.weight!)
  return pesos.length ? pesos.reduce((t, p) => t + p, 0) / pesos.length : undefined
}

export const media = (xs: number[]) => (xs.length ? xs.reduce((t, x) => t + x, 0) / xs.length : undefined)

/** "250 ml", "1,25 L", "3 L" */
export const formatarLitros = (ml: number) =>
  ml > 0 && ml < 1000 ? `${Math.round(ml)} ml` : `${(Math.round(ml / 10) / 100).toString().replace('.', ',')} L`
/** "94,6 kg" */
export const formatarKg = (kg: number) => `${(Math.round(kg * 10) / 10).toString().replace('.', ',')} kg`
/** 7.5 → "7 h 30" */
export function formatarSono(h: number) {
  const horas = Math.floor(h)
  const min = Math.round((h - horas) * 60)
  return min ? `${horas} h ${String(min).padStart(2, '0')}` : `${horas} h`
}
/** "12.300" */
export const formatarPassos = (n: number) => Math.round(n).toLocaleString('pt-BR')

/** Lê "7,5", "7.5", "7h30", "7:30" como horas. */
export function lerHoras(v: string): number | undefined {
  const t = v.trim().toLowerCase().replace(',', '.')
  if (!t) return undefined
  const m = t.match(/^(\d{1,2})\s*[h:]\s*(\d{1,2})?\s*(min)?$/)
  if (m) return Number(m[1]) + (m[2] ? Number(m[2]) / 60 : 0)
  const n = Number(t)
  return Number.isFinite(n) && n > 0 && n < 24 ? n : undefined
}
