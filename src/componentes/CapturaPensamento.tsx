import { useState } from 'react'
import { db } from '../db'
import { hoje } from '../lib/datas'
import { novoId } from '../lib/id'
import { IconeEscrever } from '../icones'
import { Folha } from './Folha'

// Botão pequeno fixo → só um campo de texto. Etiquetas e resgate vêm na Parte 4.
export function CapturaPensamento() {
  const [aberta, setAberta] = useState(false)
  const [texto, setTexto] = useState('')

  async function guardar() {
    const limpo = texto.trim()
    if (limpo) {
      await db.thoughts.add({ id: novoId(), text: limpo, createdAt: new Date().toISOString(), date: hoje(), tags: [] })
    }
    setTexto('')
    setAberta(false)
  }

  return (
    <>
      <button className="botao-captura" onClick={() => setAberta(true)} aria-label="Anotar pensamento">
        <IconeEscrever />
      </button>
      {/* Fechar tocando fora não perde o texto: ele fica guardado até a próxima abertura. */}
      <Folha aberta={aberta} aoFechar={() => setAberta(false)} titulo="Pensamento">
        <textarea
          className="entrada"
          rows={5}
          autoFocus
          value={texto}
          placeholder="O que passou pela cabeça?"
          onChange={(e) => setTexto(e.target.value)}
        />
        <button className="botao-principal" onClick={guardar} disabled={!texto.trim()}>
          Guardar
        </button>
      </Folha>
    </>
  )
}
