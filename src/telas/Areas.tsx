import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'

// Provisório (Parte 1): só lista as áreas do seed. Próximo passo e histórico vêm na Parte 5.
export function Areas() {
  const areas = useLiveQuery(() => db.areas.orderBy('order').toArray())
  return (
    <ul className="lista">
      {areas?.map((a) => (
        <li key={a.id} className="item">
          <span className="ponto-area" style={{ background: a.color }} />
          <span>{a.name}</span>
        </li>
      ))}
    </ul>
  )
}
