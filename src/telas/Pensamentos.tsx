import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Thought } from '../db'
import { formatarDataLonga, hoje } from '../lib/datas'
import { nomeDoTipo, normalizar } from '../lib/pensamentos'
import { EditorPensamento } from '../componentes/EditorPensamento'

const hora = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

export function Pensamentos() {
  const pensamentos = useLiveQuery(() => db.thoughts.orderBy('createdAt').reverse().toArray())
  const [busca, setBusca] = useState('')
  const [soTerapia, setSoTerapia] = useState(false)
  const [etiqueta, setEtiqueta] = useState<string | null>(null)
  const [editando, setEditando] = useState<Thought | null>(null)

  if (!pensamentos) return null

  if (pensamentos.length === 0) {
    return (
      <p className="vazio">
        Nada anotado ainda. O lápis no canto da tela guarda um pensamento de qualquer lugar do app.
      </p>
    )
  }

  // etiquetas mais usadas primeiro
  const contagem = new Map<string, number>()
  pensamentos.forEach((p) => p.tags.forEach((t) => contagem.set(t, (contagem.get(t) ?? 0) + 1)))
  const etiquetas = [...contagem.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t)

  const termo = normalizar(busca.trim())
  const filtrados = pensamentos.filter(
    (p) =>
      (!soTerapia || p.forTherapy) &&
      (!etiqueta || p.tags.includes(etiqueta)) &&
      (!termo || normalizar(`${p.text} ${nomeDoTipo(p.kind) ?? ''}`).includes(termo)),
  )

  // agrupa por dia, mantendo a ordem (mais recente primeiro)
  const grupos: { date: string; itens: Thought[] }[] = []
  for (const p of filtrados) {
    const ultimo = grupos[grupos.length - 1]
    if (ultimo?.date === p.date) ultimo.itens.push(p)
    else grupos.push({ date: p.date, itens: [p] })
  }

  return (
    <section>
      <input
        className="entrada"
        type="search"
        placeholder="Buscar"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
      />
      <div className="filtros">
        <button className="ficha ficha-pequena" aria-pressed={soTerapia} onClick={() => setSoTerapia(!soTerapia)}>
          pra terapia
        </button>
        {etiquetas.map((t) => (
          <button key={t} className="ficha ficha-pequena" aria-pressed={etiqueta === t}
            onClick={() => setEtiqueta(etiqueta === t ? null : t)}>
            #{t}
          </button>
        ))}
      </div>

      {grupos.length === 0 && <p className="vazio">Nada encontrado.</p>}

      {grupos.map((g) => (
        <div key={g.date}>
          <h2 className="secao-titulo">{g.date === hoje() ? 'Hoje' : formatarDataLonga(g.date)}</h2>
          <ul className="lista">
            {g.itens.map((p) => (
              <li key={p.id}>
                <button className="pensamento" onClick={() => setEditando(p)}>
                  <span className="pensamento-texto">{p.text}</span>
                  <span className="pensamento-meta">
                    {hora(p.createdAt)}
                    {p.kind && ` · ${nomeDoTipo(p.kind)}`}
                    {p.forTherapy && ' · pra terapia'}
                    {p.resurfaceAt && p.resurfaceAt > hoje() && ` · volta em ${formatarDataLonga(p.resurfaceAt)}`}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {editando && (
        <EditorPensamento key={editando.id} pensamento={editando} aberta aoFechar={() => setEditando(null)} />
      )}
    </section>
  )
}
