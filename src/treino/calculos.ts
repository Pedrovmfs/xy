import type { Exercise, Session, SessionEntry, TipoSerie, Workout, WorkoutSet } from '../db'
import { hoje, type DataISO } from '../lib/datas'
import { novoId } from '../lib/id'

// Lógica do treino, portada do app antigo (Pedrovmfs/treino, src/calc.js e store.js).

export const NOME_TIPO: Record<TipoSerie, string> = { warmup: 'aquec', prep: 'prep', work: 'válida' }
export const PROXIMO_TIPO: Record<TipoSerie, TipoSerie> = { warmup: 'prep', prep: 'work', work: 'warmup' }

export const preenchida = (s: WorkoutSet) => s.weight != null && s.reps != null
/** Só séries preenchidas E marcadas como feitas contam nas análises. */
export const conta = (s: WorkoutSet) => preenchida(s) && s.done

/** 1RM estimado (fórmula de Epley): carga × (1 + reps/30). */
export function e1rm(peso: number, reps: number): number {
  if (!peso || !reps) return 0
  return reps === 1 ? peso : peso * (1 + reps / 30)
}

export function seriesValidas(e: SessionEntry): WorkoutSet[] {
  return e.sets.filter((s) => conta(s) && s.type === 'work')
}

/** Exercício "concluído" = ao menos uma série válida feita. */
export const exercicioFeito = (e: SessionEntry) => seriesValidas(e).length > 0

/** Última sessão finalizada em que o exercício apareceu (antes de `antesDe`, se dado). */
export function ultimaVez(sessoes: Session[], exerciseId: string, excetoSessao?: string): SessionEntry | null {
  let melhor: { s: Session; e: SessionEntry } | null = null
  for (const s of sessoes) {
    if (!s.finishedAt || s.id === excetoSessao) continue
    const e = s.entries.find((x) => x.exerciseId === exerciseId && x.sets.some(preenchida))
    if (!e) continue
    if (!melhor || s.date > melhor.s.date || (s.date === melhor.s.date && s.startedAt > melhor.s.startedAt)) melhor = { s, e }
  }
  return melhor?.e ?? null
}

/** Maior carga e maior 1RM estimado já feitos numa série válida (sem contar a sessão atual). */
export function recordesAnteriores(sessoes: Session[], exerciseId: string, excetoSessao?: string) {
  let carga = 0
  let estimado = 0
  for (const s of sessoes) {
    if (!s.finishedAt || s.id === excetoSessao) continue
    for (const e of s.entries) {
      if (e.exerciseId !== exerciseId) continue
      for (const v of seriesValidas(e)) {
        carga = Math.max(carga, v.weight!)
        estimado = Math.max(estimado, e1rm(v.weight!, v.reps!))
      }
    }
  }
  return { carga, estimado }
}

/** Esta série bateria algum recorde? (só faz sentido se já houver histórico) */
export function recordeDaSerie(s: WorkoutSet, anteriores: { carga: number; estimado: number }): 'carga' | 'estimado' | null {
  if (s.type !== 'work' || !conta(s) || anteriores.carga === 0) return null
  if (s.weight! > anteriores.carga) return 'carga'
  if (e1rm(s.weight!, s.reps!) > anteriores.estimado + 0.05) return 'estimado'
  return null
}

/**
 * Séries novas de um exercício, já preenchidas com a última vez:
 * - carga da última vez em todos os tipos;
 * - aquecimento/prep já vêm com as reps (da última vez, ou 10): são "burocracia";
 * - a válida vem sem reps: digitar as reps é a prova de que a série aconteceu.
 */
export function seriesSugeridas(tipos: TipoSerie[], anterior: SessionEntry | null): WorkoutSet[] {
  const series: WorkoutSet[] = tipos.map((type) => ({ type, weight: null, reps: null, done: false }))
  for (const tipo of ['warmup', 'prep', 'work'] as TipoSerie[]) {
    const atuais = series.filter((s) => s.type === tipo)
    const antigas = anterior ? anterior.sets.filter((s) => s.type === tipo && preenchida(s)) : []
    atuais.forEach((s, i) => {
      const velha = antigas[i] ?? antigas[antigas.length - 1]
      if (velha) s.weight = velha.weight
      if (tipo !== 'work') s.reps = velha?.reps ?? 10
    })
  }
  return series
}

export function entradaNova(ex: Exercise, tipos: TipoSerie[], sessoes: Session[], faixa?: { repMin?: number; repMax?: number }): SessionEntry {
  return {
    exerciseId: ex.id,
    exerciseName: ex.name,
    repMin: faixa?.repMin,
    repMax: faixa?.repMax,
    sets: seriesSugeridas(tipos, ultimaVez(sessoes, ex.id)),
  }
}

export function novaSessao(
  treino: Workout,
  exercicios: Map<string, Exercise>,
  sessoes: Session[],
  origem: { date?: DataISO; itemId?: string } = {},
): Session {
  return {
    id: novoId(),
    date: origem.date ?? hoje(),
    workoutId: treino.id,
    workoutName: treino.name,
    itemId: origem.itemId,
    startedAt: new Date().toISOString(),
    entries: treino.items
      .filter((it) => exercicios.has(it.exerciseId))
      .map((it) => entradaNova(exercicios.get(it.exerciseId)!, it.sets, sessoes, it)),
  }
}

/** Sugestão de qual treino fazer: o seguinte ao último feito, na ordem (A → B → … → A). */
export function proximoTreino(treinos: Workout[], sessoes: Session[], pulos: { workoutId: string; at: string }[] = []): Workout | undefined {
  if (treinos.length === 0) return undefined
  const ordenados = [...treinos].sort((a, b) => a.order - b.order)
  // o último acontecimento da sequência: um treino feito (pela hora em que começou;
  // reabrir para corrigir não muda isso) ou um treino pulado
  const eventos = [
    ...sessoes.filter((s) => s.finishedAt && s.workoutId).map((s) => ({ workoutId: s.workoutId!, at: s.startedAt })),
    ...pulos,
  ].filter((e) => ordenados.some((t) => t.id === e.workoutId))
  const ultimo = eventos.sort((a, b) => b.at.localeCompare(a.at))[0]
  const i = ultimo ? ordenados.findIndex((t) => t.id === ultimo.workoutId) : -1
  return ordenados[(i + 1) % ordenados.length]
}

/** "40 kg × 10" (carga com vírgula, sem ".0") */
export function formatarSerie(s: WorkoutSet): string {
  return `${formatarPeso(s.weight)} × ${s.reps ?? '–'}`
}
export function formatarPeso(p: number | null): string {
  if (p == null) return '–'
  return `${String(Math.round(p * 100) / 100).replace('.', ',')} kg`
}

export function duracaoMin(s: Session, agora = Date.now()): number {
  const fim = s.finishedAt ? new Date(s.finishedAt).getTime() : agora
  return Math.max(0, Math.round((fim - new Date(s.startedAt).getTime()) / 60000))
}
