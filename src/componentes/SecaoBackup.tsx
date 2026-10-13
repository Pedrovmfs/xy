import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { haQuantoTempo, paraDataISO } from '../lib/datas'
import { avisar } from '../lib/aviso'
import {
  exportarBackup,
  lerBackup,
  META_ULTIMO_BACKUP,
  restaurarBackup,
  resumoBackup,
  substituirTudo,
  type Backup,
} from '../lib/backup'
import { Folha } from './Folha'

const formatar = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })

export function SecaoBackup() {
  const ultimo = useLiveQuery(async () => (await db.meta.get(META_ULTIMO_BACKUP))?.value as string | undefined)
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState('')
  const [paraImportar, setParaImportar] = useState<Backup | null>(null)
  const seletor = useRef<HTMLInputElement>(null)

  async function exportar() {
    setOcupado(true)
    setErro('')
    try {
      if ((await exportarBackup()) === 'ok') avisar('Backup pronto')
    } catch {
      setErro('Não deu para gerar o backup. Tente de novo.')
    } finally {
      setOcupado(false)
    }
  }

  async function escolherArquivo(arquivo: File | undefined) {
    if (!arquivo) return
    setErro('')
    try {
      setParaImportar(lerBackup(await arquivo.text()))
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      if (seletor.current) seletor.current.value = '' // permite escolher o mesmo arquivo de novo
    }
  }

  async function importar() {
    if (!paraImportar) return
    setOcupado(true)
    try {
      const antes = await restaurarBackup(paraImportar)
      setParaImportar(null)
      avisar('Backup importado', () => substituirTudo(antes))
    } catch {
      setErro('Não deu para importar. Seus dados continuam como estavam.')
    } finally {
      setOcupado(false)
    }
  }

  const resumo = paraImportar ? resumoBackup(paraImportar) : null

  return (
    <section>
      <p className="texto-explicativo">
        Seus dados ficam só neste iPhone. O backup é um arquivo com tudo: guarde no app Arquivos (iCloud Drive) ou
        mande para você mesmo. Com ele dá para recuperar tudo num celular novo.
      </p>

      <p className="backup-ultimo">
        {ultimo === undefined
          ? 'Nenhum backup feito ainda.'
          : `Último backup: ${haQuantoTempo(paraDataISO(new Date(ultimo)))} (${formatar(ultimo)}).`}
      </p>

      <button className="botao-principal" onClick={exportar} disabled={ocupado}>
        Exportar backup
      </button>
      <button className="botao-secundario" onClick={() => seletor.current?.click()} disabled={ocupado}>
        Importar backup
      </button>
      <input
        ref={seletor}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => void escolherArquivo(e.target.files?.[0])}
      />
      {erro && <p className="aviso">{erro}</p>}

      {resumo && (
        <Folha aberta aoFechar={() => setParaImportar(null)} titulo="Importar backup">
          <p className="folha-sub">Backup de {formatar(resumo.exportadoEm)}</p>
          <ul className="resumo-backup">
            {resumo.linhas.map((l) => (
              <li key={l.nome}>
                <span>{l.nome}</span>
                <span>{l.qtd}</span>
              </li>
            ))}
          </ul>
          <p className="nota-discreta">
            Os dados atuais deste iPhone serão <strong>substituídos</strong> pelos do backup. Logo depois aparece um
            “desfazer”, se mudar de ideia.
          </p>
          <button className="botao-principal" onClick={importar} disabled={ocupado}>
            Substituir pelos dados do backup
          </button>
        </Folha>
      )}
    </section>
  )
}
