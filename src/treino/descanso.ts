import { useEffect, useState, useSyncExternalStore } from 'react'

// Timer de descanso. Guarda a HORA em que o descanso acaba (e não um contador de
// segundos): se o iPhone suspender o app, ao voltar o tempo continua certo.
// Sem som (o Pedro usa o iPhone no silencioso): o fim aparece na barra.

interface Estado {
  terminaEm: number // epoch ms
  total: number // s
  pausadoCom: number | null // s restantes quando pausado
}

let estado: Estado | null = null
const ouvintes = new Set<() => void>()
const emitir = () => ouvintes.forEach((f) => f())

export function iniciarDescanso(segundos: number) {
  estado = { terminaEm: Date.now() + segundos * 1000, total: segundos, pausadoCom: null }
  emitir()
}

export function ajustarDescanso(delta: number) {
  if (!estado) return
  if (estado.pausadoCom != null) estado = { ...estado, pausadoCom: Math.max(5, estado.pausadoCom + delta) }
  else estado = { ...estado, terminaEm: Math.max(Date.now() + 5000, estado.terminaEm + delta * 1000) }
  estado = { ...estado, total: Math.max(estado.total, restante(estado)) }
  emitir()
}

export function pausarOuSeguir() {
  if (!estado) return
  estado =
    estado.pausadoCom != null
      ? { ...estado, terminaEm: Date.now() + estado.pausadoCom * 1000, pausadoCom: null }
      : { ...estado, pausadoCom: restante(estado) }
  emitir()
}

export function pararDescanso() {
  estado = null
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
