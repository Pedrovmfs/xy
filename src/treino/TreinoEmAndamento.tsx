import { abrirTreino } from './estado'
import { useTreinoEmAndamento } from './BotaoTreino'
import { duracaoMin } from './calculos'

// Linha discreta no topo do Hoje enquanto houver um treino aberto (ex.: saiu da tela
// para ver outra coisa): um toque volta para ele.
export function TreinoEmAndamento() {
  const s = useTreinoEmAndamento()
  if (!s) return null
  return (
    <button className="treino-andamento" onClick={() => abrirTreino(s.id)}>
      <span className="treino-andamento-ponto" />
      <span>
        {s.workoutName} em andamento · {duracaoMin(s)} min
      </span>
      <span className="link">continuar</span>
    </button>
  )
}
