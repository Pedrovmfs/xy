import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Area } from '../db'
import { formatarDataLonga, hoje } from '../lib/datas'
import { useComAtraso } from '../lib/atraso'
import { useDeslizar } from '../lib/deslizar'
import { Folha } from '../componentes/Folha'
import { IconeAvancar, IconeVoltar } from '../icones'

// Áreas (moram na Semana): o "próximo passo" de cada uma (para nunca abrir e pensar "onde parei?")
// e o histórico das notas dos itens dela, para reconhecer o próprio trabalho.

/** Lista das áreas com o próximo passo de cada uma (mora na Semana). */
export function ListaAreas({ aoAbrir }: { aoAbrir: (id: string) => void }) {
  const areas = useLiveQuery(() => db.areas.orderBy('order').toArray())
  const [editandoPasso, setEditandoPasso] = useState<Area | null>(null)
  if (!areas) return null

  return (
    <>
      <ul className="lista">
        {areas.map((a) => (
          <li key={a.id} className="area-card">
            <button className="area-cabeca" onClick={() => aoAbrir(a.id)}>
              <span className="ponto-area" style={{ background: a.color }} />
              <span className="area-nome">{a.name}</span>
              <IconeAvancar />
            </button>
            <button className="area-passo" data-vazio={!a.nextStep || undefined} onClick={() => setEditandoPasso(a)}>
              {a.nextStep ? (
                <>
                  <span className="area-passo-rotulo">próximo passo</span>
                  <span className="area-passo-texto">{a.nextStep}</span>
                </>
              ) : (
                '+ próximo passo'
              )}
            </button>
          </li>
        ))}
      </ul>
      {editandoPasso && <FolhaProximoPasso key={editandoPasso.id} area={editandoPasso} aoFechar={() => setEditandoPasso(null)} />}
    </>
  )
}

function FolhaProximoPasso({ area, aoFechar }: { area: Area; aoFechar: () => void }) {
  const [texto, setTexto] = useState(area.nextStep)
  const gravar = (v: string) => db.areas.update(area.id, { nextStep: v.trim() })
  const gravarDepois = useComAtraso(gravar) // salva enquanto digita

  function fechar() {
    void gravar(texto)
    aoFechar()
  }

  return (
    <Folha aberta aoFechar={fechar} titulo={`Próximo passo · ${area.name}`}>
      <textarea
        className="entrada"
        rows={3}
        autoFocus
        value={texto}
        placeholder="Qual a próxima ação? Ex.: mandar orçamento das camisetas"
        onChange={(e) => {
          setTexto(e.target.value)
          gravarDepois(e.target.value)
        }}
      />
      <button className="botao-principal" onClick={fechar}>Pronto</button>
      {area.nextStep && (
        <button
          className="botao-apagar"
          onClick={() => {
            setTexto('')
            void gravar('')
            aoFechar()
          }}
        >
          Feito, limpar
        </button>
      )}
    </Folha>
  )
}

interface NotaDaArea {
  id: string
  date: string
  titulo: string
  note: string
  status?: 'done' | 'skipped'
}

function useNotasDaArea(areaId: string) {
  return useLiveQuery(async () => {
    // inclui itens já tirados da rotina: o histórico deles continua sendo da área
    const [rotina, avulsos] = await Promise.all([
      db.routine.where('areaId').equals(areaId).toArray(),
      db.oneoffs.where('areaId').equals(areaId).toArray(),
    ])
    const titulos = new Map<string, string>([...rotina, ...avulsos].map((i) => [i.id, i.title]))
    if (titulos.size === 0) return []
    const entries = await db.entries.where('itemId').anyOf([...titulos.keys()]).toArray()
    return entries
      .filter((e) => e.note)
      .map((e): NotaDaArea => ({ id: e.id, date: e.date, titulo: titulos.get(e.itemId)!, note: e.note!, status: e.status }))
      .sort((a, b) => b.date.localeCompare(a.date) || a.titulo.localeCompare(b.titulo))
  }, [areaId])
}

export function DetalheArea({ areaId, nomeVoltar, aoVoltar }: { areaId: string; nomeVoltar: string; aoVoltar: () => void }) {
  const area = useLiveQuery(() => db.areas.get(areaId), [areaId])
  const notas = useNotasDaArea(areaId)
  const [editandoPasso, setEditandoPasso] = useState(false)
  // deslizar da borda esquerda volta para a lista, como em Ajustes
  const deslize = useDeslizar({ podeComecar: (e) => e.clientX < 40, sentidos: [1], aoConfirmar: aoVoltar })

  if (!area) return null
  // agrupa por dia (já vem do mais recente para o mais antigo)
  const grupos: { date: string; itens: NotaDaArea[] }[] = []
  for (const n of notas ?? []) {
    const ultimo = grupos[grupos.length - 1]
    if (ultimo?.date === n.date) ultimo.itens.push(n)
    else grupos.push({ date: n.date, itens: [n] })
  }

  return (
    <section className="area-detalhe" {...deslize.handlers}>
      <div ref={deslize.alvo}>
        <button className="area-voltar" onClick={aoVoltar}>
          <IconeVoltar /> {nomeVoltar}
        </button>
        <h2 className="area-titulo">
          <span className="ponto-area" style={{ background: area.color }} />
          {area.name}
        </h2>

        <button className="area-passo area-passo-grande" data-vazio={!area.nextStep || undefined} onClick={() => setEditandoPasso(true)}>
          <span className="area-passo-rotulo">próximo passo</span>
          <span className="area-passo-texto">{area.nextStep || 'tocar para anotar'}</span>
        </button>

        <h3 className="secao-titulo">Notas</h3>
        {notas && notas.length === 0 && (
          <p className="vazio">
            As notas que você escrever nos itens de {area.name} (na folha de cada item no Hoje) aparecem aqui.
          </p>
        )}
        {grupos.map((g) => (
          <div key={g.date} className="notas-dia">
            <span className="notas-data">{g.date === hoje() ? 'Hoje' : formatarDataLonga(g.date)}</span>
            <ul className="lista">
              {g.itens.map((n) => (
                <li key={n.id} className="nota-area">
                  <span className="nota-item">
                    {n.titulo}
                    {n.status === 'skipped' && ' · não feito'}
                  </span>
                  <span className="nota-texto">{n.note}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {editandoPasso && <FolhaProximoPasso area={area} aoFechar={() => setEditandoPasso(false)} />}
    </section>
  )
}
