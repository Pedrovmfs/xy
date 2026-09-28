import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { diaDaSemana, formatarDataLonga, hoje } from '../lib/datas'

// Versão provisória (Parte 1): só lista a rotina do dia vinda do banco,
// para confirmar que o seed funcionou. A tela de verdade vem na Parte 2.
export function Hoje() {
  const data = hoje()
  const itens = useLiveQuery(async () => {
    const dia = diaDaSemana(data)
    const todos = await db.routine.toArray()
    return todos
      .filter((i) => i.weekdays.includes(dia))
      .sort((a, b) => (a.start ?? '99').localeCompare(b.start ?? '99'))
  }, [data])

  return (
    <section>
      <p className="subtitulo">{formatarDataLonga(data)}</p>
      {itens === undefined ? null : itens.length === 0 ? (
        <p className="vazio">Nada na rotina para hoje.</p>
      ) : (
        <ul className="lista">
          {itens.map((i) => (
            <li key={i.id} className="item">
              <span className="item-hora">{i.start ? `${i.start}–${i.end}` : 'no dia'}</span>
              <span>{i.title}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
