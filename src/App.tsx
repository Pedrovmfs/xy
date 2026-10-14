import { useState, type ReactNode } from 'react'
import { IconeAjustes, IconeAreas, IconeHoje, IconeNutricao, IconePensamentos, IconeSemana, IconeTreino } from './icones'
import { Hoje } from './telas/Hoje'
import { Semana } from './telas/Semana'
import { Pensamentos } from './telas/Pensamentos'
import { Treino } from './telas/Treino'
import { Nutricao } from './telas/Nutricao'
import { Areas } from './telas/Areas'
import { Ajustes } from './telas/Ajustes'
import { CapturaPensamento } from './componentes/CapturaPensamento'
import { Aviso } from './componentes/Aviso'
import type { DataISO } from './lib/datas'
import { TelaTreino } from './treino/TelaTreino'
import { useTreinoAberto } from './treino/estado'

type Aba = 'hoje' | 'semana' | 'treino' | 'nutricao' | 'pensamentos' | 'areas'

const ABAS: { id: Aba; nome: string; icone: () => ReactNode }[] = [
  { id: 'hoje', nome: 'Hoje', icone: IconeHoje },
  { id: 'semana', nome: 'Semana', icone: IconeSemana },
  { id: 'treino', nome: 'Treino', icone: IconeTreino },
  { id: 'nutricao', nome: 'Nutrição', icone: IconeNutricao },
  { id: 'pensamentos', nome: 'Pensamentos', icone: IconePensamentos },
  { id: 'areas', nome: 'Áreas', icone: IconeAreas },
]

export function App() {
  const [aba, setAba] = useState<Aba>('hoje')
  const [ajustesAbertos, setAjustesAbertos] = useState(false)
  const treinoAberto = useTreinoAberto()
  const [secaoAjustes, setSecaoAjustes] = useState<'rotina' | undefined>()
  // dia que o Hoje deve abrir quando se chega por outra tela (ex.: tocar num dia da Semana)
  const [diaHoje, setDiaHoje] = useState<DataISO | undefined>()

  // treino aberto ocupa a tela toda (sem abas), como Ajustes
  if (treinoAberto) {
    return (
      <div className="app" data-abas={false} data-treino>
        <TelaTreino key={treinoAberto} sessaoId={treinoAberto} />
        <CapturaPensamento />
        <Aviso />
      </div>
    )
  }

  if (ajustesAbertos) {
    return (
      <div className="app" data-abas={false}>
        <Ajustes secaoInicial={secaoAjustes} aoSair={() => setAjustesAbertos(false)} />
        <CapturaPensamento />
        <Aviso />
      </div>
    )
  }

  return (
    <div className="app">
      <header className="topo">
        <span className="botao-icone" />
        <h1 className="topo-titulo">{ABAS.find((a) => a.id === aba)!.nome}</h1>
        <button className="botao-icone" onClick={() => { setSecaoAjustes(undefined); setAjustesAbertos(true) }} aria-label="Ajustes">
          <IconeAjustes />
        </button>
      </header>

      <main className="conteudo">
        {/* a key recria o Hoje quando o dia pedido muda (ex.: tocar na aba Hoje volta para hoje) */}
        {aba === 'hoje' && <Hoje key={diaHoje ?? 'hoje'} dataInicial={diaHoje} />}
        {aba === 'semana' && (
          <Semana
            aoIrParaDia={(d) => {
              setDiaHoje(d)
              setAba('hoje')
            }}
            aoEditarRotina={() => {
              setSecaoAjustes('rotina')
              setAjustesAbertos(true)
            }}
          />
        )}
        {aba === 'treino' && <Treino />}
        {aba === 'nutricao' && <Nutricao />}
        {aba === 'pensamentos' && <Pensamentos />}
        {aba === 'areas' && <Areas />}
      </main>

      <nav className="abas">
        {ABAS.map(({ id, nome, icone: Icone }) => (
          <button
            key={id}
            className="aba"
            aria-current={aba === id ? 'page' : undefined}
            onClick={() => {
              setDiaHoje(undefined) // tocar na aba Hoje sempre volta para hoje
              setAba(id)
            }}
          >
            <Icone />
            <span>{nome}</span>
          </button>
        ))}
      </nav>
      <CapturaPensamento />
      <Aviso />
    </div>
  )
}
