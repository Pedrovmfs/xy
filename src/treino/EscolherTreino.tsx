import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import type { DataISO } from '../lib/datas'
import { novoId } from '../lib/id'
import { Folha } from '../componentes/Folha'
import { novaSessao, proximoTreino } from './calculos'
import { abrirTreino } from './estado'
import { lerPulos, pularTreino } from './sequencia'

// Escolher qual treino fazer. O próximo da sequência (A → B → …) vem destacado,
// mas qualquer um pode ser escolhido, inclusive um treino livre, sem modelo.
// "Pular" avança a sequência sem treinar (ex.: faltou dias e quer ir direto ao seguinte).
export function EscolherTreino({ date, itemId, aoFechar }: { date: DataISO; itemId?: string; aoFechar: () => void }) {
  const dados = useLiveQuery(async () => {
    const [treinos, exercicios, sessoes, pulos] = await Promise.all([
      db.workouts.orderBy('order').toArray(),
      db.exercises.toArray(),
      db.sessions.toArray(),
      lerPulos(),
    ])
    return { treinos, exercicios: new Map(exercicios.map((e) => [e.id, e])), sessoes, pulos }
  })
  if (!dados) return null
  const sugerido = proximoTreino(dados.treinos, dados.sessoes, dados.pulos)

  async function comecar(workoutId: string | null) {
    const treino = dados!.treinos.find((t) => t.id === workoutId)
    const sessao = treino
      ? novaSessao(treino, dados!.exercicios, dados!.sessoes, { date, itemId })
      : { id: novoId(), date, itemId, workoutName: 'Treino livre', startedAt: new Date().toISOString(), entries: [] }
    await db.sessions.add(sessao)
    aoFechar()
    abrirTreino(sessao.id)
  }

  return (
    <Folha aberta aoFechar={aoFechar} titulo="Qual treino?">
      <ul className="lista">
        {dados.treinos.map((t) => (
          <li key={t.id}>
            <button className="linha" onClick={() => void comecar(t.id)}>
              <span className="linha-texto">
                <span>{t.name}</span>
                <span className="linha-sub">
                  {t.items.length} exercícios{t.id === sugerido?.id ? ' · próximo da sequência' : ''}
                </span>
              </span>
            </button>
          </li>
        ))}
        <li>
          <button className="linha" onClick={() => void comecar(null)}>
            <span className="linha-texto">
              <span>Treino livre</span>
              <span className="linha-sub">começa vazio; você adiciona os exercícios</span>
            </span>
          </button>
        </li>
      </ul>
      {sugerido && dados.treinos.length > 1 && (
        <button className="link pular-treino" onClick={() => void pularTreino(sugerido.id, sugerido.name)}>
          pular {sugerido.name} na sequência
        </button>
      )}
    </Folha>
  )
}
