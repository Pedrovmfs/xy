import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Subject } from '../db'
import { NOMES_DIAS_CURTOS } from '../lib/datas'
import { novoId } from '../lib/id'
import { avisar } from '../lib/aviso'
import { Folha } from '../componentes/Folha'
import { CORES, SeletorCor } from '../componentes/Campos'

// Criar/editar uma matéria: nome, cor, regra de faltas e quais blocos da rotina são aulas dela.
export function EditorMateria({ materia, aoFechar, aoApagar }: { materia?: Subject; aoFechar: () => void; aoApagar?: () => void }) {
  const rotina = useLiveQuery(async () => (await db.routine.toArray()).filter((r) => r.kind === 'block' && !r.until))
  const texto = (n?: number) => (n == null ? '' : String(n))
  const [nome, setNome] = useState(materia?.name ?? '')
  const [cor, setCor] = useState(materia?.color ?? CORES[0])
  const [carga, setCarga] = useState(texto(materia?.workload ?? 80))
  const [porAula, setPorAula] = useState(texto(materia?.absencesPerClass ?? 3))
  const [pct, setPct] = useState(texto(materia?.maxAbsencePct ?? 25))
  const [anteriores, setAnteriores] = useState(texto(materia?.priorAbsences))
  // aulas ligadas (ids da rotina); null = ainda não mexeu
  const [aulas, setAulas] = useState<Set<string> | null>(null)
  const [confirmar, setConfirmar] = useState(false)
  const num = (v: string) => {
    const n = Number(v.replace(',', '.'))
    return v.trim() === '' || !Number.isFinite(n) || n < 0 ? undefined : n
  }

  if (!rotina) return null
  const ligadas = aulas ?? new Set(rotina.filter((r) => materia && r.subjectId === materia.id).map((r) => r.id))

  async function salvar() {
    if (!nome.trim()) return
    const id = materia?.id ?? novoId()
    const dados = {
      name: nome.trim(),
      color: cor,
      workload: num(carga),
      absencesPerClass: num(porAula) || 3,
      maxAbsencePct: num(pct) ?? 25,
      priorAbsences: num(anteriores) || undefined,
    }
    await db.transaction('rw', db.subjects, db.routine, async () => {
      if (materia) await db.subjects.update(id, dados)
      else {
        const ultima = await db.subjects.orderBy('order').last()
        await db.subjects.add({ id, ...dados, order: (ultima?.order ?? -1) + 1, createdAt: new Date().toISOString() })
      }
      for (const r of rotina!) {
        const era = r.subjectId === id
        const fica = ligadas.has(r.id)
        // ligar: "Aula" genérica passa a ter o nome da matéria
        if (fica && (!era || r.title !== dados.name)) {
          await db.routine.update(r.id, { subjectId: id, title: !era && r.title.trim().toLowerCase() !== 'aula' ? r.title : dados.name })
        } else if (!fica && era) await db.routine.update(r.id, { subjectId: undefined })
      }
    })
    aoFechar()
  }

  async function arquivar(arquivada: boolean) {
    if (!materia) return
    await db.subjects.update(materia.id, { archived: arquivada || undefined })
    aoFechar()
  }

  async function apagar() {
    if (!materia) return
    if (!confirmar) return setConfirmar(true)
    const entregas = await db.coursework.where('subjectId').equals(materia.id).toArray()
    const ligadosAntes = rotina!.filter((r) => r.subjectId === materia.id)
    await db.transaction('rw', db.subjects, db.coursework, db.routine, async () => {
      await db.subjects.delete(materia.id)
      await db.coursework.bulkDelete(entregas.map((e) => e.id))
      for (const r of ligadosAntes) await db.routine.update(r.id, { subjectId: undefined })
    })
    aoApagar?.()
    aoFechar()
    avisar('Matéria apagada', () =>
      db.transaction('rw', db.subjects, db.coursework, db.routine, async () => {
        await db.subjects.put(materia)
        await db.coursework.bulkPut(entregas)
        for (const r of ligadosAntes) await db.routine.update(r.id, { subjectId: materia.id })
      }),
    )
  }

  const nCarga = num(carga)
  const nPct = num(pct) ?? 25

  return (
    <Folha aberta aoFechar={aoFechar} titulo={materia ? 'Editar matéria' : 'Nova matéria'}>
      <label className="campo">
        <span className="rotulo">Nome</span>
        <input className="entrada" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Redes de Computadores" />
      </label>
      <span className="rotulo campo">Cor</span>
      <SeletorCor valor={cor} aoMudar={setCor} />

      <span className="rotulo campo">Faltas</span>
      <div className="cardio-numeros tres">
        <label className="campo"><span className="rotulo">Carga (h)</span>
          <input className="entrada entrada-grande" inputMode="numeric" value={carga} onChange={(e) => setCarga(e.target.value)} /></label>
        <label className="campo"><span className="rotulo">Por aula</span>
          <input className="entrada entrada-grande" inputMode="numeric" value={porAula} onChange={(e) => setPorAula(e.target.value)} /></label>
        <label className="campo"><span className="rotulo">Máx. (%)</span>
          <input className="entrada entrada-grande" inputMode="numeric" value={pct} onChange={(e) => setPct(e.target.value)} /></label>
      </div>
      <p className="nota-discreta">
        {nCarga
          ? `Limite: ${Math.floor((nCarga * nPct) / 100)} faltas (${nPct}% de ${nCarga}). Aula que não teve sai da carga, e o limite diminui junto.`
          : 'Sem carga horária, o app só conta as faltas.'}
      </p>
      <label className="campo campo-linha">
        <span className="rotulo">Faltas de antes do app</span>
        <input className="entrada entrada-curta" inputMode="numeric" placeholder="0" value={anteriores} onChange={(e) => setAnteriores(e.target.value)} />
      </label>

      <span className="rotulo campo">Aulas (blocos da rotina)</span>
      <div className="fichas">
        {rotina.map((r) => (
          <button
            key={r.id}
            className="ficha ficha-pequena"
            aria-pressed={ligadas.has(r.id)}
            onClick={() => {
              const n = new Set(ligadas)
              if (n.has(r.id)) n.delete(r.id)
              else n.add(r.id)
              setAulas(n)
            }}
          >
            {r.title} · {r.weekdays.map((d) => NOMES_DIAS_CURTOS[d]).join(', ')} {r.start}
          </button>
        ))}
      </div>
      <p className="nota-discreta">Um bloco chamado “Aula” passa a ter o nome da matéria.</p>

      <button className="botao-principal" disabled={!nome.trim()} onClick={() => void salvar()}>Salvar</button>
      {materia && (
        <>
          <button className="botao-secundario" onClick={() => void arquivar(!materia.archived)}>
            {materia.archived ? 'Desarquivar' : 'Arquivar (fim do semestre)'}
          </button>
          <button className="botao-apagar" onClick={() => void apagar()}>
            {confirmar ? 'Tocar de novo para apagar (some o histórico de provas)' : 'Apagar matéria'}
          </button>
        </>
      )}
    </Folha>
  )
}
