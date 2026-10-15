import type { Transaction } from 'dexie'
import type { Entry, RoutineItem, Subject } from '../db'
import { diaDaSemana } from '../lib/datas'

// Matérias do semestre (conversa de 15/10/2026): uma por dia de aula, 80 h de carga,
// cada aula perdida vale 3 faltas, máximo de 25%.

const MATERIAS: [string, string, number, string][] = [
  ['materia-redes', 'Redes de Computadores', 2, '#6f8fb0'],
  ['materia-lbd', 'Laboratório de Banco de Dados', 3, '#6fa3a0'],
  ['materia-pch', 'Profissão, Competências e Habilidades', 4, '#a383a8'],
  ['materia-poo', 'Programação Orientada a Objetos', 5, '#c09a5b'],
]

export function materiasIniciais(): Subject[] {
  const agora = new Date().toISOString()
  return MATERIAS.map(([id, name, weekday, color], order) => ({
    id, name, color, weekday, order, workload: 80, absencesPerClass: 3, maxAbsencePct: 25, createdAt: agora,
  }))
}

/**
 * Liga cada "Aula" da área Faculdade (ainda valendo) à matéria do dia e dá o nome dela.
 * Item com vários dias vira um por dia; as marcações de cada dia vão junto.
 * Função pura: usada na atualização do banco e na importação de backup antigo.
 */
export function ligarAulas(rotina: RoutineItem[], entries: Entry[], materias: Subject[]) {
  const porDia = new Map(materias.filter((m) => m.weekday != null).map((m) => [m.weekday!, m]))
  const novaRotina: RoutineItem[] = []
  let novasEntries = entries
  for (const r of rotina) {
    const ehAula = r.areaId === 'faculdade' && r.title.trim().toLowerCase() === 'aula' && !r.until && !r.subjectId
    const dias = ehAula ? r.weekdays.filter((d) => porDia.has(d)) : []
    if (!dias.length) {
      novaRotina.push(r)
      continue
    }
    const [primeiro, ...outros] = dias
    const resto = r.weekdays.filter((d) => !porDia.has(d))
    // o item original fica com o primeiro dia (e os dias sem matéria, se houver, num item à parte)
    novaRotina.push({ ...r, weekdays: [primeiro], subjectId: porDia.get(primeiro)!.id, title: porDia.get(primeiro)!.name })
    if (resto.length) novaRotina.push({ ...r, id: `${r.id}-resto`, weekdays: resto })
    for (const d of outros) {
      const id = `${r.id}-${d}`
      novaRotina.push({ ...r, id, weekdays: [d], subjectId: porDia.get(d)!.id, title: porDia.get(d)!.name })
      novasEntries = novasEntries.map((e) =>
        e.itemId === r.id && diaDaSemana(e.date) === d ? { ...e, id: `${e.date}|${id}`, itemId: id } : e,
      )
    }
    if (resto.length) {
      novasEntries = novasEntries.map((e) =>
        e.itemId === r.id && resto.includes(diaDaSemana(e.date)) ? { ...e, id: `${e.date}|${r.id}-resto`, itemId: `${r.id}-resto` } : e,
      )
    }
  }
  return { rotina: novaRotina, entries: novasEntries }
}

export async function semearFaculdade(tx: Transaction) {
  if ((await tx.table('subjects').count()) > 0) return
  const materias = materiasIniciais()
  await tx.table('subjects').bulkAdd(materias)
  const rotina: RoutineItem[] = await tx.table('routine').toArray()
  const entries: Entry[] = await tx.table('entries').toArray()
  const r = ligarAulas(rotina, entries, materias)
  // regrava só o que mudou (entries mudam de id: apaga a antiga e põe a nova)
  const idsAntes = new Set(entries.map((e) => e.id))
  const idsDepois = new Set(r.entries.map((e) => e.id))
  await tx.table('entries').bulkDelete([...idsAntes].filter((id) => !idsDepois.has(id)))
  await tx.table('entries').bulkPut(r.entries.filter((e) => !idsAntes.has(e.id)))
  await tx.table('routine').bulkPut(r.rotina)
}
