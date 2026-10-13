import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Area } from '../db'
import { hoje, NOMES_DIAS_CURTOS, somarDias, type DataISO } from '../lib/datas'
import { diasDaSemana, formatarSemana, inicioDaSemana, useSemana, type LinhaSemana } from '../lib/semana'
import { useDeslizar } from '../lib/deslizar'
import { FolhaItem } from '../componentes/FolhaItem'
import { IconeAvancar, IconeFeito, IconeVoltar } from '../icones'

// A semana como ela foi: o que aconteceu em cada dia, contagem por área e metas.
// Tudo neutro: "3 de 5", sem cores de alarme para o que não foi feito.

export function Semana({ aoIrParaDia, aoEditarRotina }: {
  aoIrParaDia: (d: DataISO) => void
  aoEditarRotina: () => void
}) {
  const estaSemana = inicioDaSemana(hoje())
  const [inicio, setInicio] = useState(estaSemana)
  // guarda só a posição (linha, dia): o item e o estado são lidos de novo a cada mudança
  const [aberto, setAberto] = useState<{ chave: string; i: number } | null>(null)
  const deslize = useDeslizar({ sentidos: [1, -1], aoConfirmar: (s) => setInicio((i) => somarDias(i, -7 * s)) })

  const dados = useSemana(inicio)
  const areas = useLiveQuery(async () => new Map((await db.areas.toArray()).map((a) => [a.id, a])))
  if (!dados || !areas) return null

  const datas = diasDaSemana(inicio)
  const diaDeHoje = hoje()
  const celula = aberto ? dados.linhas.find((l) => l.chave === aberto.chave)?.dias[aberto.i] : null

  return (
    <section className="semana" {...deslize.handlers}>
      <div className="nav-dia">
        <button className="botao-icone" onClick={() => setInicio(somarDias(inicio, -7))} aria-label="Semana anterior">
          <IconeVoltar />
        </button>
        <div className="nav-dia-meio">
          <span className="nav-dia-data">{formatarSemana(inicio)}</span>
          {inicio === estaSemana ? (
            <span className="nav-dia-rel">esta semana</span>
          ) : (
            <button className="nav-dia-rel link" onClick={() => setInicio(estaSemana)}>voltar pra esta semana</button>
          )}
        </div>
        <button className="botao-icone" onClick={() => setInicio(somarDias(inicio, 7))} aria-label="Próxima semana">
          <IconeAvancar />
        </button>
      </div>

      <div ref={deslize.alvo}>
        <ResumoPorArea linhas={dados.linhas} areas={areas} />

        {dados.linhas.length > 0 && (
          <div className="grade" role="table" aria-label="Itens da semana">
            <div className="grade-linha grade-cabecalho" role="row">
              <span />
              {datas.map((d) => (
                <button key={d} className="grade-dia" data-hoje={d === diaDeHoje || undefined} onClick={() => aoIrParaDia(d)}
                  aria-label={`Abrir ${d} no Hoje`}>
                  <span>{NOMES_DIAS_CURTOS[(datas.indexOf(d) + 1) % 7]}</span>
                  <span className="grade-num">{Number(d.slice(8))}</span>
                </button>
              ))}
            </div>
            {dados.linhas.map((l) => (
              <LinhaDaGrade key={l.chave} linha={l} area={l.areaId ? areas.get(l.areaId) : undefined} datas={datas}
                aoAbrir={(i) => setAberto({ chave: l.chave, i })} />
            ))}
          </div>
        )}

        {dados.habitos.length > 0 && (
          <div className="grade grade-habitos" role="table" aria-label="Hábitos da semana">
            <h2 className="secao-titulo">Hábitos</h2>
            {dados.habitos.map((h) => {
              const feitos = h.dias.filter((d) => d === 'feito').length
              const valem = h.dias.filter((d) => d !== null).length
              return (
                <div key={h.id} className="grade-linha" role="row">
                  <span className="grade-rotulo">
                    <span className="grade-titulo">{h.nome}</span>
                    <span className="grade-conta">{feitos} de {valem}</span>
                  </span>
                  {h.dias.map((d, i) => (
                    <span key={i} className="grade-celula">
                      {d && <span className="habito-bolinha" data-feito={d === 'feito' || undefined} />}
                    </span>
                  ))}
                </div>
              )
            })}
          </div>
        )}

        <button className="adicionar-no-dia" onClick={aoEditarRotina}>editar a rotina</button>
      </div>

      {celula && (
        <FolhaItem key={`${aberto!.chave}|${aberto!.i}`} item={celula.item} date={datas[aberto!.i]} entry={celula.entry}
          aoFechar={() => setAberto(null)} />
      )}
    </section>
  )
}

function contar(linha: LinhaSemana) {
  const dias = linha.dias.filter((d) => d !== null)
  return {
    previstos: dias.length,
    feitos: dias.filter((d) => d!.entry?.status === 'done').length,
    comMotivo: dias.filter((d) => d!.entry?.status === 'skipped' && d!.entry.reason).length,
    semMotivo: dias.filter((d) => d!.entry?.status === 'skipped' && !d!.entry.reason).length,
  }
}

function LinhaDaGrade({ linha, area, datas, aoAbrir }: {
  linha: LinhaSemana
  area?: Area
  datas: DataISO[]
  aoAbrir: (indice: number) => void
}) {
  const c = contar(linha)
  return (
    <div className="grade-linha" role="row" style={{ ['--cor-area' as string]: area?.color ?? 'var(--texto-suave)' }}>
      <span className="grade-rotulo">
        <span className="grade-titulo">{linha.titulo}</span>
        <span className="grade-conta">{c.feitos} de {c.previstos}</span>
      </span>
      {linha.dias.map((d, i) =>
        d ? (
          <button key={i} className="grade-celula" onClick={() => aoAbrir(i)}
            aria-label={`${linha.titulo}, ${datas[i]}: ${d.entry?.status === 'done' ? 'feito' : d.entry?.status === 'skipped' ? 'não feito' : 'sem marcação'}`}>
            <span className="marca marca-pequena" data-estado={d.entry?.status}>
              {d.entry?.status === 'done' && <IconeFeito />}
            </span>
          </button>
        ) : (
          <span key={i} className="grade-celula" />
        ),
      )}
    </div>
  )
}

function ResumoPorArea({ linhas, areas }: { linhas: LinhaSemana[]; areas: Map<string, Area> }) {
  // soma as linhas de cada área
  const porArea = new Map<string, ReturnType<typeof contar>>()
  for (const l of linhas) {
    if (!l.areaId) continue
    const c = contar(l)
    const t = porArea.get(l.areaId) ?? { previstos: 0, feitos: 0, comMotivo: 0, semMotivo: 0 }
    porArea.set(l.areaId, {
      previstos: t.previstos + c.previstos,
      feitos: t.feitos + c.feitos,
      comMotivo: t.comMotivo + c.comMotivo,
      semMotivo: t.semMotivo + c.semMotivo,
    })
  }
  const lista = [...areas.values()].filter((a) => porArea.has(a.id)).sort((a, b) => a.order - b.order)
  if (lista.length === 0) return <p className="vazio">Nada na rotina nesta semana.</p>

  return (
    <ul className="resumo-areas">
      {lista.map((a) => {
        const c = porArea.get(a.id)!
        // com meta semanal, a conta é contra a meta (a semana é flexível: pode compensar
        // num dia que no papel era descanso); sem meta, contra o que estava previsto
        const total = a.weeklyGoal ?? c.previstos
        const faltas = [
          c.comMotivo ? `${c.comMotivo} com motivo` : '',
          c.semMotivo ? `${c.semMotivo} sem motivo` : '',
        ].filter(Boolean)
        return (
          <li key={a.id} className="resumo-area">
            <span className="ponto-area" style={{ background: a.color }} />
            <span className="resumo-nome">{a.name}</span>
            {a.weeklyGoal ? (
              <span className="resumo-meta" aria-label={`${c.feitos} de ${a.weeklyGoal}`}>
                {Array.from({ length: Math.max(a.weeklyGoal, c.feitos) }, (_, i) => (
                  <span key={i} className="meta-ponto" data-cheio={i < c.feitos || undefined} style={{ ['--cor-area' as string]: a.color }} />
                ))}
              </span>
            ) : null}
            <span className="resumo-conta">
              {c.feitos} de {total}
              {faltas.length > 0 && <span className="resumo-faltas"> · não feito: {faltas.join(', ')}</span>}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
