import type { Transaction } from 'dexie'
import type { Area, Habit, RoutineItem } from './db'

// Dados iniciais: a rotina atual do Pedro (VISAO.md, seção "Rotina atual").
// Tudo isso é editável depois em Ajustes.

const agora = () => new Date().toISOString()

// ids fixos e legíveis para o seed; itens criados pelo usuário usam novoId()
const areas: Area[] = [
  { id: 'faculdade', name: 'Faculdade', color: '#6f8fb0', nextStep: '', order: 0 },
  { id: 'treino', name: 'Treino', color: '#7fa383', nextStep: '', weeklyGoal: 5, order: 1 },
  { id: 'attual', name: 'Attual', color: '#b08a6f', nextStep: '', order: 2 },
  { id: 'spaco', name: 'Spaço Eventos', color: '#a383a8', nextStep: '', order: 3 },
  { id: 'pai', name: 'Pai', color: '#a8a07a', nextStep: '', order: 4 },
  { id: 'casa', name: 'Casa', color: '#8a9a9c', nextStep: '', order: 5 },
]

// 0 = domingo, 1 = segunda … 6 = sábado
function bloco(id: string, title: string, areaId: string, weekdays: number[], start: string, end: string): RoutineItem {
  return { id, title, kind: 'block', areaId, weekdays, start, end, createdAt: agora() }
}
function tarefa(id: string, title: string, areaId: string, weekdays: number[]): RoutineItem {
  return { id, title, kind: 'task', areaId, weekdays, createdAt: agora() }
}

const rotina: RoutineItem[] = [
  bloco('aula-ter', 'Aula', 'faculdade', [2], '08:10', '10:40'),
  bloco('aula-qua-qui', 'Aula', 'faculdade', [3, 4], '09:00', '11:30'),
  bloco('aula-sex', 'Aula', 'faculdade', [5], '10:40', '13:10'),
  bloco('academia', 'Academia', 'treino', [1, 2, 3, 5], '16:30', '18:00'),
  bloco('academia-sab', 'Academia', 'treino', [6], '14:00', '15:30'),
  bloco('attual', 'Attual', 'attual', [1, 2, 3, 4, 5], '19:30', '21:00'),
  bloco('cozinhar', 'Cozinhar para a semana', 'casa', [0], '14:00', '16:00'),
  tarefa('spaco', 'Spaço Eventos', 'spaco', [6, 0, 1]),
  tarefa('pai', 'Trabalhos do pai', 'pai', [6, 0, 1]),
]

const todosOsDias = [0, 1, 2, 3, 4, 5, 6]
const habitos: Habit[] = [
  { id: 'cama', name: 'Arrumar a cama', weekdays: todosOsDias, order: 0 },
  { id: 'quarto', name: 'Limpar o quarto', weekdays: todosOsDias, order: 1 },
  { id: 'cachorro', name: 'Passear com o cachorro', weekdays: todosOsDias, order: 2 },
]

export async function semear(tx: Transaction) {
  await tx.table('areas').bulkAdd(areas)
  await tx.table('routine').bulkAdd(rotina)
  await tx.table('habits').bulkAdd(habitos)
  await tx.table('meta').add({ key: 'criadoEm', value: agora() })
}
