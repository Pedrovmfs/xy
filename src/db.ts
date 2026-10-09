import Dexie, { type EntityTable } from 'dexie'
import type { DataISO } from './lib/datas'
import { semear } from './seed'

export type TipoItem = 'block' | 'task'
export type Horario = string // 'HH:MM'

export interface Area {
  id: string
  name: string
  color: string
  nextStep: string
  /** Meta semanal opcional: quantos itens da área feitos por semana (ex.: treino 5). */
  weeklyGoal?: number
  order: number
}

export interface RoutineItem {
  id: string
  title: string
  kind: TipoItem
  areaId?: string
  /** 0 = domingo … 6 = sábado */
  weekdays: number[]
  start?: Horario
  end?: Horario
  /** Vigência: o item vale a partir de `startsOn` e até o dia anterior a `until`.
   *  "Apagar" um item com histórico só preenche `until`, para os dias passados não mudarem. */
  startsOn?: DataISO
  until?: DataISO
  createdAt: string
}

export interface Oneoff {
  id: string
  date: DataISO
  title: string
  kind: TipoItem
  areaId?: string
  start?: Horario
  end?: Horario
  createdAt: string
}

export type Estado = 'done' | 'skipped'

/** Estado de um item (recorrente ou avulso) num dia. id = `${date}|${itemId}`. */
export interface Entry {
  id: string
  date: DataISO
  itemId: string
  status?: Estado
  reason?: string
  note?: string
  /** Horário só deste dia (o bloco foi arrastado/editado); a rotina-modelo não muda. */
  start?: Horario
  end?: Horario
  updatedAt: string
}

export interface Habit {
  id: string
  name: string
  weekdays: number[]
  order: number
  /** Mesma vigência dos itens da rotina. */
  startsOn?: DataISO
  until?: DataISO
}

/** Existe = marcado naquele dia. id = `${date}|${habitId}`. */
export interface HabitLog {
  id: string
  date: DataISO
  habitId: string
}

export interface Thought {
  id: string
  text: string
  createdAt: string
  /** Dia a que o pensamento fica ligado. */
  date: DataISO
  tags: string[]
  resurfaceAt?: DataISO
}

export interface Day {
  date: DataISO
  comment?: string
  sleep?: number
  weight?: number
  water?: number
}

export interface Meta {
  key: string
  value: unknown
}

export class XyDB extends Dexie {
  areas!: EntityTable<Area, 'id'>
  routine!: EntityTable<RoutineItem, 'id'>
  oneoffs!: EntityTable<Oneoff, 'id'>
  entries!: EntityTable<Entry, 'id'>
  habits!: EntityTable<Habit, 'id'>
  habitLogs!: EntityTable<HabitLog, 'id'>
  thoughts!: EntityTable<Thought, 'id'>
  days!: EntityTable<Day, 'date'>
  meta!: EntityTable<Meta, 'key'>

  constructor() {
    super('xy')
    // Só os campos usados em buscas/ordenação entram aqui; o resto é guardado igual.
    // Mudou o schema? Crie this.version(2) com .upgrade(); nunca edite a versão 1.
    this.version(1).stores({
      areas: 'id, order',
      routine: 'id, areaId',
      oneoffs: 'id, date, areaId',
      entries: 'id, date, itemId',
      habits: 'id, order',
      habitLogs: 'id, date, habitId',
      thoughts: 'id, createdAt, date, resurfaceAt, *tags',
      days: 'date',
      meta: 'key',
    })
    // Roda uma única vez, quando o banco é criado pela primeira vez no aparelho.
    this.on('populate', (tx) => semear(tx))
  }
}

export const db = new XyDB()
