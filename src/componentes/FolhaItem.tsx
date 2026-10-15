import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Entry, type Estado, type ModoAula } from '../db'
import { horarioDoDia, minutos, paraHorario, salvarEntry, type ItemDoDia } from '../lib/dia'
import type { DataISO } from '../lib/datas'
import { Folha } from './Folha'
import { BotaoTreino } from '../treino/BotaoTreino'
import { useComAtraso } from '../lib/atraso'
import { abrirMateria, MODOS, modoDaEntry, statusDoModo } from '../faculdade/dados'

const ATALHOS_MOTIVO = ['doente', 'trabalho', 'cansaço', 'imprevisto', 'sem vontade']

// O componente é montado de novo a cada item aberto (key no pai), então o estado
// local começa sempre com o que está salvo.
export function FolhaItem({ item, date, entry, aoFechar }: {
  item: ItemDoDia
  date: DataISO
  entry?: Entry
  aoFechar: () => void
}) {
  const [status, setStatus] = useState<Estado | undefined>(entry?.status)
  const [reason, setReason] = useState(entry?.reason ?? '')
  const [note, setNote] = useState(entry?.note ?? '')
  const [modo, setModo] = useState<ModoAula | undefined>(modoDaEntry(entry))
  const materia = useLiveQuery(async () => (item.subjectId ? db.subjects.get(item.subjectId) : undefined), [item.subjectId])
  const horario = horarioDoDia(item, entry)

  // O estado é salvo na hora do toque; motivo e nota, ao sair do campo e ao fechar.
  const salvar = (mudancas: Partial<Pick<Entry, 'status' | 'reason' | 'note'>> = {}) =>
    salvarEntry(date, item.id, { status, reason, note, ...mudancas })

  // enquanto digita, salva meio segundo depois de parar (se o iOS fechar o app, não perde)
  const salvarDepois = useComAtraso((mudancas: Partial<Pick<Entry, 'reason' | 'note'>>) => salvar(mudancas))

  function escolher(novo: Estado | undefined) {
    setStatus(novo)
    void salvar({ status: novo })
  }

  // aula: o modo define o estado (presencial/online = feito, faltei = não feito, não teve = nada)
  function escolherModo(novo: ModoAula | undefined) {
    const status = statusDoModo(novo)
    setModo(novo)
    setStatus(status)
    void salvarEntry(date, item.id, { status, classMode: novo, reason, note })
  }

  function fechar() {
    void salvar()
    aoFechar()
  }

  // Mudar o início mantém a duração; mudar o fim muda a duração.
  function mudarInicio(valor: string) {
    if (!valor || !horario.start) return
    const duracao = horario.end ? minutos(horario.end) - minutos(horario.start) : 60
    const fim = Math.min(minutos(valor) + duracao, 24 * 60 - 1)
    void salvarEntry(date, item.id, { start: valor, end: paraHorario(fim) })
  }
  function mudarFim(valor: string) {
    if (!valor || !horario.start || minutos(valor) <= minutos(horario.start)) return
    void salvarEntry(date, item.id, { start: horario.start, end: valor })
  }

  return (
    <Folha aberta aoFechar={fechar} titulo={item.title}>
      {horario.start ? (
        <div className="horario-do-dia">
          <input type="time" className="entrada entrada-hora" aria-label="Início" value={horario.start}
            onChange={(e) => mudarInicio(e.target.value)} />
          <span>–</span>
          <input type="time" className="entrada entrada-hora" aria-label="Fim" value={horario.end ?? ''}
            onChange={(e) => mudarFim(e.target.value)} />
          {horario.ajustado && (
            <button className="link horario-voltar" onClick={() => void salvarEntry(date, item.id, { start: undefined, end: undefined })}>
              voltar para {item.start}
            </button>
          )}
        </div>
      ) : (
        <p className="folha-sub">no dia{item.origem === 'avulso' ? ' · avulso' : ''}</p>
      )}

      {item.opensWorkout && <BotaoTreino date={date} itemId={item.id} />}

      {item.subjectId ? (
        <>
          <div className="segmentado" style={{ gridTemplateColumns: `repeat(${MODOS.length}, 1fr)` }} role="group" aria-label="Como foi a aula">
            {MODOS.map((m) => (
              <button key={m.valor} aria-pressed={modo === m.valor} onClick={() => escolherModo(modo === m.valor ? undefined : m.valor)}>
                {m.nome}
              </button>
            ))}
          </div>
          {materia && (
            <button className="link ver-materia" onClick={() => { fechar(); abrirMateria(materia.id) }}>
              ver {materia.name} →
            </button>
          )}
        </>
      ) : (
        <div className="segmentado" role="group" aria-label="Estado">
          <button aria-pressed={status === 'done'} onClick={() => escolher('done')}>Feito</button>
          <button aria-pressed={status === 'skipped'} onClick={() => escolher('skipped')}>Não feito</button>
          <button aria-pressed={!status} onClick={() => escolher(undefined)}>Limpar</button>
        </div>
      )}

      {status === 'skipped' && (
        <div className="campo">
          <span className="rotulo">Motivo (opcional)</span>
          <div className="fichas">
            {ATALHOS_MOTIVO.map((m) => (
              <button
                key={m}
                className="ficha"
                aria-pressed={reason === m}
                onClick={() => {
                  const novo = reason === m ? '' : m
                  setReason(novo)
                  void salvar({ reason: novo })
                }}
              >
                {m}
              </button>
            ))}
          </div>
          <input
            className="entrada"
            placeholder="ou escreva…"
            value={ATALHOS_MOTIVO.includes(reason) ? '' : reason}
            onChange={(e) => {
              setReason(e.target.value)
              salvarDepois({ reason: e.target.value })
            }}
            onBlur={() => void salvar()}
          />
        </div>
      )}

      <label className="campo">
        <span className="rotulo">Nota</span>
        <textarea
          className="entrada"
          rows={3}
          placeholder={item.subjectId ? 'O que foi visto na aula' : `Ex.: ${item.title}: o que rolou hoje`}
          value={note}
          onChange={(e) => {
            setNote(e.target.value)
            salvarDepois({ note: e.target.value })
          }}
          onBlur={() => void salvar()}
        />
      </label>

      <button className="botao-principal" onClick={fechar}>Fechar</button>
    </Folha>
  )
}
