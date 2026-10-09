import { useState } from 'react'
import { db, type Oneoff, type RoutineItem, type TipoItem } from '../db'
import { hoje, somarDias, type DataISO } from '../lib/datas'
import { novoId } from '../lib/id'
import { minutos } from '../lib/dia'
import { Folha } from './Folha'
import { Segmentado, SeletorArea, SeletorDias } from './Campos'

type Props =
  | { tipo: 'rotina'; item?: RoutineItem; aoFechar: () => void }
  | { tipo: 'avulso'; item?: Oneoff; dataInicial?: DataISO; aoFechar: () => void }

// Criar/editar um item da rotina (recorrente) ou um avulso (numa data).
export function EditorItem(props: Props) {
  const { tipo, item, aoFechar } = props
  const [title, setTitle] = useState(item?.title ?? '')
  const [kind, setKind] = useState<TipoItem>(item?.kind ?? 'block')
  const [areaId, setAreaId] = useState(item?.areaId)
  const [start, setStart] = useState(item?.start ?? '')
  const [end, setEnd] = useState(item?.end ?? '')
  const [weekdays, setWeekdays] = useState<number[]>(
    tipo === 'rotina' ? (props.item?.weekdays ?? []) : [],
  )
  const [date, setDate] = useState<DataISO>(
    tipo === 'avulso' ? (props.item?.date ?? props.dataInicial ?? hoje()) : hoje(),
  )
  const [confirmarApagar, setConfirmarApagar] = useState(false)

  const problema = !title.trim()
    ? 'Dê um nome.'
    : kind === 'block' && (!start || !end)
      ? 'Bloco precisa de início e fim.'
      : kind === 'block' && minutos(end) <= minutos(start)
        ? 'O fim precisa ser depois do início.'
        : tipo === 'rotina' && weekdays.length === 0
          ? 'Escolha pelo menos um dia.'
          : tipo === 'avulso' && !date
            ? 'Escolha a data.'
            : null

  async function salvar() {
    if (problema) return
    const comum = {
      title: title.trim(),
      kind,
      areaId,
      start: kind === 'block' ? start : undefined,
      end: kind === 'block' ? end : undefined,
    }
    if (tipo === 'rotina') {
      if (item) await db.routine.update(item.id, { ...comum, weekdays })
      // item novo vale de hoje em diante: não aparece em dias passados como "não marcado"
      else await db.routine.add({ id: novoId(), ...comum, weekdays, startsOn: hoje(), createdAt: new Date().toISOString() })
    } else {
      if (item) await db.oneoffs.update(item.id, { ...comum, date })
      else await db.oneoffs.add({ id: novoId(), ...comum, date, createdAt: new Date().toISOString() })
    }
    aoFechar()
  }

  async function apagar() {
    if (!item) return
    if (!confirmarApagar) {
      setConfirmarApagar(true)
      return
    }
    if (tipo === 'avulso') {
      await db.transaction('rw', db.oneoffs, db.entries, async () => {
        await db.entries.where('itemId').equals(item.id).delete()
        await db.oneoffs.delete(item.id)
      })
    } else {
      await encerrarItemDaRotina(item.id)
    }
    aoFechar()
  }

  const titulo = item ? 'Editar' : tipo === 'rotina' ? 'Novo item da rotina' : 'Novo avulso'

  return (
    <Folha aberta aoFechar={aoFechar} titulo={titulo}>
      <label className="campo">
        <span className="rotulo">Nome</span>
        <input className="entrada" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Academia" />
      </label>

      <div className="campo">
        <span className="rotulo">Tipo</span>
        <Segmentado
          opcoes={[{ valor: 'block', nome: 'Bloco (com horário)' }, { valor: 'task', nome: 'Tarefa (no dia)' }]}
          valor={kind}
          aoMudar={setKind}
        />
      </div>

      {kind === 'block' && (
        <div className="campo">
          <span className="rotulo">Horário</span>
          <div className="horario-do-dia">
            <input type="time" className="entrada entrada-hora" aria-label="Início" value={start} onChange={(e) => setStart(e.target.value)} />
            <span>–</span>
            <input type="time" className="entrada entrada-hora" aria-label="Fim" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
        </div>
      )}

      {tipo === 'rotina' ? (
        <div className="campo">
          <span className="rotulo">Dias</span>
          <SeletorDias valor={weekdays} aoMudar={setWeekdays} />
        </div>
      ) : (
        <label className="campo">
          <span className="rotulo">Data</span>
          <input type="date" className="entrada" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
      )}

      <div className="campo">
        <span className="rotulo">Área</span>
        <SeletorArea valor={areaId} aoMudar={setAreaId} />
      </div>

      {problema && title && <p className="aviso">{problema}</p>}
      <button className="botao-principal" onClick={salvar} disabled={!!problema}>
        Salvar
      </button>

      {item && (
        <>
          <button className="botao-apagar" onClick={apagar}>
            {confirmarApagar ? 'Tocar de novo para apagar' : 'Apagar'}
          </button>
          {confirmarApagar && (
            <p className="nota-discreta">
              {tipo === 'rotina'
                ? 'Some de hoje em diante. Os dias passados continuam como estão.'
                : 'Apaga o avulso, com a marcação e a nota dele.'}
            </p>
          )}
        </>
      )}
    </Folha>
  )
}

/**
 * Tira um item da rotina sem reescrever o passado: se ele nunca foi marcado, apaga;
 * senão só encerra a vigência (some de hoje em diante, ou de amanhã se hoje já foi marcado).
 */
export async function encerrarItemDaRotina(id: string) {
  await db.transaction('rw', db.routine, db.entries, async () => {
    const marcacoes = await db.entries.where('itemId').equals(id).toArray()
    if (marcacoes.length === 0) {
      await db.routine.delete(id)
      return
    }
    const h = hoje()
    const until = marcacoes.some((e) => e.date === h) ? somarDias(h, 1) : h
    await db.routine.update(id, { until })
  })
}
