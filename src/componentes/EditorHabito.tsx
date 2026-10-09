import { useState } from 'react'
import { db, type Habit } from '../db'
import { hoje, somarDias } from '../lib/datas'
import { novoId } from '../lib/id'
import { Folha } from './Folha'
import { avisar } from '../lib/aviso'
import { SeletorDias } from './Campos'

export function EditorHabito({ habito, aoFechar }: { habito?: Habit; aoFechar: () => void }) {
  const [name, setName] = useState(habito?.name ?? '')
  const [weekdays, setWeekdays] = useState<number[]>(habito?.weekdays ?? [0, 1, 2, 3, 4, 5, 6])
  const ok = name.trim() && weekdays.length > 0

  async function salvar() {
    if (!ok) return
    if (habito) await db.habits.update(habito.id, { name: name.trim(), weekdays })
    else {
      const ultimo = await db.habits.orderBy('order').last()
      await db.habits.add({ id: novoId(), name: name.trim(), weekdays, order: (ultimo?.order ?? -1) + 1, startsOn: hoje() })
    }
    aoFechar()
  }

  // Igual aos itens da rotina: com marcações, só sai da lista daqui pra frente.
  async function apagar() {
    if (!habito) return
    await db.transaction('rw', db.habits, db.habitLogs, async () => {
      const logs = await db.habitLogs.where('habitId').equals(habito.id).toArray()
      if (logs.length === 0) await db.habits.delete(habito.id)
      else {
        const h = hoje()
        await db.habits.update(habito.id, { until: logs.some((l) => l.date === h) ? somarDias(h, 1) : h })
      }
    })
    avisar('Hábito tirado da lista', () => db.habits.put(habito))
    aoFechar()
  }

  return (
    <Folha aberta aoFechar={aoFechar} titulo={habito ? 'Editar hábito' : 'Novo hábito'}>
      <label className="campo">
        <span className="rotulo">Nome</span>
        <input className="entrada" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Arrumar a cama" />
      </label>
      <div className="campo">
        <span className="rotulo">Dias em que vale</span>
        <SeletorDias valor={weekdays} aoMudar={setWeekdays} />
      </div>
      <button className="botao-principal" onClick={salvar} disabled={!ok}>Salvar</button>
      {habito && (
        <>
          <button className="botao-apagar" onClick={apagar}>Tirar da lista</button>
          <p className="nota-discreta centro">Sai de hoje em diante; as marcações antigas ficam.</p>
        </>
      )}
    </Folha>
  )
}
