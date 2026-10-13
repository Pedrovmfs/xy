import { db, type Area, type RoutineItem } from '../db'
import { exerciciosIniciais, METAS_PADRAO, treinosIniciais } from '../treino/semente'
import { hoje, somarDias } from './datas'

// Backup: um arquivo JSON com todas as tabelas do banco.
//
// Formato:
//   { app: 'xy', versao: <versão do schema do Dexie>, exportadoEm: ISO, dados: { tabela: [...] } }
//
// Todas as tabelas entram automaticamente (db.tables), então tabelas novas no futuro já
// vão junto sem precisar lembrar de mexer aqui. Se um dia o schema mudar com migração,
// `migrar()` abaixo deve converter backups de versões antigas para o formato atual.

export interface Backup {
  app: 'xy'
  versao: number
  exportadoEm: string
  dados: Record<string, unknown[]>
}

export const META_ULTIMO_BACKUP = 'ultimoBackup'
export const META_LEMBRETE_ADIADO = 'lembreteBackupAdiadoAte'
/** chaves de meta que são do aparelho, não dos dados: não viajam no backup */
const META_DO_APARELHO = [META_LEMBRETE_ADIADO]

export async function gerarBackup(): Promise<Backup> {
  const dados: Record<string, unknown[]> = {}
  await db.transaction('r', db.tables, async () => {
    for (const tabela of db.tables) {
      const linhas = await tabela.toArray()
      dados[tabela.name] =
        tabela.name === 'meta'
          ? (linhas as { key: string }[]).filter((m) => !META_DO_APARELHO.includes(m.key))
          : linhas
    }
  })
  return { app: 'xy', versao: db.verno, exportadoEm: new Date().toISOString(), dados }
}

/**
 * Gera o arquivo e entrega pelo menu de compartilhar do iPhone (Salvar em Arquivos,
 * AirDrop…). Se o navegador não tiver esse menu, baixa o arquivo direto.
 */
export async function exportarBackup(): Promise<'ok' | 'cancelado'> {
  const backup = await gerarBackup()
  const nome = `xy-backup-${hoje()}.json`
  const arquivo = new File([JSON.stringify(backup)], nome, { type: 'application/json' })

  let entregue = false
  if (navigator.canShare?.({ files: [arquivo] })) {
    try {
      await navigator.share({ files: [arquivo], title: nome })
      entregue = true
    } catch (e) {
      // a pessoa fechou o menu sem escolher nada
      if ((e as DOMException).name === 'AbortError') return 'cancelado'
      // outro erro (ex.: o navegador não deixou compartilhar): cai para o download
    }
  }
  if (!entregue) {
    const url = URL.createObjectURL(arquivo)
    const a = document.createElement('a')
    a.href = url
    a.download = nome
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }
  await db.meta.put({ key: META_ULTIMO_BACKUP, value: backup.exportadoEm })
  return 'ok'
}

/** Lê e confere um arquivo de backup. Lança Error com mensagem em português se não servir. */
export function lerBackup(texto: string): Backup {
  let b: Partial<Backup>
  try {
    b = JSON.parse(texto)
  } catch {
    throw new Error('Esse arquivo não é um backup do xy (não é um JSON válido).')
  }
  if (b?.app !== 'xy' || typeof b.versao !== 'number' || !b.dados || typeof b.dados !== 'object') {
    throw new Error('Esse arquivo não é um backup do xy.')
  }
  if (b.versao > db.verno) {
    throw new Error('Esse backup veio de uma versão mais nova do app. Atualize o app (feche e abra de novo) e tente outra vez.')
  }
  return migrar(b as Backup)
}

/**
 * Converte backups de versões antigas do schema para o formato atual. Faz o mesmo
 * que as funções .upgrade() do db.ts fazem no aparelho, só que no arquivo.
 */
function migrar(b: Backup): Backup {
  const dados = { ...b.dados }
  if (b.versao < 2) {
    // v2: treino. Backup antigo não tem as tabelas: entram os treinos iniciais.
    dados.exercises = exerciciosIniciais()
    dados.workouts = treinosIniciais()
    dados.sessions = []
    dados.routine = (dados.routine as RoutineItem[] | undefined)?.map((r) =>
      r.areaId === 'treino' ? { ...r, opensWorkout: true } : r,
    ) ?? []
  }
  if (b.versao < 3) {
    // v3: cardio (vazio) e meta de treinos sai da área Treino para as metas do treino
    dados.cardio = []
    const areas = (dados.areas as Area[] | undefined) ?? []
    const treino = areas.find((a) => a.id === 'treino')
    const meta = (dados.meta as { key: string; value: unknown }[] | undefined) ?? []
    if (!meta.some((m) => m.key === 'treino:metas')) {
      dados.meta = [
        ...meta,
        { key: 'treino:metas', value: { ...METAS_PADRAO, treinosPorSemana: treino?.weeklyGoal ?? METAS_PADRAO.treinosPorSemana } },
      ]
    }
    dados.areas = areas.map((a) => (a.id === 'treino' ? { ...a, weeklyGoal: undefined } : a))
  }
  return { ...b, versao: db.verno, dados }
}

export function resumoBackup(b: Backup) {
  const n = (t: string) => b.dados[t]?.length ?? 0
  return {
    exportadoEm: b.exportadoEm,
    linhas: [
      { nome: 'marcações e notas de itens', qtd: n('entries') },
      { nome: 'pensamentos', qtd: n('thoughts') },
      { nome: 'itens da rotina', qtd: n('routine') },
      { nome: 'avulsos', qtd: n('oneoffs') },
      { nome: 'hábitos', qtd: n('habits') },
      { nome: 'marcações de hábitos', qtd: n('habitLogs') },
      { nome: 'áreas', qtd: n('areas') },
      { nome: 'comentários do dia', qtd: n('days') },
    ],
  }
}

/**
 * Substitui todos os dados pelos do backup, numa transação só (ou entra tudo, ou nada).
 * Devolve uma cópia do que existia antes, para o "desfazer".
 */
export async function restaurarBackup(b: Backup): Promise<Backup> {
  const antes = await gerarBackup()
  await substituirTudo(b)
  return antes
}

export async function substituirTudo(b: Backup) {
  await db.transaction('rw', db.tables, async () => {
    for (const tabela of db.tables) {
      // o adiamento do lembrete é do aparelho: continua como estava
      const preservar =
        tabela.name === 'meta' ? await db.meta.where('key').anyOf(META_DO_APARELHO).toArray() : []
      await tabela.clear()
      const linhas = b.dados[tabela.name]
      if (Array.isArray(linhas) && linhas.length) await tabela.bulkPut(linhas)
      if (preservar.length) await db.meta.bulkPut(preservar)
    }
  })
}

/** Lembrete aparece com 7 dias sem backup (ou nunca feito, depois de 3 dias de uso). */
export async function precisaLembrarBackup(): Promise<{ dias: number | null } | null> {
  const [ultimo, adiado, criado] = await Promise.all([
    db.meta.get(META_ULTIMO_BACKUP),
    db.meta.get(META_LEMBRETE_ADIADO),
    db.meta.get('criadoEm'),
  ])
  const h = hoje()
  if (adiado && (adiado.value as string) > h) return null
  if (ultimo) {
    const dias = Math.floor((Date.now() - new Date(ultimo.value as string).getTime()) / 86_400_000)
    return dias >= 7 ? { dias } : null
  }
  const usoDesde = criado ? new Date(criado.value as string).getTime() : Date.now()
  return Date.now() - usoDesde >= 3 * 86_400_000 ? { dias: null } : null
}

export async function adiarLembreteBackup() {
  await db.meta.put({ key: META_LEMBRETE_ADIADO, value: somarDias(hoje(), 3) })
}
