import { useState } from 'react'
import { formatarDataLonga, hoje, type DataISO } from '../lib/datas'
import { Folha } from '../componentes/Folha'
import { apagarRefeicao, formatarKcal, salvarMetasNutricao, useComidaDoDia, useMetasNutricao } from './dados'
import { RegistrarComida } from './RegistrarComida'

const hora = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

// O que foi comido no dia: totais contra as metas, a lista (com apagar) e registrar mais.
export function FolhaComida({ date, aoFechar }: { date: DataISO; aoFechar: () => void }) {
  const dia = useComidaDoDia(date)
  const metas = useMetasNutricao()
  const [registrando, setRegistrando] = useState(false)
  const [editandoMetas, setEditandoMetas] = useState(false)
  if (!dia || !metas) return null

  return (
    <Folha aberta aoFechar={aoFechar} titulo={date === hoje() ? 'Comida de hoje' : `Comida · ${formatarDataLonga(date)}`}>
      <div className="comida-totais">
        <div>
          <span className="comida-total">{Math.round(dia.proteina)} g</span>
          <span className="rotulo">proteína · meta {metas.proteinaMin}–{metas.proteinaMax} g</span>
        </div>
        <div>
          <span className="comida-total">{formatarKcal(dia.kcal)}</span>
          <span className="rotulo">kcal · até {formatarKcal(metas.kcalMax)}</span>
        </div>
      </div>

      <button className="botao-principal" onClick={() => setRegistrando(true)}>+ registrar</button>

      {dia.meals.length === 0 ? (
        <p className="vazio">Nada registrado neste dia.</p>
      ) : (
        <ul className="lista">
          {dia.meals.map((m) => (
            <li key={m.id} className="refeicao">
              <span className="linha-texto">
                <span>
                  {m.free && <span className="etiqueta-livre">livre</span>}
                  {m.name}
                </span>
                <span className="linha-sub">
                  {hora(m.at)} · {formatarKcal(m.kcal)} kcal · {Math.round(m.protein)} g
                </span>
              </span>
              <button className="refeicao-apagar" onClick={() => void apagarRefeicao(m)} aria-label={`Apagar ${m.name}`}>
                apagar
              </button>
            </li>
          ))}
        </ul>
      )}

      {editandoMetas ? (
        <EditorMetas metas={metas} aoFechar={() => setEditandoMetas(false)} />
      ) : (
        <button className="link metas-link" onClick={() => setEditandoMetas(true)}>mudar metas</button>
      )}

      {registrando && <RegistrarComida date={date} aoFechar={() => setRegistrando(false)} aoRegistrar={aoFechar} />}
    </Folha>
  )
}

function EditorMetas({ metas, aoFechar }: { metas: { proteinaMin: number; proteinaMax: number; kcalMax: number }; aoFechar: () => void }) {
  const [c, setC] = useState({ min: String(metas.proteinaMin), max: String(metas.proteinaMax), kcal: String(metas.kcalMax) })
  const n = (v: string, padrao: number) => (Number(v) > 0 ? Math.round(Number(v)) : padrao)
  return (
    <div className="metas-nutricao">
      <div className="cardio-numeros tres">
        <label className="campo"><span className="rotulo">Proteína mín. (g)</span>
          <input className="entrada entrada-grande" inputMode="numeric" value={c.min} onChange={(e) => setC({ ...c, min: e.target.value })} /></label>
        <label className="campo"><span className="rotulo">Proteína máx. (g)</span>
          <input className="entrada entrada-grande" inputMode="numeric" value={c.max} onChange={(e) => setC({ ...c, max: e.target.value })} /></label>
        <label className="campo"><span className="rotulo">Até (kcal)</span>
          <input className="entrada entrada-grande" inputMode="numeric" value={c.kcal} onChange={(e) => setC({ ...c, kcal: e.target.value })} /></label>
      </div>
      <button className="botao-secundario" onClick={async () => {
        const min = n(c.min, metas.proteinaMin)
        await salvarMetasNutricao({ proteinaMin: min, proteinaMax: Math.max(min, n(c.max, metas.proteinaMax)), kcalMax: n(c.kcal, metas.kcalMax) })
        aoFechar()
      }}>Salvar metas</button>
    </div>
  )
}
