import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Food, type Meal } from '../db'
import { somarDias, type DataISO } from '../lib/datas'
import { inicioDaSemana } from '../lib/semana'
import type { MetasNutricao } from './cardapio'

// Espaço semanal de refeições livres (modelo do Pedro, docs/dieta.md):
// - espaço da semana = déficit planejado − déficit mínimo
//   = (gasto diário − teto diário) × 7 − déficit mínimo;
// - de cada livre, só conta o extra sobre a refeição normal que ela substituiu;
// - passou do espaço? o excesso sai do espaço da semana seguinte (e assim por
//   diante, se a seguinte também passar). Sobra não acumula. Dias normais não mudam.

export function espacoBase(m: MetasNutricao) {
  return Math.max(0, (m.gastoDiario - m.kcalMax) * 7 - m.deficitMinimo)
}

/** O que a livre tira do espaço: kcal − refeição substituída (nunca negativo). */
export const extraDaLivre = (m: Meal) => Math.max(0, m.kcal - (m.replaces ?? 0))

export interface SemanaLivres {
  inicio: DataISO
  /** espaço da semana, já descontado o excesso da anterior */
  espaco: number
  /** excesso da semana anterior que saiu deste espaço */
  herdado: number
  usado: number
  livres: Meal[]
}

/** Saldo de cada semana, da primeira livre até a semana de `ate`. */
export function semanasDeLivres(livres: Meal[], metas: MetasNutricao, ate: DataISO): SemanaLivres[] {
  const base = espacoBase(metas)
  const fim = inicioDaSemana(ate)
  const primeira = livres.reduce<DataISO | null>((p, m) => (!p || m.date < p ? m.date : p), null)
  let inicio = inicioDaSemana(primeira && primeira < fim ? primeira : fim)
  const semanas: SemanaLivres[] = []
  let herdado = 0
  while (inicio <= fim) {
    const ini = inicio
    const daSemana = livres.filter((m) => m.date >= ini && m.date <= somarDias(ini, 6))
    const usado = daSemana.reduce((t, m) => t + extraDaLivre(m), 0)
    const espaco = base - herdado
    semanas.push({ inicio: ini, espaco, herdado, usado, livres: daSemana })
    herdado = Math.max(0, usado - espaco)
    inicio = somarDias(inicio, 7)
  }
  return semanas
}

/** A semana da data (com o que veio das anteriores). */
export function useSemanaLivres(date: DataISO, metas: MetasNutricao | undefined) {
  return useLiveQuery(async () => {
    if (!metas) return undefined
    const fim = somarDias(inicioDaSemana(date), 6)
    const livres = (await db.meals.where('date').belowOrEqual(fim).toArray()).filter((m) => m.free)
    const semanas = semanasDeLivres(livres, metas, date)
    return semanas[semanas.length - 1]
  }, [date, metas && JSON.stringify(metas)])
}

/** Quanto costuma ter uma refeição normal daquele tipo: média das opções do cardápio
 *  (sem os itens pequenos, como feijão ou banana com café). É só o ponto de partida. */
export function refeicaoTipica(cardapio: Food[], categoria: string): number {
  const itens = cardapio.filter((f) => f.category === categoria && f.kcal >= 150)
  if (!itens.length) return 0
  return Math.round(itens.reduce((t, f) => t + f.kcal, 0) / itens.length / 10) * 10
}
