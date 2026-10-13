import type { Cardio } from '../db'

export const TIPOS_CARDIO = ['caminhada', 'corrida']

/** "3,2 km" (uma casa decimal, vírgula) */
export function formatarKm(km: number): string {
  return `${(Math.round(km * 10) / 10).toString().replace('.', ',')} km`
}

/** Ritmo em min/km ("6:30 /km"), se houver minutos. */
export function ritmo(c: Pick<Cardio, 'km' | 'minutes'>): string | null {
  if (!c.minutes || !c.km) return null
  const seg = Math.round((c.minutes * 60) / c.km)
  return `${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, '0')} /km`
}

export const somaKm = (lista: Cardio[]) => lista.reduce((t, c) => t + c.km, 0)
