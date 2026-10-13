import { useState } from 'react'
import type { DataISO } from '../lib/datas'
import { formatarKcal, useComidaDoDia, useMetasNutricao } from './dados'
import { FolhaComida } from './FolhaComida'

// Linha discreta no Hoje: proteína e calorias do dia, com quanto falta.
// Nada de vermelho: passou das calorias, a barra só fica cheia e o número aparece.
export function BarraNutricao({ date }: { date: DataISO }) {
  const dia = useComidaDoDia(date)
  const metas = useMetasNutricao()
  const [aberta, setAberta] = useState(false)
  if (!dia || !metas) return null

  const faltaProteina = Math.max(0, metas.proteinaMin - dia.proteina)
  const sobraKcal = metas.kcalMax - dia.kcal

  return (
    <>
      <button className="nutricao-barra" onClick={() => setAberta(true)} aria-label="Comida do dia">
        <span className="nutricao-linha">
          <span className="nutricao-nome">proteína</span>
          <span className="barra-neutra nutricao-trilho">
            <span style={{ width: `${Math.min(100, (dia.proteina / metas.proteinaMin) * 100)}%` }} />
          </span>
          <span className="nutricao-num">
            {Math.round(dia.proteina)} g
            <span className="nutricao-resto">{faltaProteina > 0 ? ` · faltam ${Math.round(faltaProteina)}` : ' · meta'}</span>
          </span>
        </span>
        <span className="nutricao-linha">
          <span className="nutricao-nome">calorias</span>
          <span className="barra-neutra nutricao-trilho">
            <span style={{ width: `${Math.min(100, (dia.kcal / metas.kcalMax) * 100)}%` }} />
          </span>
          <span className="nutricao-num">
            {formatarKcal(dia.kcal)}
            <span className="nutricao-resto">
              {sobraKcal >= 0 ? ` · sobram ${formatarKcal(sobraKcal)}` : ` · ${formatarKcal(-sobraKcal)} acima`}
            </span>
          </span>
        </span>
      </button>
      {aberta && <FolhaComida date={date} aoFechar={() => setAberta(false)} />}
    </>
  )
}
