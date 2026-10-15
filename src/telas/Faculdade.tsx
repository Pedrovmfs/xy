import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Coursework, type Entry, type Oneoff, type RoutineItem, type Subject } from '../db'
import { formatarDataCurta, formatarDataLonga, hoje, NOMES_DIAS_CURTOS } from '../lib/datas'
import { valeNoDia, type ItemDoDia } from '../lib/dia'
import { PaginaInterna } from '../componentes/PaginaInterna'
import { FolhaItem } from '../componentes/FolhaItem'
import { IconeAvancar } from '../icones'
import {
  aulasDaMateria, consumirMateriaPedida, faltasDaMateria, modoDaEntry, nomeDoModo, proximaAula, useMateriaPedida, type Aula,
} from '../faculdade/dados'
import { EditorMateria } from '../faculdade/EditorMateria'
import { EditorEntrega, nomeDoTipo, quandoFalta } from '../faculdade/EditorEntrega'

// Aba Faculdade: próximas provas/entregas, as aulas de hoje e as matérias. Cada matéria
// junta tudo dela ao longo do semestre (aulas, faltas, provas, notas).
// Faltas mostradas como número, sem alarme.

type Pagina = { tipo: 'materia'; id: string } | { tipo: 'arquivadas' }

interface Dados {
  materias: Subject[]
  rotina: RoutineItem[]
  avulsos: Oneoff[]
  entries: Entry[]
  entregas: Coursework[]
}

function useDadosFaculdade(): Dados | undefined {
  return useLiveQuery(async () => {
    const [materias, rotina, avulsosTodos, entregas] = await Promise.all([
      db.subjects.orderBy('order').toArray(),
      db.routine.toArray(),
      db.oneoffs.toArray(),
      db.coursework.toArray(),
    ])
    const avulsos = avulsosTodos.filter((o) => o.subjectId)
    const ids = [...rotina.filter((r) => r.subjectId).map((r) => r.id), ...avulsos.map((o) => o.id)]
    const entries = ids.length ? await db.entries.where('itemId').anyOf(ids).toArray() : []
    return { materias, rotina, avulsos, entries, entregas }
  })
}

const paraItemDoDia = (i: RoutineItem | Oneoff): ItemDoDia => ({ ...i, origem: 'weekdays' in i ? 'rotina' : 'avulso' })

export function Faculdade() {
  const dados = useDadosFaculdade()
  const [pilha, setPilha] = useState<Pagina[]>([])
  const [editandoMateria, setEditandoMateria] = useState<Subject | 'nova' | null>(null)
  const [entrega, setEntrega] = useState<{ c?: Coursework; subjectId?: string } | null>(null)
  const [aulaAberta, setAulaAberta] = useState<Aula | null>(null)
  const [encerrar, setEncerrar] = useState(false)
  const pedida = useMateriaPedida()

  // "ver matéria" na folha da aula (de qualquer tela) abre a página dela aqui
  useEffect(() => {
    const id = pedida && consumirMateriaPedida()
    if (id) setPilha([{ tipo: 'materia', id }])
  }, [pedida])

  if (!dados) return null
  const pagina = pilha[pilha.length - 1]
  const voltar = () => setPilha((p) => p.slice(0, -1))
  const abrirMateria = (id: string) => setPilha((p) => [...p, { tipo: 'materia', id }])

  const folhas = (
    <>
      {editandoMateria && (
        <EditorMateria
          key={editandoMateria === 'nova' ? 'nova' : editandoMateria.id}
          materia={editandoMateria === 'nova' ? undefined : editandoMateria}
          aoFechar={() => setEditandoMateria(null)}
          aoApagar={() => setPilha([])}
        />
      )}
      {entrega && <EditorEntrega key={entrega.c?.id ?? 'nova'} entrega={entrega.c} subjectId={entrega.subjectId} aoFechar={() => setEntrega(null)} />}
      {aulaAberta && (
        <FolhaItem
          key={`${aulaAberta.date}|${aulaAberta.item.id}`}
          item={paraItemDoDia(aulaAberta.item)}
          date={aulaAberta.date}
          entry={aulaAberta.entry}
          aoFechar={() => setAulaAberta(null)}
        />
      )}
    </>
  )

  if (pagina) {
    const materia = pagina.tipo === 'materia' ? dados.materias.find((m) => m.id === pagina.id) : undefined
    return (
      <PaginaInterna
        key={pilha.length}
        titulo={pagina.tipo === 'arquivadas' ? 'Arquivadas' : materia?.name ?? 'Matéria'}
        nomeVoltar={pilha.length > 1 ? 'Arquivadas' : 'Faculdade'}
        aoVoltar={voltar}
      >
        {pagina.tipo === 'arquivadas' && (
          <ListaMaterias dados={dados} materias={dados.materias.filter((m) => m.archived)} aoAbrir={abrirMateria} />
        )}
        {pagina.tipo === 'materia' &&
          (materia ? (
            <PaginaMateria
              materia={materia}
              dados={dados}
              aoEditar={() => setEditandoMateria(materia)}
              aoEntrega={(c) => setEntrega({ c, subjectId: materia.id })}
              aoAbrirAula={setAulaAberta}
            />
          ) : (
            <p className="vazio">Essa matéria não existe mais.</p>
          ))}
        {folhas}
      </PaginaInterna>
    )
  }

  const h = hoje()
  const ativas = dados.materias.filter((m) => !m.archived)
  const arquivadas = dados.materias.filter((m) => m.archived)
  const nomes = new Map(dados.materias.map((m) => [m.id, m]))
  const pendentes = dados.entregas
    .filter((c) => !c.done && nomes.get(c.subjectId) && !nomes.get(c.subjectId)!.archived)
    .sort((a, b) => a.due.localeCompare(b.due))
  const deHoje: Aula[] = [...dados.rotina.filter((r) => r.subjectId && valeNoDia(r, h)), ...dados.avulsos.filter((o) => o.date === h)]
    .map((item) => ({ date: h, item, entry: dados.entries.find((e) => e.id === `${h}|${item.id}`) }))
    .sort((a, b) => (a.item.start ?? '').localeCompare(b.item.start ?? ''))

  return (
    <section className="aba-faculdade">
      <h2 className="secao-titulo">Próximas provas e entregas</h2>
      {pendentes.length === 0 ? (
        <p className="nota-discreta">Nada marcado. Provas e trabalhos aparecem aqui e, 3 dias antes, no Hoje.</p>
      ) : (
        <ul className="lista">
          {pendentes.map((c) => (
            <LinhaEntrega key={c.id} c={c} materia={nomes.get(c.subjectId)?.name} aoAbrir={() => setEntrega({ c })} />
          ))}
        </ul>
      )}
      <button className="botao-novo" onClick={() => setEntrega({})}>+ prova ou trabalho</button>

      {deHoje.length > 0 && (
        <>
          <h2 className="secao-titulo">Aulas de hoje</h2>
          <ul className="lista">
            {deHoje.map((a) => (
              <li key={a.item.id}>
                <button className="linha" onClick={() => setAulaAberta(a)}>
                  <span className="linha-texto">
                    <span>{nomes.get(a.item.subjectId!)?.name ?? a.item.title}</span>
                    <span className="linha-sub">
                      {a.item.start}–{a.item.end} · {nomeDoModo(modoDaEntry(a.entry)) ?? 'tocar para marcar como foi'}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <h2 className="secao-titulo">Matérias</h2>
      {ativas.length === 0 ? (
        <p className="nota-discreta">Nenhuma matéria. Crie uma e ligue às aulas da rotina.</p>
      ) : (
        <ListaMaterias dados={dados} materias={ativas} aoAbrir={abrirMateria} />
      )}
      <button className="botao-novo" onClick={() => setEditandoMateria('nova')}>+ nova matéria</button>

      {arquivadas.length > 0 && (
        <button className="linha" onClick={() => setPilha([{ tipo: 'arquivadas' }])}>
          <span className="linha-texto">
            <span>Matérias arquivadas</span>
            <span className="linha-sub">{arquivadas.length} de semestres anteriores</span>
          </span>
          <IconeAvancar />
        </button>
      )}
      {ativas.length > 0 && (
        <button
          className="link pular-treino"
          onClick={async () => {
            if (!encerrar) return setEncerrar(true)
            await db.subjects.bulkUpdate(ativas.map((m) => ({ key: m.id, changes: { archived: true } })))
            setEncerrar(false)
          }}
        >
          {encerrar ? 'Tocar de novo: arquivar as matérias atuais' : 'encerrar o semestre'}
        </button>
      )}
      {folhas}
    </section>
  )
}

function ListaMaterias({ dados, materias, aoAbrir }: { dados: Dados; materias: Subject[]; aoAbrir: (id: string) => void }) {
  const h = hoje()
  return (
    <ul className="lista">
      {materias.map((m) => {
        const aulas = aulasDaMateria(m, dados.rotina, dados.avulsos, dados.entries)
        const f = faltasDaMateria(m, aulas)
        const proxima = dados.entregas.filter((c) => c.subjectId === m.id && !c.done && c.due >= h).sort((a, b) => a.due.localeCompare(b.due))[0]
        const dias = [...new Set(dados.rotina.filter((r) => r.subjectId === m.id).flatMap((r) => r.weekdays))].sort()
        return (
          <li key={m.id}>
            <button className="linha" onClick={() => aoAbrir(m.id)}>
              <span className="ponto-area" style={{ background: m.color }} />
              <span className="linha-texto">
                <span>{m.name}</span>
                <span className="linha-sub">
                  {dias.length > 0 && `${dias.map((d) => NOMES_DIAS_CURTOS[d]).join(', ')} · `}
                  {f.limite != null ? `${f.faltas} de ${f.limite} faltas` : `${f.faltas} faltas`}
                  {proxima && ` · ${nomeDoTipo(proxima.kind).toLowerCase()} ${quandoFalta(proxima.due, h)}`}
                </span>
              </span>
              <IconeAvancar />
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function LinhaEntrega({ c, materia, aoAbrir }: { c: Coursework; materia?: string; aoAbrir: () => void }) {
  const h = hoje()
  return (
    <li>
      <button className="linha" onClick={aoAbrir}>
        <span className="linha-texto">
          <span>
            {nomeDoTipo(c.kind)} · {c.title}
          </span>
          <span className="linha-sub">
            {formatarDataCurta(c.due)} · {c.done ? (c.kind === 'prova' ? 'feita' : 'entregue') : quandoFalta(c.due, h)}
            {c.grade != null && ` · nota ${formatarNota(c.grade)} de ${formatarNota(c.maxGrade ?? 10)}`}
            {materia && ` · ${materia}`}
          </span>
        </span>
      </button>
    </li>
  )
}

const formatarNota = (n: number) => String(Math.round(n * 100) / 100).replace('.', ',')

function PaginaMateria({ materia, dados, aoEditar, aoEntrega, aoAbrirAula }: {
  materia: Subject
  dados: Dados
  aoEditar: () => void
  aoEntrega: (c?: Coursework) => void
  aoAbrirAula: (a: Aula) => void
}) {
  const h = hoje()
  const aulas = aulasDaMateria(materia, dados.rotina, dados.avulsos, dados.entries)
  const f = faltasDaMateria(materia, aulas)
  const proxima = proximaAula(materia, dados.rotina, dados.avulsos)
  const itens = dados.rotina.filter((r) => r.subjectId === materia.id && !r.until)
  const entregas = dados.entregas.filter((c) => c.subjectId === materia.id)
  const pendentes = entregas.filter((c) => !c.done).sort((a, b) => a.due.localeCompare(b.due))
  const feitas = entregas.filter((c) => c.done).sort((a, b) => b.due.localeCompare(a.due))
  const comNota = entregas.filter((c) => c.grade != null)
  const somaNotas = comNota.reduce((t, c) => t + c.grade!, 0)
  const somaMax = comNota.reduce((t, c) => t + (c.maxGrade ?? 10), 0)

  return (
    <>
      <p className="folha-sub">
        {itens.map((r) => `${r.weekdays.map((d) => NOMES_DIAS_CURTOS[d]).join(', ')} ${r.start ?? ''}–${r.end ?? ''}`).join(' · ') || 'sem aula ligada na rotina'}
        {proxima && proxima.date !== h && ` · próxima aula ${quandoFalta(proxima.date, h)}`}
      </p>

      <div className="faltas">
        <span className="faltas-numero">
          {f.faltas} {f.limite != null && <span className="faltas-de">de {f.limite} faltas</span>}
          {f.limite == null && <span className="faltas-de">faltas</span>}
        </span>
        {f.limite != null && (
          <span className="barra-neutra">
            <span style={{ width: `${Math.min(100, f.limite ? (f.faltas / f.limite) * 100 : 0)}%`, background: materia.color }} />
          </span>
        )}
        <span className="nota-discreta">
          {f.perdidas} {f.perdidas === 1 ? 'aula perdida' : 'aulas perdidas'}
          {materia.priorAbsences ? ` + ${materia.priorAbsences} de antes do app` : ''}
          {f.restam != null && (f.restam >= 0 ? ` · restam ${f.restam} (${f.aulasRestantes} ${f.aulasRestantes === 1 ? 'aula' : 'aulas'})` : ` · ${-f.restam} acima do limite`)}
          {f.canceladas > 0 && ` · carga ${f.carga} h (${f.canceladas} ${f.canceladas === 1 ? 'aula não teve' : 'aulas não tiveram'})`}
        </span>
      </div>

      <h3 className="secao-titulo">Provas e trabalhos</h3>
      {entregas.length === 0 && <p className="nota-discreta">Nada marcado ainda.</p>}
      <ul className="lista">
        {[...pendentes, ...feitas].map((c) => (
          <LinhaEntrega key={c.id} c={c} aoAbrir={() => aoEntrega(c)} />
        ))}
      </ul>
      <button className="botao-novo" onClick={() => aoEntrega()}>+ prova ou trabalho</button>
      {comNota.length > 0 && (
        <p className="treino-conta">
          notas: {formatarNota(somaNotas)} de {formatarNota(somaMax)}
          {somaMax > 0 && ` · média ${formatarNota(Math.round((somaNotas / somaMax) * 100) / 10)} (de 10)`}
        </p>
      )}

      <h3 className="secao-titulo">Aulas</h3>
      {aulas.length === 0 ? (
        <p className="nota-discreta">As aulas aparecem aqui conforme os dias passam.</p>
      ) : (
        <ul className="lista">
          {aulas.map((a) => {
            const modo = modoDaEntry(a.entry)
            return (
              <li key={`${a.date}|${a.item.id}`}>
                <button className="linha aula-linha" onClick={() => aoAbrirAula(a)}>
                  <span className="linha-texto">
                    <span>
                      {a.date === h ? 'hoje' : formatarDataLonga(a.date)}
                      <span className="aula-modo" data-modo={modo}>{nomeDoModo(modo) ?? 'sem marcação'}</span>
                    </span>
                    {a.entry?.note && <span className="linha-sub">{a.entry.note}</span>}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <button className="linha" onClick={aoEditar}>
        <span className="linha-texto">
          <span>Editar matéria</span>
          <span className="linha-sub">
            nome, cor, faltas ({materia.workload ? `${materia.workload} h, ${materia.absencesPerClass} por aula, máx. ${materia.maxAbsencePct}%` : 'sem limite'}), aulas
          </span>
        </span>
      </button>
    </>
  )
}

