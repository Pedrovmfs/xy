import { useState } from 'react'
import { formatarDataLonga, hoje, type DataISO } from '../lib/datas'
import { Folha } from '../componentes/Folha'
import { apagarRefeicao, formatarKcal, salvarMetasNutricao, useComidaDoDia, useMetasNutricao } from './dados'
import { RegistrarComida } from './RegistrarComida'
import { espacoBase, extraDaLivre, useSemanaLivres } from './saldo'
import { deArtigo, type MetasNutricao } from './cardapio'

const hora = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

// O que foi comido no dia: totais contra as metas, a lista (com apagar) e registrar mais.
export function FolhaComida({ date, aoFechar }: { date: DataISO; aoFechar: () => void }) {
  const dia = useComidaDoDia(date)
  const metas = useMetasNutricao()
  const semana = useSemanaLivres(date, metas)
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
          {dia.extraLivre > 0 && (
            <span className="rotulo">
              {formatarKcal(dia.kcalDia)} do dia normal + {formatarKcal(dia.extraLivre)} da livre (no espaço da semana)
            </span>
          )}
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
                  {m.free && ` · +${formatarKcal(extraDaLivre(m))} no espaço${m.replacesLabel ? ` (no lugar ${deArtigo(m.replacesLabel)})` : ''}`}
                </span>
              </span>
              <button className="refeicao-apagar" onClick={() => void apagarRefeicao(m)} aria-label={`Apagar ${m.name}`}>
                apagar
              </button>
            </li>
          ))}
        </ul>
      )}

      {semana && <EspacoDaSemana semana={semana} />}

      {editandoMetas ? (
        <EditorMetas metas={metas} aoFechar={() => setEditandoMetas(false)} />
      ) : (
        <button className="link metas-link" onClick={() => setEditandoMetas(true)}>mudar metas</button>
      )}

      {registrando && <RegistrarComida date={date} aoFechar={() => setRegistrando(false)} aoRegistrar={aoFechar} />}
    </Folha>
  )
}

/** Espaço de livres da semana: quanto tem, quanto foi usado, o que passa pra próxima. */
function EspacoDaSemana({ semana }: { semana: NonNullable<ReturnType<typeof useSemanaLivres>> }) {
  const restam = semana.espaco - semana.usado
  const n = semana.livres.length
  return (
    <div className="espaco-livres">
      <h3 className="secao-titulo">Livres da semana</h3>
      <p className="espaco-numeros">
        {n === 0 ? 'nenhuma ainda' : `${n} ${n === 1 ? 'livre' : 'livres'} · ${formatarKcal(semana.usado)} kcal usadas`}
        {' · '}
        {restam >= 0 ? `restam ${formatarKcal(restam)}` : `${formatarKcal(-restam)} passam pra próxima semana`}
      </p>
      <p className="nota-discreta">
        Espaço da semana: {formatarKcal(Math.max(0, semana.espaco))} kcal
        {semana.herdado > 0 && ` (${formatarKcal(semana.herdado)} a menos, da semana passada)`}. Os dias normais não mudam.
      </p>
    </div>
  )
}

function EditorMetas({ metas, aoFechar }: { metas: MetasNutricao; aoFechar: () => void }) {
  const [c, setC] = useState({
    min: String(metas.proteinaMin),
    max: String(metas.proteinaMax),
    kcal: String(metas.kcalMax),
    gasto: String(metas.gastoDiario),
    deficit: String(metas.deficitMinimo),
  })
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
      <div className="cardio-numeros">
        <label className="campo"><span className="rotulo">Gasto por dia (kcal)</span>
          <input className="entrada entrada-grande" inputMode="numeric" value={c.gasto} onChange={(e) => setC({ ...c, gasto: e.target.value })} /></label>
        <label className="campo"><span className="rotulo">Déficit mín./semana</span>
          <input className="entrada entrada-grande" inputMode="numeric" value={c.deficit} onChange={(e) => setC({ ...c, deficit: e.target.value })} /></label>
      </div>
      <p className="nota-discreta">
        Espaço de livres por semana: ({formatarKcal(n(c.gasto, metas.gastoDiario))} − {formatarKcal(n(c.kcal, metas.kcalMax))}) × 7 − {formatarKcal(n(c.deficit, metas.deficitMinimo))} ={' '}
        {formatarKcal(espacoBase({ ...metas, kcalMax: n(c.kcal, metas.kcalMax), gastoDiario: n(c.gasto, metas.gastoDiario), deficitMinimo: n(c.deficit, metas.deficitMinimo) }))} kcal
      </p>
      <button className="botao-secundario" onClick={async () => {
        const min = n(c.min, metas.proteinaMin)
        await salvarMetasNutricao({
          proteinaMin: min,
          proteinaMax: Math.max(min, n(c.max, metas.proteinaMax)),
          kcalMax: n(c.kcal, metas.kcalMax),
          gastoDiario: n(c.gasto, metas.gastoDiario),
          deficitMinimo: n(c.deficit, metas.deficitMinimo),
        })
        aoFechar()
      }}>Salvar metas</button>
    </div>
  )
}
