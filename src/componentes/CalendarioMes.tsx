import { useState } from 'react'
import { deDataISO, hoje, paraDataISO, type DataISO } from '../lib/datas'
import { IconeAvancar, IconeVoltar } from '../icones'
import { Folha } from './Folha'

const LETRAS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'] // semana começando na segunda

// Folha com o mês em grade, para pular direto para qualquer dia.
export function CalendarioMes({ selecionada, aoEscolher, aoFechar }: {
  selecionada: DataISO
  aoEscolher: (d: DataISO) => void
  aoFechar: () => void
}) {
  const sel = deDataISO(selecionada)
  const [mes, setMes] = useState(() => new Date(sel.getFullYear(), sel.getMonth(), 1, 12))
  const diaDeHoje = hoje()

  // células: espaços vazios até a segunda-feira + os dias do mês
  const vazios = (mes.getDay() + 6) % 7
  const diasNoMes = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate()
  const dias = Array.from({ length: diasNoMes }, (_, i) =>
    paraDataISO(new Date(mes.getFullYear(), mes.getMonth(), i + 1, 12)),
  )
  const mudarMes = (n: number) => setMes(new Date(mes.getFullYear(), mes.getMonth() + n, 1, 12))
  const nomeMes = mes.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  return (
    <Folha aberta aoFechar={aoFechar} titulo="Ir para o dia">
      <div className="cal-topo">
        <button className="botao-icone" onClick={() => mudarMes(-1)} aria-label="Mês anterior"><IconeVoltar /></button>
        <span className="cal-mes">{nomeMes}</span>
        <button className="botao-icone" onClick={() => mudarMes(1)} aria-label="Próximo mês"><IconeAvancar /></button>
      </div>
      <div className="cal-grade">
        {LETRAS.map((l, i) => <span key={i} className="cal-semana">{l}</span>)}
        {Array.from({ length: vazios }, (_, i) => <span key={`v${i}`} />)}
        {dias.map((d) => (
          <button
            key={d}
            className="cal-dia"
            data-hoje={d === diaDeHoje || undefined}
            aria-pressed={d === selecionada}
            onClick={() => {
              aoEscolher(d)
              aoFechar()
            }}
          >
            {Number(d.slice(8))}
          </button>
        ))}
      </div>
      {selecionada !== diaDeHoje && (
        <button className="botao-novo cal-hoje" onClick={() => { aoEscolher(diaDeHoje); aoFechar() }}>
          Ir para hoje
        </button>
      )}
    </Folha>
  )
}
