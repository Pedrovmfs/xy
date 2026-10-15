import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { avisar } from '../lib/aviso'

// Pular um treino da sequência (A → B → C…): quando a semana aperta e não dá para
// fazer todos, o próximo sugerido passa a ser o seguinte. Não apaga nada e não conta
// como falta; é só onde a sequência continua. Guardado em meta['treino:pulos'].

const CHAVE = 'treino:pulos'

export interface Pulo {
  workoutId: string
  /** quando foi pulado (ISO) */
  at: string
}

export async function lerPulos(): Promise<Pulo[]> {
  return ((await db.meta.get(CHAVE))?.value as Pulo[] | undefined) ?? []
}

export function usePulos(): Pulo[] | undefined {
  return useLiveQuery(lerPulos)
}

export async function pularTreino(workoutId: string, nome: string) {
  const antes = await lerPulos()
  // só os últimos importam para a sequência; guarda alguns para poder desfazer
  await db.meta.put({ key: CHAVE, value: [...antes, { workoutId, at: new Date().toISOString() }].slice(-20) })
  avisar(`${nome} pulado`, () => db.meta.put({ key: CHAVE, value: antes }))
}
