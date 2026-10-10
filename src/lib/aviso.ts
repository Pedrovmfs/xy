import { useSyncExternalStore } from 'react'

// Barrinha discreta no rodapé: "Apagado · desfazer", "Guardado".
// Um estado global simples (sem biblioteca): quem quer avisar chama avisar(),
// e o componente <Aviso/> se inscreve com useSyncExternalStore.

export interface AvisoAtual {
  id: number
  texto: string
  desfazer?: () => unknown
}

const DURACAO = 5000

let atual: AvisoAtual | null = null
let timer: number | undefined
let proximoId = 1
const ouvintes = new Set<() => void>()

function emitir() {
  ouvintes.forEach((f) => f())
}

export function avisar(texto: string, desfazer?: () => unknown) {
  atual = { id: proximoId++, texto, desfazer }
  clearTimeout(timer)
  timer = window.setTimeout(fecharAviso, DURACAO)
  emitir()
}

export function fecharAviso() {
  atual = null
  emitir()
}

export function useAviso(): AvisoAtual | null {
  return useSyncExternalStore(
    (f) => {
      ouvintes.add(f)
      return () => ouvintes.delete(f)
    },
    () => atual,
  )
}
