import { useSyncExternalStore } from 'react'

// Qual sessão de treino está aberta na tela (null = nenhuma). Global, para poder
// abrir o treino de qualquer lugar (folha do item, linha "treino em andamento"…).

let aberta: string | null = null
const ouvintes = new Set<() => void>()

export function abrirTreino(sessaoId: string) {
  aberta = sessaoId
  ouvintes.forEach((f) => f())
}
export function fecharTreino() {
  aberta = null
  ouvintes.forEach((f) => f())
}
export function useTreinoAberto(): string | null {
  return useSyncExternalStore(
    (f) => {
      ouvintes.add(f)
      return () => ouvintes.delete(f)
    },
    () => aberta,
  )
}
