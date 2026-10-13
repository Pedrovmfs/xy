import { useLiveQuery } from 'dexie-react-hooks'
import { adiarLembreteBackup, exportarBackup, precisaLembrarBackup } from '../lib/backup'
import { avisar } from '../lib/aviso'

// Linha pequena no fim do Hoje quando faz tempo sem backup. "depois" esconde por 3 dias.
// Nada de alerta: é só uma lembrança, e ignorar não tem consequência.
export function LembreteBackup() {
  const lembrar = useLiveQuery(precisaLembrarBackup)
  if (!lembrar) return null

  return (
    <div className="lembrete-backup">
      <span>{lembrar.dias === null ? 'nenhum backup feito ainda' : `último backup há ${lembrar.dias} dias`}</span>
      <button
        className="link"
        onClick={async () => {
          if ((await exportarBackup()) === 'ok') avisar('Backup pronto')
        }}
      >
        fazer agora
      </button>
      <button className="lembrete-depois" onClick={() => void adiarLembreteBackup()}>
        depois
      </button>
    </div>
  )
}
