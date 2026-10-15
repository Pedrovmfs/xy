import { useState } from 'react'
import { formatarDataLonga, hoje, somarDias, type DataISO } from '../lib/datas'
import { diasDaSemana, inicioDaSemana } from '../lib/semana'
import { useComAtraso } from '../lib/atraso'
import { Folha } from '../componentes/Folha'
import { GraficoLinha } from '../componentes/GraficoLinha'
import {
  formatarKg, formatarLitros, formatarPassos, formatarSono, lerHoras, media, mediaPeso, salvarCorpo, salvarMetasCorpo,
  somarAgua, useDia, useDias, useMetasCorpo, type MetasCorpo,
} from './dados'

const DIAS_NO_GRAFICO = 90

const lerNumero = (v: string) => {
  const n = Number(v.replace(',', '.'))
  return v.trim() === '' || !Number.isFinite(n) || n <= 0 ? undefined : n
}

// O corpo no dia: água, peso, sono, passos. Embaixo, a semana (médias) e o peso
// pela média de 7 dias nos últimos meses.
export function FolhaCorpo({ date, aoFechar }: { date: DataISO; aoFechar: () => void }) {
  const dia = useDia(date)
  const metas = useMetasCorpo()
  const inicio = inicioDaSemana(date)
  const dias = useDias(somarDias(date, -DIAS_NO_GRAFICO - 6), somarDias(inicio, 6))
  const [editandoMetas, setEditandoMetas] = useState(false)
  if (!dia || !metas || !dias) return null

  const agua = dia.water ?? 0
  const semana = diasDaSemana(inicio)
  const daSemana = dias.filter((d) => d.date >= inicio && d.date <= semana[6])
  const passos = daSemana.filter((d) => d.steps).map((d) => d.steps!)
  const sono = daSemana.filter((d) => d.sleep).map((d) => d.sleep!)
  const aguas = daSemana.filter((d) => d.water).map((d) => d.water!)
  const mPeso = mediaPeso(dias, date)
  const mPesoAntes = mediaPeso(dias, somarDias(date, -7))
  // gráfico: média de 7 dias em cada dia que teve pesagem
  const pontos = dias
    .filter((d) => d.weight && d.date >= somarDias(date, -DIAS_NO_GRAFICO) && d.date <= date)
    .map((d) => ({ data: d.date, valor: Math.round(mediaPeso(dias, d.date)! * 10) / 10 }))

  return (
    <Folha aberta aoFechar={aoFechar} titulo={date === hoje() ? 'Corpo hoje' : `Corpo · ${formatarDataLonga(date)}`}>
      <div className="corpo-agua-grande">
        <div>
          <span className="comida-total">{formatarLitros(agua)}</span>
          <span className="rotulo">água · meta {formatarLitros(metas.aguaMl)}</span>
        </div>
        <button className="botao-secundario corpo-menos" disabled={!agua} onClick={() => void somarAgua(date, -metas.copoMl, agua)}
          aria-label={`Menos ${metas.copoMl} ml`}>−</button>
        <button className="botao-secundario corpo-mais" onClick={() => void somarAgua(date, metas.copoMl, agua)}>
          + {metas.copoMl} ml
        </button>
      </div>

      <div className="cardio-numeros tres">
        <Campo key={`p${date}`} rotulo="Peso (kg)" modo="decimal" inicial={dia.weight}
          aoSalvar={(v) => salvarCorpo(date, { weight: lerNumero(v) })} />
        <Campo key={`s${date}`} rotulo="Sono (h)" modo="text" inicial={dia.sleep} placeholder="7h30"
          formatar={(n) => formatarSono(n).replace(' h ', 'h').replace(' h', 'h')}
          aoSalvar={(v) => salvarCorpo(date, { sleep: lerHoras(v) })} />
        <Campo key={`d${date}`} rotulo="Passos" modo="numeric" inicial={dia.steps}
          aoSalvar={(v) => salvarCorpo(date, { steps: lerNumero(v.replace(/\./g, '')) })} />
      </div>
      {mPeso && (
        <p className="nota-discreta">
          peso, média de 7 dias: {formatarKg(mPeso)}
          {mPesoAntes && ` · na semana anterior ${formatarKg(mPesoAntes)}`}
        </p>
      )}

      <h3 className="secao-titulo">Esta semana</h3>
      <ul className="corpo-semana">
        <li>
          <span>Passos</span>
          <span>
            {passos.length ? `média ${formatarPassos(media(passos)!)}/dia em ${passos.length} ${passos.length === 1 ? 'dia' : 'dias'}` : '—'}
            <span className="nota-discreta"> · meta {formatarPassos(metas.passosDia)}</span>
          </span>
        </li>
        <li>
          <span>Sono</span>
          <span>{sono.length ? `média ${formatarSono(media(sono)!)}` : '—'}</span>
        </li>
        <li>
          <span>Água</span>
          <span>{aguas.length ? `média ${formatarLitros(media(aguas)!)}/dia` : '—'}</span>
        </li>
      </ul>

      {pontos.length > 1 && (
        <>
          <h3 className="secao-titulo">Peso · média de 7 dias</h3>
          <GraficoLinha
            pontos={pontos}
            formatar={(v) => (Math.round(v * 10) / 10).toString().replace('.', ',')}
            descricao={`Peso pela média de 7 dias: de ${formatarKg(pontos[0].valor)} a ${formatarKg(pontos[pontos.length - 1].valor)}`}
          />
        </>
      )}

      {editandoMetas ? (
        <EditorMetas metas={metas} aoFechar={() => setEditandoMetas(false)} />
      ) : (
        <button className="link metas-link" onClick={() => setEditandoMetas(true)}>mudar metas</button>
      )}
    </Folha>
  )
}

/** Campo numérico que salva enquanto digita (meio segundo depois de parar) e ao sair. */
function Campo({ rotulo, modo, inicial, placeholder, formatar, aoSalvar }: {
  rotulo: string
  modo: 'decimal' | 'numeric' | 'text'
  inicial?: number
  placeholder?: string
  formatar?: (n: number) => string
  aoSalvar: (v: string) => unknown
}) {
  const [v, setV] = useState(inicial == null ? '' : formatar ? formatar(inicial) : String(inicial).replace('.', ','))
  const salvarDepois = useComAtraso((x: string) => aoSalvar(x))
  return (
    <label className="campo">
      <span className="rotulo">{rotulo}</span>
      <input className="entrada entrada-grande" inputMode={modo} placeholder={placeholder ?? '—'} value={v}
        onChange={(e) => {
          setV(e.target.value)
          salvarDepois(e.target.value)
        }}
        onBlur={() => void aoSalvar(v)} />
    </label>
  )
}

function EditorMetas({ metas, aoFechar }: { metas: MetasCorpo; aoFechar: () => void }) {
  const [c, setC] = useState({ agua: String(metas.aguaMl), copo: String(metas.copoMl), passos: String(metas.passosDia) })
  const n = (v: string, padrao: number) => (Number(v) > 0 ? Math.round(Number(v)) : padrao)
  return (
    <div className="metas-nutricao">
      <div className="cardio-numeros tres">
        <label className="campo"><span className="rotulo">Água (ml)</span>
          <input className="entrada entrada-grande" inputMode="numeric" value={c.agua} onChange={(e) => setC({ ...c, agua: e.target.value })} /></label>
        <label className="campo"><span className="rotulo">Copo (ml)</span>
          <input className="entrada entrada-grande" inputMode="numeric" value={c.copo} onChange={(e) => setC({ ...c, copo: e.target.value })} /></label>
        <label className="campo"><span className="rotulo">Passos/dia</span>
          <input className="entrada entrada-grande" inputMode="numeric" value={c.passos} onChange={(e) => setC({ ...c, passos: e.target.value })} /></label>
      </div>
      <button className="botao-secundario" onClick={async () => {
        await salvarMetasCorpo({ aguaMl: n(c.agua, metas.aguaMl), copoMl: n(c.copo, metas.copoMl), passosDia: n(c.passos, metas.passosDia) })
        aoFechar()
      }}>Salvar metas</button>
    </div>
  )
}
