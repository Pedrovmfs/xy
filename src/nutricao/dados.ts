import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Food, type Meal } from '../db'
import type { DataISO } from '../lib/datas'
import { novoId } from '../lib/id'
import { avisar } from '../lib/aviso'
import { METAS_NUTRICAO, type MetasNutricao } from './cardapio'

const CHAVE_METAS = 'nutricao:metas'

export function useMetasNutricao(): MetasNutricao | undefined {
  return useLiveQuery(async () => ({
    ...METAS_NUTRICAO,
    ...((await db.meta.get(CHAVE_METAS))?.value as Partial<MetasNutricao> | undefined),
  }))
}
export const salvarMetasNutricao = (m: MetasNutricao) => db.meta.put({ key: CHAVE_METAS, value: m })

export function totais(meals: Meal[]) {
  return {
    kcal: meals.reduce((t, m) => t + m.kcal, 0),
    proteina: meals.reduce((t, m) => t + m.protein, 0),
  }
}

export function useComidaDoDia(date: DataISO) {
  return useLiveQuery(async () => {
    const meals = (await db.meals.where('date').equals(date).toArray()).sort((a, b) => a.at.localeCompare(b.at))
    return { meals, ...totais(meals) }
  }, [date])
}

/** Registra uma refeição (do cardápio, à mão ou livre), com desfazer. */
export async function registrar(date: DataISO, dados: { name: string; kcal: number; protein: number; foodId?: string; free?: boolean }) {
  const agora = new Date().toISOString()
  const meal: Meal = { id: novoId(), date, at: agora, createdAt: agora, ...dados }
  await db.meals.add(meal)
  avisar(`${meal.free ? 'Refeição livre' : meal.name} · ${meal.kcal} kcal`, () => db.meals.delete(meal.id))
}

export async function apagarRefeicao(m: Meal) {
  await db.meals.delete(m.id)
  avisar('Registro apagado', () => db.meals.put(m))
}

/** Opções do cardápio usadas por último (sem repetir), para repetir com um toque. */
export async function recentes(cardapio: Food[], limite = 6): Promise<Food[]> {
  const meals = await db.meals.orderBy('date').reverse().limit(200).toArray()
  meals.sort((a, b) => b.at.localeCompare(a.at))
  const porId = new Map(cardapio.map((f) => [f.id, f]))
  const vistos = new Set<string>()
  const lista: Food[] = []
  for (const m of meals) {
    if (!m.foodId || vistos.has(m.foodId) || !porId.has(m.foodId)) continue
    vistos.add(m.foodId)
    lista.push(porId.get(m.foodId)!)
    if (lista.length >= limite) break
  }
  return lista
}

/** "1.240" */
export const formatarKcal = (n: number) => Math.round(n).toLocaleString('pt-BR')
