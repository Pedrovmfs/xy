import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Area } from '../db'
import { novoId } from '../lib/id'
import { Folha } from './Folha'
import { CORES, SeletorCor } from './Campos'

export function EditorArea({ area, aoFechar }: { area?: Area; aoFechar: () => void }) {
  const [name, setName] = useState(area?.name ?? '')
  const [color, setColor] = useState(area?.color ?? CORES[0])
  const [meta, setMeta] = useState(area?.weeklyGoal ? String(area.weeklyGoal) : '')
  const [confirmarApagar, setConfirmarApagar] = useState(false)

  // Área em uso por algum item não pode ser apagada (os itens ficariam órfãos).
  const emUso = useLiveQuery(async () => {
    if (!area) return 0
    const [r, o] = await Promise.all([
      db.routine.where('areaId').equals(area.id).count(),
      db.oneoffs.where('areaId').equals(area.id).count(),
    ])
    return r + o
  }, [area?.id])

  async function salvar() {
    if (!name.trim()) return
    const weeklyGoal = Number(meta) > 0 ? Math.round(Number(meta)) : undefined
    if (area) await db.areas.update(area.id, { name: name.trim(), color, weeklyGoal })
    else {
      const ultima = await db.areas.orderBy('order').last()
      await db.areas.add({ id: novoId(), name: name.trim(), color, nextStep: '', weeklyGoal, order: (ultima?.order ?? -1) + 1 })
    }
    aoFechar()
  }

  async function apagar() {
    if (!area || emUso) return
    if (!confirmarApagar) {
      setConfirmarApagar(true)
      return
    }
    await db.areas.delete(area.id)
    aoFechar()
  }

  return (
    <Folha aberta aoFechar={aoFechar} titulo={area ? 'Editar área' : 'Nova área'}>
      <label className="campo">
        <span className="rotulo">Nome</span>
        <input className="entrada" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Faculdade" />
      </label>
      <div className="campo">
        <span className="rotulo">Cor</span>
        <SeletorCor valor={color} aoMudar={setColor} />
      </div>
      <label className="campo">
        <span className="rotulo">Meta por semana (opcional)</span>
        <input
          className="entrada entrada-curta"
          type="number"
          inputMode="numeric"
          min={1}
          max={7}
          value={meta}
          onChange={(e) => setMeta(e.target.value)}
          placeholder="—"
        />
        <span className="nota-discreta">Quantos itens dessa área feitos por semana. Ex.: Treino 5.</span>
      </label>
      <button className="botao-principal" onClick={salvar} disabled={!name.trim()}>Salvar</button>
      {area &&
        (emUso ? (
          <p className="nota-discreta centro">
            Usada por {emUso} {emUso === 1 ? 'item' : 'itens'}; para apagar, tire a área deles antes.
          </p>
        ) : (
          <button className="botao-apagar" onClick={apagar}>
            {confirmarApagar ? 'Tocar de novo para apagar' : 'Apagar'}
          </button>
        ))}
    </Folha>
  )
}
