import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Coursework, type TipoEntrega } from '../db'
import { hoje, type DataISO } from '../lib/datas'
import { novoId } from '../lib/id'
import { avisar } from '../lib/aviso'
import { Folha } from '../componentes/Folha'
import { Segmentado } from '../componentes/Campos'

export const TIPOS: { valor: TipoEntrega; nome: string }[] = [
  { valor: 'prova', nome: 'Prova' },
  { valor: 'trabalho', nome: 'Trabalho' },
  { valor: 'atividade', nome: 'Atividade' },
]
export const nomeDoTipo = (t: TipoEntrega) => TIPOS.find((x) => x.valor === t)!.nome

/** "hoje", "amanhã", "em 3 dias", "há 2 dias" */
export function quandoFalta(due: DataISO, h = hoje()): string {
  const dias = Math.round((new Date(due + 'T12:00').getTime() - new Date(h + 'T12:00').getTime()) / 86_400_000)
  if (dias === 0) return 'hoje'
  if (dias === 1) return 'amanhã'
  if (dias === -1) return 'ontem'
  return dias > 0 ? `em ${dias} dias` : `há ${-dias} dias`
}

// Prova, trabalho ou atividade: título, data, feito e nota (opcional).
// Aberto de dentro de uma matéria, ela já vem escolhida.
export function EditorEntrega({ entrega, subjectId, aoFechar }: {
  entrega?: Coursework
  /** matéria fixa (criando de dentro dela) */
  subjectId?: string
  aoFechar: () => void
}) {
  const materias = useLiveQuery(async () => (await db.subjects.orderBy('order').toArray()).filter((m) => !m.archived))
  const texto = (n?: number) => (n == null ? '' : String(n).replace('.', ','))
  const [tipo, setTipo] = useState<TipoEntrega>(entrega?.kind ?? 'trabalho')
  const [titulo, setTitulo] = useState(entrega?.title ?? '')
  const [data, setData] = useState<DataISO>(entrega?.due ?? hoje())
  const [materia, setMateria] = useState(entrega?.subjectId ?? subjectId)
  const [feito, setFeito] = useState(!!entrega?.done)
  const [nota, setNota] = useState(texto(entrega?.grade))
  const [notaMax, setNotaMax] = useState(texto(entrega?.maxGrade ?? 10))
  const [obs, setObs] = useState(entrega?.note ?? '')
  const num = (v: string) => {
    const n = Number(v.replace(',', '.'))
    return v.trim() === '' || !Number.isFinite(n) ? undefined : n
  }
  const valido = titulo.trim() !== '' && !!data && !!materia

  async function salvar() {
    if (!valido) return
    const grade = num(nota)
    const dados = {
      subjectId: materia!,
      kind: tipo,
      title: titulo.trim(),
      due: data,
      done: feito || grade != null || undefined,
      grade,
      maxGrade: grade != null ? num(notaMax) ?? 10 : undefined,
      note: obs.trim() || undefined,
    }
    if (entrega) await db.coursework.update(entrega.id, dados)
    else await db.coursework.add({ id: novoId(), ...dados, createdAt: new Date().toISOString() })
    aoFechar()
  }

  async function apagar() {
    if (!entrega) return
    await db.coursework.delete(entrega.id)
    aoFechar()
    avisar(`${nomeDoTipo(entrega.kind)} apagada`, () => db.coursework.put(entrega))
  }

  return (
    <Folha aberta aoFechar={aoFechar} titulo={entrega ? entrega.title : 'Nova prova ou trabalho'}>
      <Segmentado opcoes={TIPOS} valor={tipo} aoMudar={setTipo} />
      <label className="campo">
        <span className="rotulo">Título</span>
        <input className="entrada" value={titulo} onChange={(e) => setTitulo(e.target.value)}
          placeholder={tipo === 'prova' ? 'Ex.: P1' : 'Ex.: Lista 3'} />
      </label>
      <label className="campo">
        <span className="rotulo">{tipo === 'prova' ? 'Data da prova' : 'Data de entrega'}</span>
        <input className="entrada" type="date" value={data} onChange={(e) => setData(e.target.value)} />
      </label>
      {!subjectId && materias && (
        <>
          <span className="rotulo campo">Matéria</span>
          <div className="fichas">
            {materias.map((m) => (
              <button key={m.id} className="ficha ficha-pequena" aria-pressed={materia === m.id} onClick={() => setMateria(m.id)}>
                {m.name}
              </button>
            ))}
          </div>
        </>
      )}
      <div className="fichas campo">
        <button className="ficha" aria-pressed={feito} onClick={() => setFeito(!feito)}>
          {tipo === 'prova' ? 'já fiz' : 'entregue'}
        </button>
      </div>
      <div className="cardio-numeros">
        <label className="campo"><span className="rotulo">Nota (opcional)</span>
          <input className="entrada entrada-grande" inputMode="decimal" placeholder="—" value={nota} onChange={(e) => setNota(e.target.value)} /></label>
        <label className="campo"><span className="rotulo">Valia</span>
          <input className="entrada entrada-grande" inputMode="decimal" value={notaMax} onChange={(e) => setNotaMax(e.target.value)} /></label>
      </div>
      <label className="campo">
        <span className="rotulo">Observação</span>
        <textarea className="entrada" rows={2} value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Ex.: capítulos 1 a 4" />
      </label>
      <button className="botao-principal" disabled={!valido} onClick={() => void salvar()}>Salvar</button>
      {entrega && <button className="botao-apagar" onClick={() => void apagar()}>Apagar</button>}
    </Folha>
  )
}
