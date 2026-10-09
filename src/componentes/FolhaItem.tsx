import { useState } from 'react'
import type { Entry, Estado } from '../db'
import { salvarEntry, type ItemDoDia } from '../lib/dia'
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

  // O estado é salvo na hora do toque; motivo e nota, ao sair do campo e ao fechar.
  const salvar = (mudancas: { status?: Estado; reason?: string; note?: string } = {}) =>
    salvarEntry(date, item.id, { status, reason, note, ...mudancas })

  function escolher(novo: Estado | undefined) {
    // "Limpar" e "Feito" descartam o motivo; a nota fica.
    const novoMotivo = novo === 'skipped' ? reason : ''
    setStatus(novo)
    setReason(novoMotivo)
    void salvar({ status: novo, reason: novoMotivo })
  }

  function fechar() {
    void salvar()
    aoFechar()
  }

  const horario = item.start ? `${item.start}${item.end ? `–${item.end}` : ''}` : 'no dia'

  return (
    <Folha aberta aoFechar={fechar} titulo={item.title}>
      <p className="folha-sub">{horario}{item.origem === 'avulso' ? ' · avulso' : ''}</p>

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
