import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { METAS_PADRAO, type MetasTreino } from './semente'

const CHAVE = 'treino:metas'

/** Metas e ajustes do treino (com os padrões para o que nunca foi mexido). */
export async function lerMetas(): Promise<MetasTreino> {
  const salvo = (await db.meta.get(CHAVE))?.value as Partial<MetasTreino> | undefined
  return { ...METAS_PADRAO, ...salvo, descanso: { ...METAS_PADRAO.descanso, ...salvo?.descanso } }
}

export function useMetasTreino(): MetasTreino | undefined {
  return useLiveQuery(lerMetas)
}

export async function salvarMetas(m: MetasTreino) {
  await db.meta.put({ key: CHAVE, value: m })
}
