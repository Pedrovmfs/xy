import { useState, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Area, type Habit, type Oneoff, type RoutineItem } from '../db'
import { formatarDataLonga, hoje } from '../lib/datas'
import { ordenarPorHorario } from '../lib/dia'
import { resumoDias } from '../componentes/Campos'
import { EditorItem } from '../componentes/EditorItem'
import { EditorHabito } from '../componentes/EditorHabito'
import { EditorArea } from '../componentes/EditorArea'
import { IconeAvancar, IconeVoltar } from '../icones'
import { useDeslizar } from '../lib/deslizar'

type Secao = 'rotina' | 'avulsos' | 'habitos' | 'areas'

const SECOES: { id: Secao; nome: string; descricao: string }[] = [
  { id: 'rotina', nome: 'Rotina', descricao: 'Itens que se repetem na semana' },
  { id: 'avulsos', nome: 'Avulsos', descricao: 'Itens numa data só' },
  { id: 'habitos', nome: 'Hábitos', descricao: 'As bolinhas do Hoje' },
  { id: 'areas', nome: 'Áreas', descricao: 'Nome, cor e meta semanal' },
]

export function Ajustes({ aoSair }: { aoSair: () => void }) {
  const [secao, setSecao] = useState<Secao | null>(null)
  const atual = SECOES.find((s) => s.id === secao)
  const voltar = () => (secao ? setSecao(null) : aoSair())
  // deslizar da borda esquerda para a direita = voltar (como nos apps do iPhone)
  const deslize = useDeslizar({
    podeComecar: (e) => e.clientX < 32,
    sentidos: [1],
    aoConfirmar: voltar,
  })

  return (
    <>
      <header className="topo">
        <button className="botao-icone" onClick={voltar} aria-label="Voltar">
          <IconeVoltar />
        </button>
        <h1 className="topo-titulo">{atual?.nome ?? 'Ajustes'}</h1>
        <span className="botao-icone" />
      </header>
      <main className="conteudo ajustes" {...deslize.handlers}>
        <div ref={deslize.alvo}>
        {!secao && (
          <ul className="lista">
            {SECOES.map((s) => (
              <li key={s.id}>
                <button className="linha" onClick={() => setSecao(s.id)}>
                  <span className="linha-texto">
                    <span>{s.nome}</span>
                    <span className="linha-sub">{s.descricao}</span>
                  </span>
                  <IconeAvancar />
                </button>
              </li>
            ))}
          </ul>
        )}
        {secao === 'rotina' && <ListaRotina />}
        {secao === 'avulsos' && <ListaAvulsos />}
        {secao === 'habitos' && <ListaHabitos />}
        {secao === 'areas' && <ListaAreas />}
        </div>
      </main>
    </>
  )
}

function useAreas() {
  return useLiveQuery(async () => new Map((await db.areas.toArray()).map((a) => [a.id, a])))
}

function Linha({ cor, titulo, sub, aoTocar }: { cor?: string; titulo: string; sub?: ReactNode; aoTocar: () => void }) {
  return (
    <li>
      <button className="linha" onClick={aoTocar}>
        {cor !== undefined && <span className="ponto-area" style={{ background: cor || 'transparent' }} />}
        <span className="linha-texto">
          <span>{titulo}</span>
          {sub && <span className="linha-sub">{sub}</span>}
        </span>
      </button>
    </li>
  )
}

function BotaoNovo({ texto, aoTocar }: { texto: string; aoTocar: () => void }) {
  return (
    <button className="botao-novo" onClick={aoTocar}>
      + {texto}
    </button>
  )
}

const horario = (i: { kind: string; start?: string; end?: string }) =>
  i.kind === 'block' && i.start ? `${i.start}–${i.end}` : 'no dia'

function ListaRotina() {
  const areas = useAreas()
  // itens encerrados não aparecem aqui (continuam no histórico dos dias passados)
  const itens = useLiveQuery(async () => (await db.routine.toArray()).filter((r) => !r.until))
  const [editando, setEditando] = useState<RoutineItem | 'novo' | null>(null)
  if (!itens || !areas) return null

  return (
    <>
      <BotaoNovo texto="Novo item da rotina" aoTocar={() => setEditando('novo')} />
      <ul className="lista">
        {[...itens]
          .sort((a, b) => ordenarPorHorario({ ...a, origem: 'rotina' }, { ...b, origem: 'rotina' }))
          .map((i) => (
            <Linha
              key={i.id}
              cor={i.areaId ? areas.get(i.areaId)?.color : ''}
              titulo={i.title}
              sub={`${resumoDias(i.weekdays)} · ${horario(i)}`}
              aoTocar={() => setEditando(i)}
            />
          ))}
      </ul>
      {editando && (
        <EditorItem
          key={editando === 'novo' ? 'novo' : editando.id}
          tipo="rotina"
          item={editando === 'novo' ? undefined : editando}
          aoFechar={() => setEditando(null)}
        />
      )}
    </>
  )
}

function ListaAvulsos() {
  const areas = useAreas()
  const avulsos = useLiveQuery(() => db.oneoffs.orderBy('date').toArray())
  const [editando, setEditando] = useState<Oneoff | 'novo' | null>(null)
  if (!avulsos || !areas) return null

  const h = hoje()
  const proximos = avulsos.filter((a) => a.date >= h)
  const passados = avulsos.filter((a) => a.date < h).reverse()
  const linha = (a: Oneoff) => (
    <Linha
      key={a.id}
      cor={a.areaId ? areas.get(a.areaId)?.color : ''}
      titulo={a.title}
      sub={`${formatarDataLonga(a.date)} · ${horario(a)}`}
      aoTocar={() => setEditando(a)}
    />
  )

  return (
    <>
      <BotaoNovo texto="Novo avulso" aoTocar={() => setEditando('novo')} />
      {avulsos.length === 0 && <p className="vazio">Nenhum avulso ainda.</p>}
      {proximos.length > 0 && <ul className="lista">{proximos.map(linha)}</ul>}
      {passados.length > 0 && (
        <>
          <h2 className="secao-titulo">Passados</h2>
          <ul className="lista">{passados.map(linha)}</ul>
        </>
      )}
      {editando && (
        <EditorItem
          key={editando === 'novo' ? 'novo' : editando.id}
          tipo="avulso"
          item={editando === 'novo' ? undefined : editando}
          aoFechar={() => setEditando(null)}
        />
      )}
    </>
  )
}

function ListaHabitos() {
  const habitos = useLiveQuery(async () => (await db.habits.orderBy('order').toArray()).filter((x) => !x.until))
  const [editando, setEditando] = useState<Habit | 'novo' | null>(null)
  if (!habitos) return null

  return (
    <>
      <BotaoNovo texto="Novo hábito" aoTocar={() => setEditando('novo')} />
      <ul className="lista">
        {habitos.map((x) => (
          <Linha key={x.id} titulo={x.name} sub={resumoDias(x.weekdays)} aoTocar={() => setEditando(x)} />
        ))}
      </ul>
      {editando && (
        <EditorHabito
          key={editando === 'novo' ? 'novo' : editando.id}
          habito={editando === 'novo' ? undefined : editando}
          aoFechar={() => setEditando(null)}
        />
      )}
    </>
  )
}

function ListaAreas() {
  const areas = useLiveQuery(() => db.areas.orderBy('order').toArray())
  const [editando, setEditando] = useState<Area | 'novo' | null>(null)
  if (!areas) return null

  return (
    <>
      <BotaoNovo texto="Nova área" aoTocar={() => setEditando('novo')} />
      <ul className="lista">
        {areas.map((a) => (
          <Linha
            key={a.id}
            cor={a.color}
            titulo={a.name}
            sub={a.weeklyGoal ? `meta: ${a.weeklyGoal} por semana` : undefined}
            aoTocar={() => setEditando(a)}
          />
        ))}
      </ul>
      {editando && (
        <EditorArea
          key={editando === 'novo' ? 'novo' : editando.id}
          area={editando === 'novo' ? undefined : editando}
          aoFechar={() => setEditando(null)}
        />
      )}
    </>
  )
}
