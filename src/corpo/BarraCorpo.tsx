import { useState } from 'react'
import type { DataISO } from '../lib/datas'
import { formatarKg, formatarLitros, formatarPassos, formatarSono, somarAgua, useDia, useMetasCorpo } from './dados'
import { FolhaCorpo } from './FolhaCorpo'

// No Hoje: água (com "+ copo" a um toque) e uma linha pequena com peso, sono e passos.
// Tocar abre a folha do corpo com tudo do dia e a semana.
export function BarraCorpo({ date }: { date: DataISO }) {
  const dia = useDia(date)
  const metas = useMetasCorpo()
  const [aberta, setAberta] = useState(false)
  if (!dia || !metas) return null

  const agua = dia.water ?? 0
  const registros = [
    dia.weight ? `peso ${formatarKg(dia.weight)}` : '',
    dia.sleep ? `sono ${formatarSono(dia.sleep)}` : '',
    dia.steps ? `${formatarPassos(dia.steps)} passos` : '',
  ].filter(Boolean)

  return (
    <div className="corpo-barra">
      <div className="corpo-agua">
        <button className="nutricao-linha corpo-agua-linha" onClick={() => setAberta(true)} aria-label="Corpo do dia">
          <span className="nutricao-nome">água</span>
          <span className="barra-neutra nutricao-trilho">
            <span style={{ width: `${Math.min(100, (agua / metas.aguaMl) * 100)}%` }} />
          </span>
          <span className="nutricao-num">
            {formatarLitros(agua)}
            <span className="nutricao-resto"> de {formatarLitros(metas.aguaMl)}</span>
          </span>
        </button>
        <button className="corpo-copo" onClick={() => void somarAgua(date, metas.copoMl, agua)} aria-label={`Mais ${metas.copoMl} ml de água`}>
          + copo
        </button>
      </div>
      <button className="corpo-registros" onClick={() => setAberta(true)}>
        {registros.length ? registros.join(' · ') : '+ peso · sono · passos'}
      </button>
      {aberta && <FolhaCorpo date={date} aoFechar={() => setAberta(false)} />}
    </div>
  )
}
