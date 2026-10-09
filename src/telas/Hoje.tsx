import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Area, type Entry } from '../db'
import { formatarDataLonga, hoje, somarDias, type DataISO } from '../lib/datas'
import { alternarFeito, useEntriesDoDia, useItensDoDia, valeNoDia, type ItemDoDia } from '../lib/dia'
import { Agenda } from '../componentes/Agenda'
import { FolhaItem } from '../componentes/FolhaItem'
import { EditorItem } from '../componentes/EditorItem'
import { Resgates } from '../componentes/Resgates'
import { useComAtraso } from '../lib/atraso'
import { IconeAvancar, IconeFeito, IconeVoltar } from '../icones'

// A partir de que hora aparece "anotar algo sobre hoje"
const HORA_DA_NOITE = 18

export function Hoje() {
  const [data, setData] = useState<DataISO>(hoje)
  const [aberto, setAberto] = useState<ItemDoDia | null>(null)
  // false = fechado; true = sem horário escolhido; objeto = criado segurando na agenda
  const [novoAvulso, setNovoAvulso] = useState<boolean | { start: string; end: string }>(false)

  const itens = useItensDoDia(data)
  const entries = useEntriesDoDia(data)
  const areas = useLiveQuery(async () => new Map((await db.areas.toArray()).map((a) => [a.id, a])))

  if (!itens || !entries || !areas) return null

  const blocos = itens.filter((i) => i.kind === 'block' && i.start)
  // tarefa, ou bloco sem horário definido
  const tarefas = itens.filter((i) => !(i.kind === 'block' && i.start))
  const diaDeHoje = hoje()

  return (
    <section className="hoje">
      <NavegacaoDia data={data} diaDeHoje={diaDeHoje} setData={setData} />

      <LinhaHabitos data={data} />

      {data === diaDeHoje && <Resgates />}

      {tarefas.length > 0 && (
        <ul className="tarefas" aria-label="No dia, sem horário">
          {tarefas.map((t) => (
            <Tarefa key={t.id} item={t} entry={entries.get(t.id)} area={t.areaId ? areas.get(t.areaId) : undefined}
              aoAbrir={() => setAberto(t)} aoMarcar={() => void alternarFeito(data, t, entries.get(t.id))} />
          ))}
        </ul>
      )}

      <Agenda date={data} blocos={blocos} entries={entries} areas={areas} ehHoje={data === diaDeHoje} aoAbrir={setAberto}
        aoCriar={(start, end) => setNovoAvulso({ start, end })} />

      <button className="adicionar-no-dia" onClick={() => setNovoAvulso(true)}>
        + adicionar algo neste dia
      </button>

      <ComentarioDoDia data={data} diaDeHoje={diaDeHoje} />

      {novoAvulso && (
        <EditorItem
          tipo="avulso"
          dataInicial={data}
          horarioInicial={typeof novoAvulso === 'object' ? novoAvulso : undefined}
          aoFechar={() => setNovoAvulso(false)}
        />
      )}

      {aberto && (
        <FolhaItem key={aberto.id} item={aberto} date={data} entry={entries.get(aberto.id)} aoFechar={() => setAberto(null)} />
      )}
    </section>
  )
}

function NavegacaoDia({ data, diaDeHoje, setData }: { data: DataISO; diaDeHoje: DataISO; setData: (d: DataISO) => void }) {
  const relativo =
    data === diaDeHoje ? 'hoje' : data === somarDias(diaDeHoje, -1) ? 'ontem' : data === somarDias(diaDeHoje, 1) ? 'amanhã' : null
  return (
    <div className="nav-dia">
      <button className="botao-icone" onClick={() => setData(somarDias(data, -1))} aria-label="Dia anterior">
        <IconeVoltar />
      </button>
      <div className="nav-dia-meio">
        <span className="nav-dia-data">{formatarDataLonga(data)}</span>
        {data === diaDeHoje ? (
          <span className="nav-dia-rel">hoje</span>
        ) : (
          <button className="nav-dia-rel link" onClick={() => setData(diaDeHoje)}>
            {relativo ? `${relativo} · ` : ''}voltar pra hoje
          </button>
        )}
      </div>
      <button className="botao-icone" onClick={() => setData(somarDias(data, 1))} aria-label="Próximo dia">
        <IconeAvancar />
      </button>
    </div>
  )
}

function LinhaHabitos({ data }: { data: DataISO }) {
  const dados = useLiveQuery(async () => {
    const [habitos, logs] = await Promise.all([
      db.habits.orderBy('order').toArray(),
      db.habitLogs.where('date').equals(data).toArray(),
    ])
    return { habitos: habitos.filter((h) => valeNoDia(h, data)), feitos: new Set(logs.map((l) => l.habitId)) }
  }, [data])

  if (!dados || dados.habitos.length === 0) return null

  async function alternar(habitId: string) {
    const id = `${data}|${habitId}`
    if (await db.habitLogs.get(id)) await db.habitLogs.delete(id)
    else await db.habitLogs.add({ id, date: data, habitId })
  }

  return (
    <div className="habitos" role="group" aria-label="Hábitos">
      {dados.habitos.map((h) => (
        <button key={h.id} className="habito" aria-pressed={dados.feitos.has(h.id)} onClick={() => alternar(h.id)}>
          <span className="habito-bolinha" />
          {h.name}
        </button>
      ))}
    </div>
  )
}

// A bolinha marca feito com um toque; o nome abre a folha completa (motivo, nota).
function Tarefa({ item, entry, area, aoAbrir, aoMarcar }: {
  item: ItemDoDia
  entry?: Entry
  area?: Area
  aoAbrir: () => void
  aoMarcar: () => void
}) {
  const status = entry?.status
  const nota = entry?.note
  return (
    <li className="tarefa" data-estado={status}>
      <button
        className="tarefa-check"
        aria-label={status === 'done' ? 'Desmarcar feito' : 'Marcar feito'}
        aria-pressed={status === 'done'}
        onClick={aoMarcar}
      >
        <span className="marca" data-estado={status} style={{ ['--cor-area' as string]: area?.color ?? 'var(--texto-suave)' }}>
          {status === 'done' && <IconeFeito />}
        </span>
      </button>
      <button className="tarefa-texto" onClick={aoAbrir}>
        <span>{item.title}</span>
        {(status === 'skipped' || nota) && (
          <span className="tarefa-sub">
            {status === 'skipped' ? 'não feito' : ''}
            {status === 'skipped' && nota ? ' · ' : ''}
            {nota}
          </span>
        )}
      </button>
    </li>
  )
}

function ComentarioDoDia({ data, diaDeHoje }: { data: DataISO; diaDeHoje: DataISO }) {
  const dia = useLiveQuery(() => db.days.get(data), [data])
  const [editando, setEditando] = useState(false)
  const [texto, setTexto] = useState('')

  async function gravar(valor: string) {
    const limpo = valor.trim() || undefined
    await db.transaction('rw', db.days, async () => {
      const atual = await db.days.get(data)
      await db.days.put({ ...atual, date: data, comment: limpo })
    })
  }
  // salva enquanto digita (meio segundo depois de parar), além de ao sair do campo
  const gravarDepois = useComAtraso(gravar)

  const comentario = dia?.comment
  // Só à noite no dia de hoje; em dias passados, sempre; no futuro, nunca.
  // Se já existe comentário, ele sempre aparece.
  const visivel =
    !!comentario || data < diaDeHoje || (data === diaDeHoje && new Date().getHours() >= HORA_DA_NOITE)
  if (!visivel) return null

  function salvar() {
    setEditando(false)
    void gravar(texto)
  }

  if (editando) {
    return (
      <div className="comentario">
        <textarea
          className="entrada"
          rows={3}
          autoFocus
          value={texto}
          placeholder="Algo sobre hoje…"
          onChange={(e) => {
            setTexto(e.target.value)
            gravarDepois(e.target.value)
          }}
          onBlur={salvar}
        />
      </div>
    )
  }

  return (
    <button
      className="comentario comentario-linha"
      onClick={() => {
        setTexto(comentario ?? '')
        setEditando(true)
      }}
    >
      {comentario ? <span className="comentario-texto">{comentario}</span> : `anotar algo sobre ${data === diaDeHoje ? 'hoje' : 'este dia'}`}
    </button>
  )
}
