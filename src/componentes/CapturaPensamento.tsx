import { useState } from 'react'
import { IconeEscrever } from '../icones'
import { EditorPensamento } from './EditorPensamento'

// Botão pequeno fixo → campo de texto. O editor fica montado mesmo fechado, então
// fechar tocando fora não perde o rascunho: ele volta na próxima abertura.
export function CapturaPensamento() {
  const [aberta, setAberta] = useState(false)
  return (
    <>
      <button className="botao-captura" onClick={() => setAberta(true)} aria-label="Anotar pensamento">
        <IconeEscrever />
      </button>
      <EditorPensamento aberta={aberta} aoFechar={() => setAberta(false)} />
    </>
  )
}
