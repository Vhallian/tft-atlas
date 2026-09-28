import type { Difficulty, Playstyle, Tier } from '../types'

export const ROWS = 4
export const COLS = 7
export const LEVELS = [3, 4, 5, 6, 7, 8, 9, 10] as const

export const COST_COLOR: Record<number, string> = {
  1: '#8a929b',
  2: '#11b288',
  3: '#207ac7',
  4: '#c440da',
  5: '#ffb93b',
}

/** Probabilidades de tienda por nivel (Set 18). Fuente: esportstales.com — revisa si cambian en un parche. */
export const SHOP_ODDS: Record<number, [number, number, number, number, number]> = {
  1: [100, 0, 0, 0, 0],
  2: [100, 0, 0, 0, 0],
  3: [75, 25, 0, 0, 0],
  4: [55, 30, 15, 0, 0],
  5: [45, 33, 20, 2, 0],
  6: [30, 40, 25, 5, 0],
  7: [16, 30, 43, 10, 1],
  8: [15, 20, 32, 30, 3],
  9: [10, 17, 25, 33, 15],
  10: [5, 10, 20, 40, 25],
}
/** Copias de cada campeón en la bolsa compartida, por coste */
export const POOL_SIZE: Record<number, number> = { 1: 30, 2: 25, 3: 18, 4: 10, 5: 9 }
/** Experiencia para pasar del nivel anterior a este */
export const XP_TO_LEVEL: Record<number, number> = { 3: 2, 4: 6, 5: 10, 6: 20, 7: 36, 8: 48, 9: 76, 10: 84 }

/** Ritmo de subida estándar (orientativo) */
export const DEFAULT_STAGE: Record<number, string> = {
  3: '1-4',
  4: '2-1',
  5: '2-5',
  6: '3-2',
  7: '4-1',
  8: '4-2',
  9: '5-1',
  10: '5-5',
}
export const LEVEL_HINT: Record<number, string> = {
  3: 'Mejores parejas del carrusel/primeras tiendas. Prioriza unidades de 1–2 de coste que se mantengan.',
  4: 'Juega lo más fuerte que tengas. Primer aumento en 2-1.',
  5: 'Estabiliza la racha. Busca parejas de 2★ de coste 1–2.',
  6: 'Momento típico de reroll para comps de coste 1–2. Segundo aumento en 3-2.',
  7: 'Buen nivel para reroll de coste 3 y para estabilizar antes de 4-2.',
  8: 'Punto de roll estándar (4-2 / 4-5). Busca las unidades de coste 4 principales.',
  9: 'Añade legendarios y capitaliza rasgos verticales.',
  10: 'Solo si tienes economía de sobra: unidades de coste 5 a 2★.',
}

export const TRAIT_STYLE: Record<number, { name: string; bg: string; fg: string }> = {
  0: { name: 'Inactivo', bg: '#2a2f3a', fg: '#7d8595' },
  1: { name: 'Bronce', bg: '#a0715e', fg: '#1b0f0a' },
  2: { name: 'Plata', bg: '#8fa3b3', fg: '#0d1318' },
  3: { name: 'Plata', bg: '#8fa3b3', fg: '#0d1318' },
  4: { name: 'Único', bg: '#d86a4e', fg: '#1b0a05' },
  5: { name: 'Oro', bg: '#e6b54a', fg: '#1d1403' },
  6: { name: 'Prismático', bg: 'linear-gradient(135deg,#8ff3ff,#d38bff 45%,#ffe08a)', fg: '#150a22' },
}

export const TIER_COLOR: Record<Tier, string> = {
  S: '#ff7e7e',
  A: '#ffbf7f',
  B: '#ffdf7f',
  C: '#bfff7f',
  X: '#8a92a3',
}
export const PLAYSTYLES: Playstyle[] = [
  'Estándar',
  'Fast 8',
  'Fast 9',
  'Reroll nivel 5',
  'Reroll nivel 6',
  'Reroll nivel 7',
  'Racha de victorias',
  'Racha de derrotas',
]
export const DIFFICULTIES: Difficulty[] = ['Fácil', 'Media', 'Difícil']
export const TIERS: Tier[] = ['S', 'A', 'B', 'C', 'X']

export const AUGMENT_TIER: Record<number, { name: string; color: string }> = {
  0: { name: 'Otros', color: '#8a92a3' },
  1: { name: 'Plata', color: '#b9c7d6' },
  2: { name: 'Oro', color: '#f0c05a' },
  3: { name: 'Prismático', color: '#d7a8ff' },
}

export const ITEM_CATEGORY_LABEL = {
  completed: 'Completos',
  component: 'Componentes',
  emblem: 'Emblemas',
  artifact: 'Artefactos',
  radiant: 'Radiantes',
  support: 'Apoyo',
} as const

/** Multiplicador de vida y daño por estrellas */
export const STAR_MULT: Record<number, number> = { 1: 1, 2: 1.8, 3: 3.24 }
