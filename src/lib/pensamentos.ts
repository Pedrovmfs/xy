import type { TipoPensamento } from '../db'
import { hoje, somarDias, somarMeses, type DataISO } from './datas'

export const TIPOS: { valor: TipoPensamento; nome: string }[] = [
  { valor: 'pensamento', nome: 'pensamento' },
  { valor: 'sentimento', nome: 'sentimento' },
  { valor: 'sensacao', nome: 'sensação' },
  { valor: 'dor', nome: 'dor' },
]

export const nomeDoTipo = (t?: TipoPensamento) => TIPOS.find((x) => x.valor === t)?.nome

export const RESGATES: { nome: string; calcular: (d: DataISO) => DataISO }[] = [
  { nome: '1 semana', calcular: (d) => somarDias(d, 7) },
  { nome: '1 mês', calcular: (d) => somarMeses(d, 1) },
  { nome: '3 meses', calcular: (d) => somarMeses(d, 3) },
  { nome: '6 meses', calcular: (d) => somarMeses(d, 6) },
  { nome: '1 ano', calcular: (d) => somarMeses(d, 12) },
]

/** Quantos dias o resgate fica no Hoje antes de sumir sozinho (se for ignorado). */
export const DIAS_VISIVEL_RESGATE = 7

/** Tira acentos e caixa, para a busca achar "sensacao" em "sensação". */
export function normalizar(s: string): string {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
}

/** "#faculdade #Prova" → ['faculdade', 'prova'] (sem repetir). */
export function extrairEtiquetas(texto: string): string[] {
  const achadas = texto.match(/#[\p{L}\p{N}_-]+/gu) ?? []
  return [...new Set(achadas.map((t) => t.slice(1).toLowerCase()))]
}

/** Resgates que aparecem no Hoje: venceram há menos de uma semana e não foram dispensados. */
export function resgateVisivel(t: { resurfaceAt?: DataISO; resurfaceDismissed?: boolean }, dia: DataISO = hoje()): boolean {
  return (
    !!t.resurfaceAt &&
    !t.resurfaceDismissed &&
    t.resurfaceAt <= dia &&
    t.resurfaceAt > somarDias(dia, -DIAS_VISIVEL_RESGATE)
  )
}
