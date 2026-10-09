import { fecharAviso, useAviso } from '../lib/aviso'

export function Aviso() {
  const aviso = useAviso()
  if (!aviso) return null
  return (
    <div className="aviso-barra" role="status" key={aviso.id}>
      <span>{aviso.texto}</span>
      {aviso.desfazer && (
        <button
          className="aviso-desfazer"
          onClick={() => {
            void aviso.desfazer?.()
            fecharAviso()
          }}
        >
          desfazer
        </button>
      )}
    </div>
  )
}
