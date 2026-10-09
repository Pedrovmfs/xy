import { useCallback, useEffect, useRef } from 'react'

/**
 * Devolve uma versão "com atraso" (debounce) de fn: só roda quando a pessoa para de
 * digitar por `ms`. Serve para salvar enquanto digita sem gravar a cada letra.
 */
export function useComAtraso<A extends unknown[]>(fn: (...args: A) => unknown, ms = 600) {
  const timer = useRef<number | undefined>(undefined)
  const ultimaFn = useRef(fn)
  useEffect(() => {
    ultimaFn.current = fn
  })
  useEffect(() => () => clearTimeout(timer.current), [])
  return useCallback(
    (...args: A) => {
      clearTimeout(timer.current)
      timer.current = window.setTimeout(() => void ultimaFn.current(...args), ms)
    },
    [ms],
  )
}

/** localStorage pode falhar (modo privado, armazenamento cheio): nunca quebrar o app por isso. */
export const rascunho = {
  ler(chave: string): string {
    try {
      return localStorage.getItem(chave) ?? ''
    } catch {
      return ''
    }
  },
  gravar(chave: string, valor: string) {
    try {
      if (valor) localStorage.setItem(chave, valor)
      else localStorage.removeItem(chave)
    } catch {
      /* sem rascunho, paciência */
    }
  },
}
