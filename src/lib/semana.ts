import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Entry } from '../db'
import { deDataISO, diaDaSemana, somarDias, type DataISO } from './datas'
import { ordenarPorHorario, valeNoDia, type ItemDoDia } from './dia'

// A semana vai de segunda a domingo (como o seletor de dias da rotina).

export function inicioDaSemana(d: DataISO): DataISO {
  return somarDias(d, -((diaDaSemana(d) + 6) % 7))
}

export function diasDaSemana(inicio: DataISO): DataISO[] {
  return Array.from({ length: 7 }, (_, i) => somarDias(inicio, i))
}

/** "6 – 12 de outubro" / "29 de setembro – 5 de outubro" */
export function formatarSemana(inicio: DataISO): string {
  const a = deDataISO(inicio)
  const b = deDataISO(somarDias(inicio, 6))
  const mes = (d: Date) => d.toLocaleDateString('pt-BR', { month: 'long' })
  return a.getMonth() === b.getMonth()
    ? `${a.getDate()} – ${b.getDate()} de ${mes(b)}`
    : `${a.getDate()} de ${mes(a)} – ${b.getDate()} de ${mes(b)}`
}

/** Uma linha da grade: itens com o mesmo nome e área juntos (ex.: as três "Aula"). */
export interface LinhaSemana {
  chave: string
  titulo: string
  areaId?: string
  /** por dia: o item que acontece naquele dia (se houver) e o estado dele */
  dias: ({ item: ItemDoDia; entry?: Entry } | null)[]
}

export interface DadosSemana {
  linhas: LinhaSemana[]
  habitos: { id: string; nome: string; dias: ('feito' | 'vale' | null)[] }[]
}

export function useSemana(inicio: DataISO): DadosSemana | undefined {
  return useLiveQuery(async () => {
    const datas = diasDaSemana(inicio)
    const fim = datas[6]
    const [rotina, avulsos, entries, habitos, logs] = await Promise.all([
      db.routine.toArray(),
      db.oneoffs.where('date').between(inicio, fim, true, true).toArray(),
      db.entries.where('date').between(inicio, fim, true, true).toArray(),
      db.habits.orderBy('order').toArray(),
      db.habitLogs.where('date').between(inicio, fim, true, true).toArray(),
    ])
    const estado = new Map(entries.map((e) => [e.id, e]))

    const linhas = new Map<string, LinhaSemana & { ordem: ItemDoDia }>()
    datas.forEach((data, i) => {
      const doDia: ItemDoDia[] = [
        ...rotina.filter((r) => valeNoDia(r, data)).map((r) => ({ ...r, origem: 'rotina' as const })),
        ...avulsos.filter((o) => o.date === data).map((o) => ({ ...o, origem: 'avulso' as const })),
      ]
      for (const item of doDia) {
        const chave = `${item.areaId ?? ''}|${item.title.trim().toLowerCase()}`
        let linha = linhas.get(chave)
        if (!linha) {
          linha = { chave, titulo: item.title, areaId: item.areaId, dias: Array(7).fill(null), ordem: item }
          linhas.set(chave, linha)
        }
        if (!linha.dias[i]) linha.dias[i] = { item, entry: estado.get(`${data}|${item.id}`) }
      }
    })

    const feitos = new Set(logs.map((l) => `${l.date}|${l.habitId}`))
    return {
      // ordem: blocos pelo horário, depois tarefas
      linhas: [...linhas.values()].sort((a, b) => ordenarPorHorario(a.ordem, b.ordem)),
      habitos: habitos
        .map((h) => ({
          id: h.id,
          nome: h.name,
          dias: datas.map((d) => (feitos.has(`${d}|${h.id}`) ? 'feito' : valeNoDia(h, d) ? 'vale' : null)) as (
            | 'feito'
            | 'vale'
            | null
          )[],
        }))
        .filter((h) => h.dias.some((d) => d !== null)),
    }
  }, [inicio])
}
