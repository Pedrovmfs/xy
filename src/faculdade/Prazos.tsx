import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Coursework } from '../db'
import { hoje, somarDias } from '../lib/datas'
import { EditorEntrega, nomeDoTipo, quandoFalta } from './EditorEntrega'

/** Quantos dias antes uma prova/entrega aparece no Hoje. */
export const DIAS_DE_AVISO = 3

// No Hoje: provas e entregas dos próximos dias, uma linha discreta cada, com quanto falta.
// Some quando é marcada como feita (ou quando a data passa).
export function Prazos() {
  const h = hoje()
  const [aberta, setAberta] = useState<Coursework | null>(null)
  const dados = useLiveQuery(async () => {
    const [lista, materias] = await Promise.all([
      db.coursework.where('due').between(h, somarDias(h, DIAS_DE_AVISO), true, true).toArray(),
      db.subjects.toArray(),
    ])
    return {
      lista: lista.filter((c) => !c.done).sort((a, b) => a.due.localeCompare(b.due)),
      nomes: new Map(materias.map((m) => [m.id, m.name])),
    }
  }, [h])
  if (!dados || dados.lista.length === 0) return null

  return (
    <>
      <ul className="prazos" aria-label="Provas e entregas dos próximos dias">
        {dados.lista.map((c) => (
          <li key={c.id}>
            <button className="prazo" onClick={() => setAberta(c)}>
              <span className="prazo-quando">{quandoFalta(c.due, h)}</span>
              <span className="prazo-texto">
                {nomeDoTipo(c.kind)} · {c.title} <span className="prazo-materia">· {dados.nomes.get(c.subjectId)}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      {aberta && <EditorEntrega key={aberta.id} entrega={aberta} aoFechar={() => setAberta(null)} />}
    </>
  )
}
