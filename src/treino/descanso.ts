import { useEffect, useState, useSyncExternalStore } from 'react'
import type { TipoSerie } from '../db'

// Timer de descanso. Guarda a HORA em que o descanso acaba (e não um contador de
// segundos): se o iPhone suspender o app, ao voltar o tempo continua certo.

export const DESCANSO_PADRAO: Record<TipoSerie, number> = { warmup: 45, prep: 75, work: 120 }

interface Estado {
  terminaEm: number // epoch ms
  total: number // s
  pausadoCom: number | null // s restantes quando pausado
}

let estado: Estado | null = null
let audio: AudioContext | null = null
let bipeTimer: number | undefined
const ouvintes = new Set<() => void>()
const emitir = () => ouvintes.forEach((f) => f())

/**
 * No iOS o som só sai se o áudio for "destravado" dentro de um toque do usuário.
 * Chamado ao marcar uma série (que é um toque).
 */
function destravarAudio() {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    audio ??= new AC()
    if (audio.state === 'suspended') void audio.resume()
  } catch {
    /* sem áudio */
  }
}

function bipes(n = 3) {
  if (!audio) return
  const t0 = audio.currentTime
  for (let i = 0; i < n; i++) {
    const o = audio.createOscillator()
    const g = audio.createGain()
    o.frequency.value = 880
    o.connect(g)
    g.connect(audio.destination)
    const t = t0 + i * 0.28
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.3, t + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22)
    o.start(t)
    o.stop(t + 0.24)
  }
}

function agendarBipe() {
  clearTimeout(bipeTimer)
  if (!estado || estado.pausadoCom != null) return
  bipeTimer = window.setTimeout(() => bipes(), Math.max(0, estado.terminaEm - Date.now()))
}

export function iniciarDescanso(segundos: number) {
  destravarAudio()
  estado = { terminaEm: Date.now() + segundos * 1000, total: segundos, pausadoCom: null }
  agendarBipe()
  emitir()
}

export function ajustarDescanso(delta: number) {
  if (!estado) return
  if (estado.pausadoCom != null) estado = { ...estado, pausadoCom: Math.max(5, estado.pausadoCom + delta) }
  else estado = { ...estado, terminaEm: Math.max(Date.now() + 5000, estado.terminaEm + delta * 1000) }
  estado = { ...estado, total: Math.max(estado.total, restante(estado)) }
  agendarBipe()
  emitir()
}

export function pausarOuSeguir() {
  if (!estado) return
  estado =
    estado.pausadoCom != null
      ? { ...estado, terminaEm: Date.now() + estado.pausadoCom * 1000, pausadoCom: null }
      : { ...estado, pausadoCom: restante(estado) }
  agendarBipe()
  emitir()
}

export function pararDescanso() {
  estado = null
  clearTimeout(bipeTimer)
  emitir()
}

const restante = (e: Estado) => (e.pausadoCom != null ? e.pausadoCom : Math.max(0, (e.terminaEm - Date.now()) / 1000))

/** Estado do timer, atualizado 4x por segundo enquanto existe. */
export function useDescanso() {
  const e = useSyncExternalStore(
    (f) => {
      ouvintes.add(f)
      return () => ouvintes.delete(f)
    },
    () => estado,
  )
  const [, setTique] = useState(0)
  useEffect(() => {
    if (!e) return
    const t = setInterval(() => setTique((x) => x + 1), 250)
    return () => clearInterval(t)
  }, [e])
  if (!e) return null
  const r = restante(e)
  return { restante: r, total: e.total, pausado: e.pausadoCom != null, acabou: r <= 0 }
}
