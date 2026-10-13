import { useState } from 'react'
import { db, type Cardio } from '../db'
import { hoje, type DataISO } from '../lib/datas'
import { novoId } from '../lib/id'
import { avisar } from '../lib/aviso'
import { Folha } from '../componentes/Folha'
import { formatarKm, ritmo, TIPOS_CARDIO } from './cardio'

const lerNumero = (v: string) => {
  const n = Number(v.replace(',', '.'))
  return v.trim() === '' || Number.isNaN(n) ? undefined : n
}

// Registrar (ou editar) um cardio: tipo, km (o que conta para a meta), minutos
// opcionais (para ver o ritmo), data e nota.
export function EditorCardio({ cardio, dataInicial, sessionId, aoFechar }: {
  cardio?: Cardio
  dataInicial?: DataISO
  sessionId?: string
  aoFechar: () => void
}) {
  const [type, setType] = useState(cardio?.type ?? 'caminhada')
  const [km, setKm] = useState(cardio ? String(cardio.km).replace('.', ',') : '')
  const [minutos, setMinutos] = useState(cardio?.minutes ? String(cardio.minutes) : '')
  const [date, setDate] = useState<DataISO>(cardio?.date ?? dataInicial ?? hoje())
  const [note, setNote] = useState(cardio?.note ?? '')

  const kmNum = lerNumero(km)
  const minNum = lerNumero(minutos)
  const ok = !!kmNum && kmNum > 0 && !!date
  const previa = ok ? ritmo({ km: kmNum!, minutes: minNum }) : null

  async function salvar() {
    if (!ok) return
    const registro: Cardio = {
      id: cardio?.id ?? novoId(),
      date,
      type: type.trim() || 'caminhada',
      km: kmNum!,
      minutes: minNum && minNum > 0 ? minNum : undefined,
      note: note.trim() || undefined,
      sessionId: cardio?.sessionId ?? sessionId,
      createdAt: cardio?.createdAt ?? new Date().toISOString(),
    }
    await db.cardio.put(registro)
    if (!cardio) avisar(`${registro.type} · ${formatarKm(registro.km)}`, () => db.cardio.delete(registro.id))
    aoFechar()
  }

  async function apagar() {
    if (!cardio) return
    await db.cardio.delete(cardio.id)
    avisar('Cardio apagado', () => db.cardio.put(cardio))
    aoFechar()
  }

  return (
    <Folha aberta aoFechar={aoFechar} titulo={cardio ? 'Editar cardio' : 'Registrar cardio'}>
      <div className="fichas cardio-tipos">
        {TIPOS_CARDIO.map((t) => (
          <button key={t} className="ficha" aria-pressed={type === t} onClick={() => setType(t)}>
            {t}
          </button>
        ))}
      </div>
      <div className="cardio-numeros">
        <label className="campo">
          <span className="rotulo">Distância (km)</span>
          <input className="entrada entrada-grande" inputMode="decimal" placeholder="0,0" value={km} autoFocus={!cardio}
            onChange={(e) => setKm(e.target.value)} />
        </label>
        <label className="campo">
          <span className="rotulo">Minutos (opcional)</span>
          <input className="entrada entrada-grande" inputMode="numeric" placeholder="—" value={minutos}
            onChange={(e) => setMinutos(e.target.value)} />
        </label>
      </div>
      {previa && <p className="nota-discreta">ritmo: {previa}</p>}
      <label className="campo">
        <span className="rotulo">Dia</span>
        <input type="date" className="entrada" value={date} onChange={(e) => setDate(e.target.value)} />
      </label>
      <label className="campo">
        <span className="rotulo">Nota (opcional)</span>
        <input className="entrada" value={note} placeholder="Ex.: esteira inclinação 3" onChange={(e) => setNote(e.target.value)} />
      </label>
      <button className="botao-principal" onClick={salvar} disabled={!ok}>Salvar</button>
      {cardio && <button className="botao-apagar" onClick={apagar}>Apagar</button>}
    </Folha>
  )
}
