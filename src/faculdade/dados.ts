import { useSyncExternalStore } from 'react'
import type { Entry, Estado, ModoAula, Oneoff, RoutineItem, Subject } from '../db'
import { hoje, somarDias, type DataISO } from '../lib/datas'
import { valeNoDia } from '../lib/dia'

// Faculdade: matérias, aulas (itens da rotina ligados a uma matéria) e provas/trabalhos.
// Como o resto do app: números como foram ("2 faltas de 15"), sem alarme.

export const MODOS: { valor: ModoAula; nome: string }[] = [
  { valor: 'presencial', nome: 'presencial' },
  { valor: 'online', nome: 'online' },
  { valor: 'cancelada', nome: 'não teve' },
  { valor: 'falta', nome: 'faltei' },
]
export const nomeDoModo = (m?: ModoAula) => MODOS.find((x) => x.valor === m)?.nome

/** O estado geral (feito/não feito) que cada modo representa. "Não teve" não conta. */
export function statusDoModo(m: ModoAula | undefined): Estado | undefined {
  return m === 'presencial' || m === 'online' ? 'done' : m === 'falta' ? 'skipped' : undefined
}

/** Modo de uma aula marcada (o círculo do Hoje marca feito sem modo = presencial). */
export function modoDaEntry(e?: Entry): ModoAula | undefined {
  if (!e) return undefined
  if (e.classMode) return e.classMode
  return e.status === 'done' ? 'presencial' : e.status === 'skipped' ? 'falta' : undefined
}

export interface Aula {
  date: DataISO
  item: RoutineItem | Oneoff
  entry?: Entry
}

/** Até onde olhar para trás nas aulas de uma matéria. */
const DIAS_DE_HISTORICO = 200

/** Aulas da matéria até `ate` (inclusive), da mais recente para a mais antiga. */
export function aulasDaMateria(subject: Subject, rotina: RoutineItem[], avulsos: Oneoff[], entries: Entry[], ate = hoje()): Aula[] {
  const itens = rotina.filter((r) => r.subjectId === subject.id)
  const meus = avulsos.filter((o) => o.subjectId === subject.id)
  const ids = new Set([...itens.map((i) => i.id), ...meus.map((o) => o.id)])
  const porId = new Map(entries.filter((e) => ids.has(e.itemId)).map((e) => [e.id, e]))

  // começa no que vier primeiro: a criação da matéria ou a marcação mais antiga
  const marcadas = [...porId.values()].map((e) => e.date).sort()
  let inicio = subject.createdAt.slice(0, 10)
  if (marcadas[0] && marcadas[0] < inicio) inicio = marcadas[0]
  const limite = somarDias(ate, -DIAS_DE_HISTORICO)
  if (inicio < limite) inicio = limite

  const aulas: Aula[] = []
  for (let d = ate; d >= inicio; d = somarDias(d, -1)) {
    for (const r of itens) {
      if (valeNoDia(r, d) || porId.has(`${d}|${r.id}`)) aulas.push({ date: d, item: r, entry: porId.get(`${d}|${r.id}`) })
    }
  }
  for (const o of meus) {
    if (o.date <= ate && o.date >= inicio) aulas.push({ date: o.date, item: o, entry: porId.get(`${o.date}|${o.id}`) })
  }
  return aulas.sort((a, b) => b.date.localeCompare(a.date) || (a.item.start ?? '').localeCompare(b.item.start ?? ''))
}

/** Próxima aula (depois de hoje), olhando até 3 semanas à frente. */
export function proximaAula(subject: Subject, rotina: RoutineItem[], avulsos: Oneoff[], depoisDe = hoje()): Aula | undefined {
  const itens = rotina.filter((r) => r.subjectId === subject.id)
  for (let i = 1; i <= 21; i++) {
    const d = somarDias(depoisDe, i)
    const r = itens.find((x) => valeNoDia(x, d))
    if (r) return { date: d, item: r }
    const o = avulsos.find((x) => x.subjectId === subject.id && x.date === d)
    if (o) return { date: d, item: o }
  }
  return undefined
}

export const contarFaltas = (aulas: Aula[]) => aulas.filter((a) => modoDaEntry(a.entry) === 'falta').length

// ---------- abrir uma matéria de qualquer lugar (ex.: "ver matéria" na folha da aula) ----------

let pedida: string | null = null
const ouvintes = new Set<() => void>()

export function abrirMateria(id: string) {
  pedida = id
  ouvintes.forEach((f) => f())
}
/** A Faculdade consome o pedido ao abrir a página da matéria. */
export function consumirMateriaPedida() {
  const id = pedida
  pedida = null
  return id
}
export function useMateriaPedida(): string | null {
  return useSyncExternalStore(
    (f) => {
      ouvintes.add(f)
      return () => ouvintes.delete(f)
    },
    () => pedida,
  )
}
