// "O dia é a unidade": datas sempre como string YYYY-MM-DD no fuso local.
// Nunca usar toISOString() para isso, porque ele converte para UTC e à noite
// (depois das 21h no horário de Brasília) já daria o dia seguinte.

export type DataISO = string // 'YYYY-MM-DD'

const pad = (n: number) => String(n).padStart(2, '0')

export function paraDataISO(d: Date): DataISO {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function hoje(): DataISO {
  return paraDataISO(new Date())
}

/** Converte 'YYYY-MM-DD' em Date ao meio-dia local (evita problemas de horário de verão). */
export function deDataISO(s: DataISO): Date {
  const [a, m, d] = s.split('-').map(Number)
  return new Date(a, m - 1, d, 12)
}

export function somarDias(s: DataISO, dias: number): DataISO {
  const d = deDataISO(s)
  d.setDate(d.getDate() + dias)
  return paraDataISO(d)
}

/** 0 = domingo … 6 = sábado (mesmo padrão do Date.getDay). */
export function diaDaSemana(s: DataISO): number {
  return deDataISO(s).getDay()
}

export const NOMES_DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']
export const NOMES_DIAS_CURTOS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

export function formatarDataLonga(s: DataISO): string {
  return deDataISO(s).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
}
