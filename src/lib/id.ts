// crypto.randomUUID só existe em "contexto seguro" (https ou localhost). Testando pelo
// IP da rede local (http://192.168...) ele não existe, então há um plano B.
export function novoId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto && window.isSecureContext) {
    return crypto.randomUUID()
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
}
