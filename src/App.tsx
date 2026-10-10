import { useState, type ReactNode } from 'react'
import { IconeAjustes, IconeAreas, IconeHoje, IconePensamentos, IconeSemana } from './icones'
import { Hoje } from './telas/Hoje'
import { Semana } from './telas/Semana'
import { Pensamentos } from './telas/Pensamentos'
import { Areas } from './telas/Areas'
import { Ajustes } from './telas/Ajustes'
import { CapturaPensamento } from './componentes/CapturaPensamento'
import { Aviso } from './componentes/Aviso'

type Aba = 'hoje' | 'semana' | 'pensamentos' | 'areas'

const ABAS: { id: Aba; nome: string; icone: () => ReactNode }[] = [
  { id: 'hoje', nome: 'Hoje', icone: IconeHoje },
  { id: 'semana', nome: 'Semana', icone: IconeSemana },
  { id: 'pensamentos', nome: 'Pensamentos', icone: IconePensamentos },
  { id: 'areas', nome: 'Áreas', icone: IconeAreas },
]

export function App() {
  const [aba, setAba] = useState<Aba>('hoje')
  const [ajustesAbertos, setAjustesAbertos] = useState(false)

  if (ajustesAbertos) {
    return (
      <div className="app" data-abas={false}>
        <Ajustes aoSair={() => setAjustesAbertos(false)} />
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
        <button className="botao-icone" onClick={() => setAjustesAbertos(true)} aria-label="Ajustes">
          <IconeAjustes />
        </button>
      </header>

      <main className="conteudo">
        {aba === 'hoje' && <Hoje />}
        {aba === 'semana' && <Semana />}
        {aba === 'pensamentos' && <Pensamentos />}
        {aba === 'areas' && <Areas />}
      </main>

      <nav className="abas">
        {ABAS.map(({ id, nome, icone: Icone }) => (
          <button
            key={id}
            className="aba"
            aria-current={aba === id ? 'page' : undefined}
            onClick={() => setAba(id)}
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
