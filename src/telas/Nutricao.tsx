import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Meal } from '../db'
import { deDataISO, formatarDataLonga, hoje, NOMES_DIAS_CURTOS, type DataISO } from '../lib/datas'
import { diasDaSemana, inicioDaSemana } from '../lib/semana'
import { Folha } from '../componentes/Folha'
import { PaginaInterna } from '../componentes/PaginaInterna'
import { IconeAvancar } from '../icones'
import { BarraNutricao } from '../nutricao/BarraNutricao'
import { EditorMetas, EspacoDaSemana, FolhaComida } from '../nutricao/FolhaComida'
import { RegistrarComida } from '../nutricao/RegistrarComida'
import { PaginaCardapio } from '../nutricao/PaginaCardapio'
import { formatarKcal, totais, useMetasNutricao } from '../nutricao/dados'
import { useSemanaLivres } from '../nutricao/saldo'

// Aba Nutrição: o dia de hoje, a semana, os dias anteriores e o cardápio.
// Como no resto do app: números como foram, sem cobrança e sem vermelho.

type Pagina = 'dias' | 'cardapio'

/** Totais por dia (só dias com algum registro). */
function porDia(meals: Meal[]) {
  const dias = new Map<DataISO, Meal[]>()
  for (const m of meals) dias.set(m.date, [...(dias.get(m.date) ?? []), m])
  return new Map([...dias].map(([d, ms]) => [d, { ...totais(ms), registros: ms.length, livres: ms.filter((m) => m.free).length }]))
}
type TotaisDia = ReturnType<typeof porDia> extends Map<DataISO, infer T> ? T : never

export function Nutricao() {
  const metas = useMetasNutricao()
  const meals = useLiveQuery(() => db.meals.toArray())
  const h = hoje()
  const semanaLivres = useSemanaLivres(h, metas)
  const [pagina, setPagina] = useState<Pagina | null>(null)
  const [diaAberto, setDiaAberto] = useState<DataISO | null>(null)
  const [registrando, setRegistrando] = useState(false)
  const [editandoMetas, setEditandoMetas] = useState(false)

  if (!metas || !meals) return null
  const dias = porDia(meals)
  const folhaDoDia = diaAberto && <FolhaComida key={diaAberto} date={diaAberto} aoFechar={() => setDiaAberto(null)} />

  if (pagina) {
    return (
      <PaginaInterna titulo={pagina === 'dias' ? 'Dias anteriores' : 'Cardápio'} nomeVoltar="Nutrição" aoVoltar={() => setPagina(null)}>
        {pagina === 'dias' && <PaginaDias dias={dias} aoAbrir={setDiaAberto} />}
        {pagina === 'cardapio' && <PaginaCardapio />}
        {folhaDoDia}
      </PaginaInterna>
    )
  }

  const semana = diasDaSemana(inicioDaSemana(h))
  const comRegistro = semana.filter((d) => dias.has(d))
  const media = (k: 'proteina' | 'kcal') =>
    comRegistro.length ? comRegistro.reduce((t, d) => t + dias.get(d)![k], 0) / comRegistro.length : 0
  const anteriores = [...dias.keys()].filter((d) => d < h).sort().reverse()

  return (
    <section className="aba-nutricao">
      <div className="cartao-hoje">
        <span className="cartao-rotulo">hoje</span>
        <BarraNutricao date={h} />
        <button className="botao-principal" onClick={() => setRegistrando(true)}>+ registrar</button>
      </div>

      <h2 className="secao-titulo">Esta semana</h2>
      <div className="nutricao-semana">
        {semana.map((d, i) => {
          const t = dias.get(d)
          return (
            <button
              key={d}
              className="nutricao-dia"
              data-hoje={d === h || undefined}
              disabled={d > h}
              onClick={() => setDiaAberto(d)}
              aria-label={`${formatarDataLonga(d)}${t ? `: ${Math.round(t.proteina)} g de proteína, ${formatarKcal(t.kcal)} kcal` : ''}`}
            >
              <span className="treino-dia-nome">{NOMES_DIAS_CURTOS[(i + 1) % 7]}</span>
              <span className="nutricao-dia-g">{t ? `${Math.round(t.proteina)}` : d > h ? '' : '–'}</span>
              <span className="nutricao-dia-kcal">{t ? formatarKcal(t.kcal) : ''}</span>
              {t && t.livres > 0 && <span className="nutricao-dia-livre">livre</span>}
            </button>
          )
        })}
      </div>
      <p className="treino-conta">
        {comRegistro.length === 0
          ? 'nada registrado nesta semana ainda'
          : `média em ${comRegistro.length} ${comRegistro.length === 1 ? 'dia' : 'dias'} com registro: ${Math.round(media('proteina'))} g · ${formatarKcal(media('kcal'))} kcal`}
      </p>
      <p className="nota-discreta">proteína em g · calorias embaixo · toque num dia para ver o que comeu</p>

      {semanaLivres && <EspacoDaSemana semana={semanaLivres} />}

      <h2 className="secao-titulo">Dias anteriores</h2>
      {anteriores.length === 0 ? (
        <p className="nota-discreta">Os dias com registro aparecem aqui.</p>
      ) : (
        <ul className="lista">
          {anteriores.slice(0, 3).map((d) => (
            <LinhaDia key={d} date={d} t={dias.get(d)!} aoAbrir={() => setDiaAberto(d)} />
          ))}
        </ul>
      )}
      {anteriores.length > 3 && (
        <button className="botao-novo" onClick={() => setPagina('dias')}>ver todos ({anteriores.length})</button>
      )}

      <h2 className="secao-titulo">Cardápio e metas</h2>
      <button className="linha" onClick={() => setPagina('cardapio')}>
        <span className="linha-texto">
          <span>Cardápio</span>
          <span className="linha-sub">as opções para registrar com um toque: mudar valores, criar, apagar</span>
        </span>
        <IconeAvancar />
      </button>
      <button className="linha" onClick={() => setEditandoMetas(true)}>
        <span className="linha-texto">
          <span>Metas</span>
          <span className="linha-sub">
            {metas.proteinaMin}–{metas.proteinaMax} g de proteína · até {formatarKcal(metas.kcalMax)} kcal · gasto {formatarKcal(metas.gastoDiario)}/dia
          </span>
        </span>
      </button>

      {folhaDoDia}
      {registrando && <RegistrarComida date={h} aoFechar={() => setRegistrando(false)} />}
      {editandoMetas && (
        <Folha aberta aoFechar={() => setEditandoMetas(false)} titulo="Metas">
          <EditorMetas metas={metas} aoFechar={() => setEditandoMetas(false)} />
        </Folha>
      )}
    </section>
  )
}

function LinhaDia({ date, t, aoAbrir }: { date: DataISO; t: TotaisDia; aoAbrir: () => void }) {
  return (
    <li>
      <button className="linha" onClick={aoAbrir}>
        <span className="linha-texto">
          <span>{formatarDataLonga(date)}</span>
          <span className="linha-sub">
            {Math.round(t.proteina)} g · {formatarKcal(t.kcal)} kcal · {t.registros} {t.registros === 1 ? 'registro' : 'registros'}
            {t.livres > 0 && ` · ${t.livres} ${t.livres === 1 ? 'livre' : 'livres'}`}
          </span>
        </span>
      </button>
    </li>
  )
}

function PaginaDias({ dias, aoAbrir }: { dias: Map<DataISO, TotaisDia>; aoAbrir: (d: DataISO) => void }) {
  const h = hoje()
  const lista = [...dias.keys()].filter((d) => d < h).sort().reverse()
  if (!lista.length) return <p className="vazio">Nenhum dia anterior com registro.</p>
  const meses: { nome: string; dias: DataISO[] }[] = []
  for (const d of lista) {
    const nome = deDataISO(d).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    const ultimo = meses[meses.length - 1]
    if (ultimo?.nome === nome) ultimo.dias.push(d)
    else meses.push({ nome, dias: [d] })
  }
  return (
    <>
      {meses.map((m) => (
        <div key={m.nome}>
          <h3 className="secao-titulo mes-titulo">{m.nome}</h3>
          <ul className="lista">
            {m.dias.map((d) => <LinhaDia key={d} date={d} t={dias.get(d)!} aoAbrir={() => aoAbrir(d)} />)}
          </ul>
        </div>
      ))}
    </>
  )
}
