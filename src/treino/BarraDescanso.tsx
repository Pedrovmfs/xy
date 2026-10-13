import { ajustarDescanso, pararDescanso, pausarOuSeguir, useDescanso } from './descanso'


// Barra do descanso no rodapé da tela de treino. Some sozinha ao tocar no ✕
// ou quando outra série é marcada (que reinicia o timer).
export function BarraDescanso() {
  const d = useDescanso()
  if (!d) return null
  const seg = Math.ceil(d.restante)
  return (
    <div className="descanso" data-acabou={d.acabou || undefined} role="timer" aria-live="off">
      <button className="descanso-botao" onClick={() => ajustarDescanso(-15)} aria-label="Menos 15 segundos">−15</button>
      <div className="descanso-meio">
        <span className="descanso-tempo">{d.acabou ? 'descanso acabou' : `${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, '0')}`}</span>
        <span className="descanso-trilho">
          <span className="descanso-preenchido" style={{ width: `${d.total ? (1 - d.restante / d.total) * 100 : 100}%` }} />
        </span>
      </div>
      <button className="descanso-botao" onClick={() => ajustarDescanso(15)} aria-label="Mais 15 segundos">+15</button>
      {!d.acabou && (
        <button className="descanso-botao" onClick={pausarOuSeguir} aria-label={d.pausado ? 'Continuar' : 'Pausar'}>
          {d.pausado ? '▶' : '❙❙'}
        </button>
      )}
      <button className="descanso-botao" onClick={pararDescanso} aria-label="Fechar descanso">✕</button>
    </div>
  )
}

