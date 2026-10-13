import Dexie, { type EntityTable } from 'dexie'
import type { DataISO } from './lib/datas'
import { semear } from './seed'
import { marcarItensDeTreino, moverMetaDoTreino, semearTreino } from './treino/semente'
import { semearCardapio } from './nutricao/cardapio'

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
  /** Tocar no item oferece "Começar treino" (ex.: Academia). */
  opensWorkout?: boolean
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
  opensWorkout?: boolean
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
  /** Etiquetas: as #hashtags do texto (sem o #, minúsculas). */
  tags: string[]
  /** Tipo opcional do registro. */
  kind?: TipoPensamento
  /** Marquinha "levar pra terapia". */
  forTherapy?: boolean
  /** Resgate: dia em que volta a aparecer discreto no Hoje. */
  resurfaceAt?: DataISO
  /** O resgate já foi visto/dispensado no Hoje. */
  resurfaceDismissed?: boolean
}

export type TipoPensamento = 'pensamento' | 'sentimento' | 'sensacao' | 'dor'

export interface Day {
  date: DataISO
  comment?: string
  sleep?: number
  weight?: number
  water?: number
}

// ---------- Treino (versão 2 do banco) ----------

/** aquec = aquecimento; prep = preparatória; válida = a que conta nas análises */
export type TipoSerie = 'warmup' | 'prep' | 'work'

/** Biblioteca de exercícios. */
export interface Exercise {
  id: string
  name: string
  /** grupo muscular, texto livre (peito, costas…) */
  muscle: string
  /** quanto o +/− da carga anda, em kg */
  increment: number
  /** nota fixa que aparece sempre no treino (ex.: "banco no 3") */
  note: string
  createdAt: string
}

/** Um exercício dentro de um treino-modelo. */
export interface WorkoutItem {
  exerciseId: string
  sets: TipoSerie[]
  repMin?: number
  repMax?: number
}

/** Treino-modelo (ex.: "Treino A — Push"). */
export interface Workout {
  id: string
  name: string
  order: number
  items: WorkoutItem[]
  createdAt: string
  updatedAt: string
}

export interface WorkoutSet {
  type: TipoSerie
  weight: number | null
  reps: number | null
  /** "série feita": só séries feitas contam nas análises */
  done: boolean
}

export interface SessionEntry {
  exerciseId: string
  /** guardado na sessão: se o exercício for renomeado/apagado, o histórico continua legível */
  exerciseName: string
  repMin?: number
  repMax?: number
  sets: WorkoutSet[]
}

/** Um treino feito (ou em andamento, enquanto não tem finishedAt). */
export interface Session {
  id: string
  date: DataISO
  workoutId?: string
  workoutName: string
  /** item do calendário que abriu o treino: ao finalizar, ele é marcado como feito */
  itemId?: string
  startedAt: string
  finishedAt?: string
  entries: SessionEntry[]
  notes?: string
}

/** Cardio (versão 3): caminhada/corrida medida em km. */
export interface Cardio {
  id: string
  date: DataISO
  /** 'caminhada' | 'corrida' | outro nome livre */
  type: string
  km: number
  /** opcional: com ele o app mostra o ritmo (min/km) */
  minutes?: number
  note?: string
  /** se foi feito junto de um treino */
  sessionId?: string
  createdAt: string
}

// ---------- Nutrição (versão 4) ----------

/** Uma opção do cardápio (o que dá para registrar com um toque). */
export interface Food {
  id: string
  name: string
  kcal: number
  /** proteína em gramas */
  protein: number
  /** almoço, jantar, pré-treino… (só para achar rápido; vale a qualquer hora) */
  category: string
  order: number
  createdAt: string
}

/** O que foi comido num dia. */
export interface Meal {
  id: string
  date: DataISO
  /** hora do registro (ISO) */
  at: string
  name: string
  kcal: number
  protein: number
  /** veio de uma opção do cardápio */
  foodId?: string
  /** refeição livre (calorias à mão; o extra entra no espaço semanal de livres) */
  free?: boolean
  /** livre: kcal da refeição normal que ela substituiu (0 = foi a mais). Só o extra conta. */
  replaces?: number
  /** livre: qual refeição ela substituiu (almoço, jantar…) */
  replacesLabel?: string
  createdAt: string
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
  exercises!: EntityTable<Exercise, 'id'>
  workouts!: EntityTable<Workout, 'id'>
  sessions!: EntityTable<Session, 'id'>
  cardio!: EntityTable<Cardio, 'id'>
  foods!: EntityTable<Food, 'id'>
  meals!: EntityTable<Meal, 'id'>

  constructor() {
    super('xy')
    // Só os campos usados em buscas/ordenação entram aqui; o resto é guardado igual.
    // Mudou o schema? Crie uma versão nova com .upgrade(); nunca edite as anteriores.
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
    // Versão 2: ramificação Treino. Só acrescenta tabelas; os dados existentes ficam
    // como estão. Quem já tinha o app recebe os treinos iniciais e os itens da área
    // Treino passam a abrir o treino.
    this.version(2)
      .stores({
        exercises: 'id, name',
        workouts: 'id, order',
        sessions: 'id, date, workoutId',
      })
      .upgrade(async (tx) => {
        await semearTreino(tx)
        await marcarItensDeTreino(tx)
      })
    // Versão 3: cardio (tabela nova) e o controle do treino passa a morar na aba
    // Treino: a meta semanal de treinos sai da área Treino e vai para as
    // configurações do treino (meta 'treino:metas'), com o mesmo valor.
    this.version(3)
      .stores({ cardio: 'id, date, sessionId' })
      .upgrade(async (tx) => {
        await moverMetaDoTreino(tx)
      })
    // Versão 4: nutrição (cardápio e registros do dia). Só tabelas novas.
    this.version(4)
      .stores({ foods: 'id, order', meals: 'id, date' })
      .upgrade(async (tx) => {
        await semearCardapio(tx)
      })
    // Roda uma única vez, quando o banco é criado pela primeira vez no aparelho
    // (já na versão mais nova; nesse caso as funções de upgrade não rodam).
    this.on('populate', async (tx) => {
      await semear(tx)
      await semearTreino(tx)
      await semearCardapio(tx)
    })
  }
}

export const db = new XyDB()
