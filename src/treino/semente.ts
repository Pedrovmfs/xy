import type { Transaction } from 'dexie'
import type { Area, Exercise, RoutineItem, TipoSerie, Workout } from '../db'

// Treinos iniciais: os A–E do app antigo do Pedro (Pedrovmfs/treino, src/seed.js).
// São só o ponto de partida: tudo é editável no app (treinos, exercícios, séries).

const slug = (s: string) =>
  'ex-' +
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)

/** Convenção do Pedro: 2 séries válidas; o resto vira preparatória/aquecimento. */
export function tiposPadrao(n: number): TipoSerie[] {
  if (n <= 2) return Array(Math.max(1, n)).fill('work')
  if (n === 3) return ['prep', 'work', 'work']
  if (n === 4) return ['warmup', 'prep', 'work', 'work']
  return ['warmup', 'prep', ...Array(n - 2).fill('work')]
}

// [nome, grupo muscular, incremento da carga em kg]
const EXERCICIOS: [string, string, number][] = [
  ['Peck deck', 'peito', 5],
  ['Supino com halteres (inclinado)', 'peito', 2],
  ['Cross over', 'peito', 2.5],
  ['Desenvolvimento (ombro)', 'ombro', 2.5],
  ['Tríceps francês', 'tríceps', 2.5],
  ['Tríceps corda', 'tríceps', 2.5],
  ['Puxada aberta', 'costas', 5],
  ['Remada curvada', 'costas', 5],
  ['Remada triângulo', 'costas', 5],
  ['Peck deck invertido', 'ombro', 5],
  ['Rosca direta (barra)', 'bíceps', 2.5],
  ['Rosca Scott', 'bíceps', 2.5],
  ['Leg press', 'quadríceps', 10],
  ['Agachamento livre ou Hack', 'quadríceps', 5],
  ['Cadeira extensora', 'quadríceps', 5],
  ['Cadeira flexora', 'posterior', 5],
  ['Panturrilha em pé', 'panturrilha', 10],
  ['Flexão de punho', 'antebraço', 2],
  ['Extensão de punho', 'antebraço', 2],
  ['Supino reto', 'peito', 5],
  ['Peito inclinado máquina (reserva: smith)', 'peito', 5],
  ['Puxada triângulo', 'costas', 5],
  ['Remada com barra', 'costas', 5],
  ['Elevação lateral halteres', 'ombro', 2],
  ['Rosca direta / Rosca Scott (alternando semana)', 'bíceps', 2.5],
  ['Tríceps francês / Tríceps corda (alternando semana)', 'tríceps', 2.5],
  ['Panturrilha sentada', 'panturrilha', 5],
  ['Stiff', 'posterior', 5],
  ['Elevação pélvica (reserva: mesa flexora)', 'glúteo', 10],
  ['Cadeira extensora / Leg press / Smith (à escolha)', 'quadríceps', 5],
  ['Panturrilha em pé (reserva: leg press)', 'panturrilha', 10],
]

// [nome do treino, [[exercício, nº de séries]]]
const TREINOS: [string, [string, number][]][] = [
  ['Treino A — Push', [
    ['Peck deck', 4], ['Supino com halteres (inclinado)', 3], ['Cross over', 3],
    ['Desenvolvimento (ombro)', 3], ['Tríceps francês', 3], ['Tríceps corda', 3],
  ]],
  ['Treino B — Pull', [
    ['Puxada aberta', 4], ['Remada curvada', 3], ['Remada triângulo', 3],
    ['Peck deck invertido', 3], ['Rosca direta (barra)', 3], ['Rosca Scott', 3],
  ]],
  ['Treino C — Legs (quadríceps) + Antebraço', [
    ['Leg press', 4], ['Agachamento livre ou Hack', 3], ['Cadeira extensora', 3],
    ['Cadeira flexora', 3], ['Panturrilha em pé', 4], ['Flexão de punho', 3], ['Extensão de punho', 3],
  ]],
  ['Treino D — Upper + Panturrilha', [
    ['Supino reto', 4], ['Peito inclinado máquina (reserva: smith)', 3], ['Puxada triângulo', 4],
    ['Remada com barra', 3], ['Elevação lateral halteres', 3],
    ['Rosca direta / Rosca Scott (alternando semana)', 3],
    ['Tríceps francês / Tríceps corda (alternando semana)', 3], ['Panturrilha sentada', 4],
  ]],
  ['Treino E — Legs (posterior) + Antebraço', [
    ['Stiff', 4], ['Cadeira flexora', 3], ['Elevação pélvica (reserva: mesa flexora)', 3],
    ['Cadeira extensora / Leg press / Smith (à escolha)', 3],
    ['Panturrilha em pé (reserva: leg press)', 4], ['Flexão de punho', 3], ['Extensão de punho', 3],
  ]],
]

export function exerciciosIniciais(): Exercise[] {
  const agora = new Date().toISOString()
  return EXERCICIOS.map(([name, muscle, increment]) => ({ id: slug(name), name, muscle, increment, note: '', createdAt: agora }))
}

export function treinosIniciais(): Workout[] {
  const agora = new Date().toISOString()
  return TREINOS.map(([name, itens], i) => ({
    id: 'wk-' + String.fromCharCode(97 + i),
    name,
    order: i,
    createdAt: agora,
    updatedAt: agora,
    items: itens.map(([ex, n]) => ({ exerciseId: slug(ex), sets: tiposPadrao(n), repMin: 8, repMax: 10 })),
  }))
}

/** Coloca os treinos iniciais, se ainda não houver nenhum exercício. */
export async function semearTreino(tx: Transaction) {
  if ((await tx.table('exercises').count()) > 0) return
  await tx.table('exercises').bulkAdd(exerciciosIniciais())
  await tx.table('workouts').bulkAdd(treinosIniciais())
}

/** Itens da área Treino passam a abrir o treino (para quem já tinha o app). */
export async function marcarItensDeTreino(tx: Transaction) {
  await tx
    .table('routine')
    .where('areaId')
    .equals('treino')
    .modify((r: RoutineItem) => {
      r.opensWorkout = true
    })
}

/** Metas e ajustes do treino, guardados em meta['treino:metas']. */
export interface MetasTreino {
  treinosPorSemana: number
  kmPorSemana: number
  descanso: Record<TipoSerie, number>
}

export const METAS_PADRAO: MetasTreino = {
  treinosPorSemana: 5,
  kmPorSemana: 15,
  descanso: { warmup: 45, prep: 75, work: 120 },
}

/**
 * v3: a meta semanal de treinos sai da área Treino (onde aparecia na Semana) e vai
 * para as metas do treino, com o mesmo valor. O descanso, se já tinha sido ajustado,
 * vem junto.
 */
export async function moverMetaDoTreino(tx: Transaction) {
  const area = (await tx.table('areas').get('treino')) as Area | undefined
  const descanso = (await tx.table('meta').get('treino:descanso'))?.value
  const metas: MetasTreino = {
    ...METAS_PADRAO,
    treinosPorSemana: area?.weeklyGoal ?? METAS_PADRAO.treinosPorSemana,
    descanso: { ...METAS_PADRAO.descanso, ...(descanso ?? {}) },
  }
  if (!(await tx.table('meta').get('treino:metas'))) await tx.table('meta').put({ key: 'treino:metas', value: metas })
  if (area?.weeklyGoal) await tx.table('areas').update('treino', { weeklyGoal: undefined })
}
