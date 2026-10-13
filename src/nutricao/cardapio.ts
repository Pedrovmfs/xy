import type { Transaction } from 'dexie'
import type { Food } from '../db'

// Cardápio inicial: as opções do docs/dieta.md (valores aproximados de lá).
// O agrupamento é só para achar rápido: qualquer opção vale a qualquer hora.

export const CATEGORIAS = ['almoço', 'jantar', 'pré-treino', 'ceia', 'fechadores', 'plano B', 'extras']

// [nome, kcal, proteína (g)]
const CARDAPIO: Record<string, [string, number, number][]> = {
  almoço: [
    ['Arroz 200 g + peito de frango 300 g', 615, 70],
    ['Arroz 200 g + contrafilé 300 g (sem a gordura)', 725, 77],
    ['Arroz 200 g + coxão mole moído 300 g', 765, 69],
    ['Arroz 200 g + linguiça fininha 200 g', 710, 37],
    ['Arroz 200 g + frango desfiado 220 g (do domingo)', 615, 74],
    ['Feijão, 1 concha', 75, 5],
  ],
  jantar: [
    ['Sanduíches de frango desfiado 150 g com mussarela', 595, 66],
    ['Sanduíches de frango desfiado 200 g com mussarela (reforçado)', 680, 80],
    ['Sanduíches de carne moída 130 g com mussarela', 635, 61],
    ['Sanduíches de bife 140 g com mussarela', 625, 69],
    ['Pizza de pão de forma (molho, mussarela, frango)', 615, 63],
    ['Wrap (Rap10) de frango com mussarela', 585, 60],
    ['Tapioca de frango ou carne moída com queijo', 470, 40],
    ['Sobra do almoço (metade da proteína com arroz)', 500, 48],
    ['Frango cremoso no pote, grande, + 2 fatias de pão', 605, 79],
    ['Quesadilla: 2 Rap10 com frango e mussarela', 615, 62],
    ['Cachorro-quente de frango com mussarela', 645, 63],
  ],
  'pré-treino': [
    ['Sanduíche de frango desfiado 100 g com mussarela', 390, 44],
    ['Wrap (Rap10) de frango com mussarela, frio', 350, 39],
    ['Frango cremoso no pote (100 g) + 1 pão', 405, 41],
    ['Creme de banana (banana + whey + Snow Flakes)', 285, 22],
    ['Creme de whey com Snow Flakes + 1 banana', 320, 23],
    ['Bolo de caneca de banana com canela', 280, 28],
    ['Tigela padrão (iogurte, whey, Snow Flakes, chia)', 380, 30],
    ['Banana + café (dia sem fome)', 90, 1],
  ],
  ceia: [
    ['Frango cremoso no pote (150 g + requeijão + mussarela)', 365, 55],
    ['Carne moída 100 g + mussarela no pote', 320, 40],
    ['Sanduíche de frango com mussarela', 300, 35],
    ['Creme de whey com Snow Flakes (de colher)', 195, 21],
    ['Romeu e julieta (pão, mussarela, doce de leite)', 290, 14],
  ],
  fechadores: [
    ['Whey com água (1 dose)', 120, 20],
    ['Creme de whey (só whey)', 120, 20],
    ['+50 g de frango desfiado', 80, 16],
    ['+50 g de proteína crua no almoço', 72, 11],
  ],
  'plano B': [
    ['Ovos cremosos no pote (3 ovos, requeijão, mussarela)', 370, 29],
  ],
  extras: [
    ['Molho (requeijão, barbecue, ketchup ou tomate)', 35, 0],
    ['Maionese, 1 colher', 100, 0],
  ],
}

export function cardapioInicial(): Food[] {
  const agora = new Date().toISOString()
  let ordem = 0
  return Object.entries(CARDAPIO).flatMap(([category, itens]) =>
    itens.map(([name, kcal, protein]) => ({ id: `food-${ordem}`, name, kcal, protein, category, order: ordem++, createdAt: agora })),
  )
}

export async function semearCardapio(tx: Transaction) {
  if ((await tx.table('foods').count()) > 0) return
  await tx.table('foods').bulkAdd(cardapioInicial())
}

/** Metas do dia (meta['nutricao:metas']): proteína é uma faixa, calorias um teto. */
export interface MetasNutricao {
  proteinaMin: number
  proteinaMax: number
  kcalMax: number
}
export const METAS_NUTRICAO: MetasNutricao = { proteinaMin: 190, proteinaMax: 200, kcalMax: 1960 }
