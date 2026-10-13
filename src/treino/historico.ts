import type { DataISO } from '../lib/datas'
import type { Exercise, Session, WorkoutSet } from '../db'
import { e1rm, seriesValidas } from './calculos'

// Cálculos de histórico e progresso (portados de calc.js do app antigo:
// exerciseSeries, exercisePRs, muscleSetsForWeek).

export interface VezDoExercicio {
  date: DataISO
  sessionId: string
  validas: WorkoutSet[]
  /** maior 1RM estimado entre as séries válidas */
  estimado: number
  /** maior carga numa série válida */
  carga: number
  /** carga × reps somados */
  volume: number
}

/** Cada vez que o exercício foi feito (só sessões finalizadas com série válida), da mais antiga à mais nova. */
export function vezesDoExercicio(sessoes: Session[], exerciseId: string): VezDoExercicio[] {
  const vezes: VezDoExercicio[] = []
  for (const s of sessoes) {
    if (!s.finishedAt) continue
    const e = s.entries.find((x) => x.exerciseId === exerciseId)
    if (!e) continue
    const validas = seriesValidas(e)
    if (!validas.length) continue
    vezes.push({
      date: s.date,
      sessionId: s.id,
      validas,
      estimado: Math.max(...validas.map((v) => e1rm(v.weight!, v.reps!))),
      carga: Math.max(...validas.map((v) => v.weight!)),
      volume: validas.reduce((t, v) => t + v.weight! * v.reps!, 0),
    })
  }
  return vezes.sort((a, b) => a.date.localeCompare(b.date))
}

export function recordesDoExercicio(vezes: VezDoExercicio[]) {
  if (!vezes.length) return null
  const melhor = (k: 'estimado' | 'carga' | 'volume') => vezes.reduce((m, v) => (v[k] > m[k] ? v : m))
  return { carga: melhor('carga'), estimado: melhor('estimado'), volume: melhor('volume') }
}

export function resumoDaSessao(s: Session) {
  const validas = s.entries.flatMap(seriesValidas)
  return {
    validas: validas.length,
    volume: validas.reduce((t, v) => t + v.weight! * v.reps!, 0),
  }
}

/** Séries válidas por grupo muscular entre duas datas (inclusive). */
export function seriesPorGrupo(sessoes: Session[], exercicios: Map<string, Exercise>, de: DataISO, ate: DataISO) {
  const grupos = new Map<string, number>()
  for (const s of sessoes) {
    if (!s.finishedAt || s.date < de || s.date > ate) continue
    for (const e of s.entries) {
      const n = seriesValidas(e).length
      if (!n) continue
      const g = exercicios.get(e.exerciseId)?.muscle || 'outros'
      grupos.set(g, (grupos.get(g) ?? 0) + n)
    }
  }
  return grupos
}

/** "1.234 kg" (volume, sem casas) */
export function formatarVolume(kg: number): string {
  return `${Math.round(kg).toLocaleString('pt-BR')} kg`
}
