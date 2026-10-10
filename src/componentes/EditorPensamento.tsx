import { useState } from 'react'
import { db, type Thought, type TipoPensamento } from '../db'
import { formatarDataLonga, hoje, type DataISO } from '../lib/datas'
import { novoId } from '../lib/id'
import { extrairEtiquetas, RESGATES, TIPOS } from '../lib/pensamentos'
import { Folha } from './Folha'
import { avisar } from '../lib/aviso'
import { rascunho } from '../lib/atraso'

const CHAVE_RASCUNHO = 'xy:rascunho-pensamento'

// Captura (pensamento novo) e edição. O texto vem primeiro; tipo, terapia e resgate
// são opcionais, logo abaixo, pequenos. Etiquetas = #hashtags do texto.
export function EditorPensamento({ pensamento, aberta, aoFechar }: {
  pensamento?: Thought
  aberta: boolean
  aoFechar: () => void
}) {
  // pensamento novo: o rascunho fica guardado no aparelho e sobrevive ao app ser fechado
  const [text, setText] = useState(pensamento?.text ?? rascunho.ler(CHAVE_RASCUNHO))
  function mudarTexto(v: string) {
    setText(v)
    if (!pensamento) rascunho.gravar(CHAVE_RASCUNHO, v)
  }
  const [kind, setKind] = useState<TipoPensamento | undefined>(pensamento?.kind)
  const [forTherapy, setForTherapy] = useState(!!pensamento?.forTherapy)
  const [resurfaceAt, setResurfaceAt] = useState<DataISO | undefined>(pensamento?.resurfaceAt)
  const [resgateEscolhido, setResgateEscolhido] = useState<string | null>(null)

  function limpar() {
    setText('')
    rascunho.gravar(CHAVE_RASCUNHO, '')
    setKind(undefined)
    setForTherapy(false)
    setResurfaceAt(undefined)
    setResgateEscolhido(null)
  }

  async function guardar() {
    const limpo = text.trim()
    if (!limpo) return
    const campos = {
      text: limpo,
      tags: extrairEtiquetas(limpo),
      kind,
      forTherapy: forTherapy || undefined,
      resurfaceAt,
    }
    if (pensamento) {
      // mudou a data do resgate → volta a poder aparecer no Hoje
      const mudouResgate = resurfaceAt !== pensamento.resurfaceAt
      await db.thoughts.update(pensamento.id, {
        ...campos,
        resurfaceDismissed: mudouResgate ? undefined : pensamento.resurfaceDismissed,
      })
    } else {
      const id = novoId()
      await db.thoughts.add({ id, ...campos, createdAt: new Date().toISOString(), date: hoje() })
      limpar()
      avisar('Guardado', () => db.thoughts.delete(id))
    }
    aoFechar()
  }

  async function apagar() {
    if (!pensamento) return
    await db.thoughts.delete(pensamento.id)
    avisar('Apagado', () => db.thoughts.put(pensamento))
    aoFechar()
  }

  const etiquetas = extrairEtiquetas(text)

  return (
    <Folha aberta={aberta} aoFechar={aoFechar} titulo={pensamento ? 'Editar' : 'Anotar'}>
      <textarea
        className="entrada"
        rows={5}
        autoFocus={!pensamento}
        value={text}
        placeholder="O que passou pela cabeça? (#etiquetas são opcionais)"
        onChange={(e) => mudarTexto(e.target.value)}
      />
      {etiquetas.length > 0 && (
        <p className="etiquetas-previa">{etiquetas.map((t) => `#${t}`).join(' ')}</p>
      )}

      <div className="opcoes-pensamento">
        <div className="fichas">
          {TIPOS.map((t) => (
            <button key={t.valor} className="ficha ficha-pequena" aria-pressed={kind === t.valor}
              onClick={() => setKind(kind === t.valor ? undefined : t.valor)}>
              {t.nome}
            </button>
          ))}
        </div>
        <div className="fichas">
          <button className="ficha ficha-pequena" aria-pressed={forTherapy} onClick={() => setForTherapy(!forTherapy)}>
            levar pra terapia
          </button>
        </div>
        <div className="campo-resgate">
          <span className="rotulo">Me lembra em</span>
          <div className="fichas">
            {RESGATES.map((r) => (
              <button
                key={r.nome}
                className="ficha ficha-pequena"
                aria-pressed={resgateEscolhido === r.nome}
                onClick={() => {
                  if (resgateEscolhido === r.nome) {
                    setResgateEscolhido(null)
                    setResurfaceAt(pensamento?.resurfaceAt)
                  } else {
                    setResgateEscolhido(r.nome)
                    setResurfaceAt(r.calcular(hoje()))
                  }
                }}
              >
                {r.nome}
              </button>
            ))}
          </div>
          {resurfaceAt && (
            <span className="nota-discreta">
              Volta no Hoje em {formatarDataLonga(resurfaceAt)}.{' '}
              <button className="link" onClick={() => { setResurfaceAt(undefined); setResgateEscolhido(null) }}>
                não lembrar
              </button>
            </span>
          )}
        </div>
      </div>

      <button className="botao-principal" onClick={guardar} disabled={!text.trim()}>
        Guardar
      </button>
      {pensamento && (
        <button className="botao-apagar" onClick={apagar}>
          Apagar
        </button>
      )}
    </Folha>
  )
}
