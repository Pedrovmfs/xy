import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Food } from '../db'
import { novoId } from '../lib/id'
import { avisar } from '../lib/aviso'
import { normalizar } from '../lib/pensamentos'
import { Folha } from '../componentes/Folha'
import { CATEGORIAS } from './cardapio'
import { formatarKcal } from './dados'

// O cardápio editável: mudar valores (ex.: pelo rótulo do produto que comprou),
// criar e apagar opções. Os registros antigos guardam nome e valores do momento,
// então mexer aqui não muda o que já foi comido.

export function PaginaCardapio() {
  const cardapio = useLiveQuery(() => db.foods.orderBy('order').toArray())
  const [busca, setBusca] = useState('')
  const [aberta, setAberta] = useState<Food | 'nova' | null>(null)
  if (!cardapio) return null

  const termo = normalizar(busca.trim())
  const lista = cardapio.filter((f) => !termo || normalizar(f.name).includes(termo))
  // categorias conhecidas primeiro; as criadas à mão (se houver) no fim
  const categorias = [...CATEGORIAS, ...new Set(cardapio.map((f) => f.category).filter((c) => !CATEGORIAS.includes(c)))]

  return (
    <>
      <p className="nota-discreta">
        Toque numa opção para mudar os valores (ex.: pelo rótulo do que você comprou). O que já foi registrado não muda.
      </p>
      <input className="entrada busca-cardapio" type="search" placeholder="Buscar" value={busca} onChange={(e) => setBusca(e.target.value)} />
      {categorias.map((c) => {
        const itens = lista.filter((f) => f.category === c)
        if (!itens.length) return null
        return (
          <div key={c}>
            <h3 className="secao-titulo mes-titulo">{c}</h3>
            <ul className="lista">
              {itens.map((f) => (
                <li key={f.id}>
                  <button className="linha" onClick={() => setAberta(f)}>
                    <span className="linha-texto">
                      <span>{f.name}</span>
                      <span className="linha-sub">{formatarKcal(f.kcal)} kcal · {f.protein} g de proteína</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )
      })}
      {lista.length === 0 && <p className="vazio">Nada com esse nome.</p>}
      <button className="botao-novo" onClick={() => setAberta('nova')}>+ nova opção</button>

      {aberta && (
        <EditorOpcao
          key={aberta === 'nova' ? 'nova' : aberta.id}
          opcao={aberta === 'nova' ? undefined : aberta}
          categorias={categorias}
          aoFechar={() => setAberta(null)}
        />
      )}
    </>
  )
}

function EditorOpcao({ opcao, categorias, aoFechar }: { opcao?: Food; categorias: string[]; aoFechar: () => void }) {
  const texto = (n?: number) => (n == null ? '' : String(n).replace('.', ','))
  const [nome, setNome] = useState(opcao?.name ?? '')
  const [kcal, setKcal] = useState(texto(opcao?.kcal))
  const [proteina, setProteina] = useState(texto(opcao?.protein))
  const [categoria, setCategoria] = useState(opcao?.category ?? 'jantar')
  const num = (v: string) => {
    const n = Number(v.replace(',', '.'))
    return v.trim() === '' || !Number.isFinite(n) || n < 0 ? undefined : n
  }
  const valido = nome.trim() !== '' && num(kcal) != null

  async function salvar() {
    if (!valido) return
    const dados = { name: nome.trim(), kcal: num(kcal)!, protein: num(proteina) ?? 0, category: categoria }
    if (opcao) {
      await db.foods.update(opcao.id, dados)
    } else {
      const ultimo = await db.foods.orderBy('order').last()
      await db.foods.add({ id: novoId(), ...dados, order: (ultimo?.order ?? 0) + 1, createdAt: new Date().toISOString() })
    }
    aoFechar()
  }

  async function apagar() {
    if (!opcao) return
    await db.foods.delete(opcao.id)
    aoFechar()
    avisar('Opção apagada', () => db.foods.put(opcao))
  }

  return (
    <Folha aberta aoFechar={aoFechar} titulo={opcao ? 'Editar opção' : 'Nova opção'}>
      <label className="campo">
        <span className="rotulo">Nome</span>
        <input className="entrada" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Sanduíche de frango 150 g" />
      </label>
      <div className="cardio-numeros">
        <label className="campo"><span className="rotulo">Calorias (kcal)</span>
          <input className="entrada entrada-grande" inputMode="numeric" value={kcal} onChange={(e) => setKcal(e.target.value)} /></label>
        <label className="campo"><span className="rotulo">Proteína (g)</span>
          <input className="entrada entrada-grande" inputMode="decimal" value={proteina} onChange={(e) => setProteina(e.target.value)} /></label>
      </div>
      <span className="rotulo campo">Categoria</span>
      <div className="fichas">
        {categorias.map((c) => (
          <button key={c} className="ficha ficha-pequena" aria-pressed={categoria === c} onClick={() => setCategoria(c)}>{c}</button>
        ))}
      </div>
      <button className="botao-principal" disabled={!valido} onClick={() => void salvar()}>Salvar</button>
      {opcao && <button className="botao-apagar" onClick={() => void apagar()}>Apagar esta opção</button>}
    </Folha>
  )
}
