import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Food } from '../db'
import type { DataISO } from '../lib/datas'
import { novoId } from '../lib/id'
import { normalizar } from '../lib/pensamentos'
import { Folha } from '../componentes/Folha'
import { Segmentado } from '../componentes/Campos'
import { CATEGORIAS } from './cardapio'
import { formatarKcal, recentes, registrar } from './dados'

type Modo = 'cardapio' | 'mao' | 'livre'

const lerNumero = (v: string) => {
  const n = Number(v.replace(',', '.'))
  return v.trim() === '' || Number.isNaN(n) ? undefined : n
}

// Registrar comida: do cardápio (um toque), à mão (nome, kcal, proteína; pode guardar
// no cardápio) ou refeição livre (só as calorias).
export function RegistrarComida({ date, aoFechar, aoRegistrar }: {
  date: DataISO
  aoFechar: () => void
  /** depois de registrar (ex.: fechar também a folha de baixo, para o aviso aparecer) */
  aoRegistrar?: () => void
}) {
  const [modo, setModo] = useState<Modo>('cardapio')
  const [busca, setBusca] = useState('')
  const [categoria, setCategoria] = useState<string | null>(null)
  const [nome, setNome] = useState('')
  const [kcal, setKcal] = useState('')
  const [proteina, setProteina] = useState('')
  const [guardar, setGuardar] = useState(true)
  const [catNova, setCatNova] = useState('jantar')

  const dados = useLiveQuery(async () => {
    const cardapio = await db.foods.orderBy('order').toArray()
    return { cardapio, recentes: await recentes(cardapio) }
  })

  async function concluir(registro: Parameters<typeof registrar>[1]) {
    await registrar(date, registro)
    aoFechar()
    aoRegistrar?.()
  }

  async function salvarMao() {
    const k = lerNumero(kcal)
    const p = lerNumero(proteina) ?? 0
    if (!nome.trim() || k == null) return
    let foodId: string | undefined
    if (guardar) {
      const ultimo = await db.foods.orderBy('order').last()
      foodId = novoId()
      await db.foods.add({ id: foodId, name: nome.trim(), kcal: k, protein: p, category: catNova, order: (ultimo?.order ?? 0) + 1, createdAt: new Date().toISOString() })
    }
    await concluir({ name: nome.trim(), kcal: k, protein: p, foodId })
  }

  async function salvarLivre() {
    const k = lerNumero(kcal)
    if (k == null) return
    await concluir({ name: nome.trim() || 'Refeição livre', kcal: k, protein: lerNumero(proteina) ?? 0, free: true })
  }

  if (!dados) return null
  const termo = normalizar(busca.trim())
  const lista = dados.cardapio.filter(
    (f) => (!categoria || f.category === categoria) && (!termo || normalizar(f.name).includes(termo)),
  )
  const opcao = (f: Food) => (
    <li key={f.id}>
      <button className="linha" onClick={() => void concluir({ name: f.name, kcal: f.kcal, protein: f.protein, foodId: f.id })}>
        <span className="linha-texto">
          <span>{f.name}</span>
          <span className="linha-sub">{formatarKcal(f.kcal)} kcal · {f.protein} g de proteína</span>
        </span>
      </button>
    </li>
  )

  return (
    <Folha aberta aoFechar={aoFechar} titulo="Registrar">
      <Segmentado
        opcoes={[{ valor: 'cardapio', nome: 'Cardápio' }, { valor: 'mao', nome: 'À mão' }, { valor: 'livre', nome: 'Livre' }]}
        valor={modo}
        aoMudar={setModo}
      />

      {modo === 'cardapio' && (
        <>
          <input className="entrada busca-cardapio" type="search" placeholder="Buscar" value={busca} onChange={(e) => setBusca(e.target.value)} />
          <div className="fichas fichas-rolaveis">
            {CATEGORIAS.filter((c) => dados.cardapio.some((f) => f.category === c)).map((c) => (
              <button key={c} className="ficha ficha-pequena" aria-pressed={categoria === c} onClick={() => setCategoria(categoria === c ? null : c)}>
                {c}
              </button>
            ))}
          </div>
          {!termo && !categoria && dados.recentes.length > 0 && (
            <>
              <h3 className="secao-titulo">Recentes</h3>
              <ul className="lista">{dados.recentes.map(opcao)}</ul>
              <h3 className="secao-titulo">Tudo</h3>
            </>
          )}
          <ul className="lista">{lista.map(opcao)}</ul>
          {lista.length === 0 && <p className="vazio">Nada com esse nome. Use “À mão”.</p>}
        </>
      )}

      {modo === 'mao' && (
        <>
          <label className="campo">
            <span className="rotulo">O que foi</span>
            <input className="entrada" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Pão de queijo 2 un." />
          </label>
          <div className="cardio-numeros">
            <label className="campo"><span className="rotulo">Calorias (kcal)</span>
              <input className="entrada entrada-grande" inputMode="numeric" value={kcal} onChange={(e) => setKcal(e.target.value)} /></label>
            <label className="campo"><span className="rotulo">Proteína (g)</span>
              <input className="entrada entrada-grande" inputMode="decimal" value={proteina} onChange={(e) => setProteina(e.target.value)} /></label>
          </div>
          <div className="fichas campo">
            <button className="ficha" aria-pressed={guardar} onClick={() => setGuardar(!guardar)}>guardar no cardápio</button>
          </div>
          {guardar && (
            <div className="fichas fichas-rolaveis">
              {CATEGORIAS.map((c) => (
                <button key={c} className="ficha ficha-pequena" aria-pressed={catNova === c} onClick={() => setCatNova(c)}>{c}</button>
              ))}
            </div>
          )}
          <button className="botao-principal" disabled={!nome.trim() || lerNumero(kcal) == null} onClick={() => void salvarMao()}>Registrar</button>
        </>
      )}

      {modo === 'livre' && (
        <>
          <p className="nota-discreta campo">Refeição livre: só as calorias (a estimativa que você tiver). Proteína e nome são opcionais.</p>
          <div className="cardio-numeros">
            <label className="campo"><span className="rotulo">Calorias (kcal)</span>
              <input className="entrada entrada-grande" inputMode="numeric" value={kcal} onChange={(e) => setKcal(e.target.value)} autoFocus /></label>
            <label className="campo"><span className="rotulo">Proteína (g)</span>
              <input className="entrada entrada-grande" inputMode="decimal" placeholder="—" value={proteina} onChange={(e) => setProteina(e.target.value)} /></label>
          </div>
          <label className="campo">
            <span className="rotulo">Nome (opcional)</span>
            <input className="entrada" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: pizza de calabresa" />
          </label>
          <button className="botao-principal" disabled={lerNumero(kcal) == null} onClick={() => void salvarLivre()}>Registrar</button>
        </>
      )}
    </Folha>
  )
}
