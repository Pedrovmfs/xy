import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Thought } from '../db'
import { haQuantoTempo, hoje, somarDias } from '../lib/datas'
import { DIAS_VISIVEL_RESGATE, resgateVisivel } from '../lib/pensamentos'
import { EditorPensamento } from './EditorPensamento'

// Pensamentos cujo resgate chegou: uma linha pequena por pensamento, no topo do Hoje.
// Ignorou? Some sozinho depois de uma semana. Tocar abre; "ok" dispensa.
export function Resgates() {
  const [aberto, setAberto] = useState<Thought | null>(null)
  const h = hoje()
  const lista = useLiveQuery(async () => {
    const candidatos = await db.thoughts
      .where('resurfaceAt')
      .between(somarDias(h, -DIAS_VISIVEL_RESGATE + 1), h, true, true)
      .toArray()
    return candidatos.filter((t) => resgateVisivel(t, h))
  }, [h])

  if (!lista || lista.length === 0) return null

  return (
    <>
      <ul className="resgates" aria-label="Pensamentos que voltaram">
        {lista.map((t) => (
          <li key={t.id} className="resgate">
            <button className="resgate-texto" onClick={() => setAberto(t)}>
              <span className="resgate-quando">{haQuantoTempo(t.date)} você anotou</span>
              <span className="resgate-frase">{t.text}</span>
            </button>
            <button className="resgate-ok" onClick={() => db.thoughts.update(t.id, { resurfaceDismissed: true })}>
              ok
            </button>
          </li>
        ))}
      </ul>
      {aberto && <EditorPensamento key={aberto.id} pensamento={aberto} aberta aoFechar={() => setAberto(null)} />}
    </>
  )
}
