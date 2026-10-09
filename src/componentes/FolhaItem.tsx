import { useState } from 'react'
import type { Entry, Estado } from '../db'
import { horarioDoDia, minutos, paraHorario, salvarEntry, type ItemDoDia } from '../lib/dia'
import type { DataISO } from '../lib/datas'
import { Folha } from './Folha'

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
  const horario = horarioDoDia(item, entry)

  // O estado é salvo na hora do toque; motivo e nota, ao sair do campo e ao fechar.
  const salvar = (mudancas: Partial<Pick<Entry, 'status' | 'reason' | 'note'>> = {}) =>
    salvarEntry(date, item.id, { status, reason, note, ...mudancas })

  function escolher(novo: Estado | undefined) {
    setStatus(novo)
    void salvar({ status: novo })
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

      <div className="segmentado" role="group" aria-label="Estado">
        <button aria-pressed={status === 'done'} onClick={() => escolher('done')}>Feito</button>
        <button aria-pressed={status === 'skipped'} onClick={() => escolher('skipped')}>Não feito</button>
        <button aria-pressed={!status} onClick={() => escolher(undefined)}>Limpar</button>
      </div>

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
            onChange={(e) => setReason(e.target.value)}
            onBlur={() => void salvar()}
          />
        </div>
      )}

      <label className="campo">
        <span className="rotulo">Nota</span>
        <textarea
          className="entrada"
          rows={3}
          placeholder={`Ex.: ${item.title}: o que rolou hoje`}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => void salvar()}
        />
      </label>

      <button className="botao-principal" onClick={fechar}>Fechar</button>
    </Folha>
  )
}
