// ---------- Datos del juego (generados por scripts/fetch-data.mjs) ----------
export interface TraitEffect {
  min: number
  max: number
  /** 1 bronce, 3 plata, 4 único, 5 oro, 6 prismático */
  style: number
}
export interface Trait {
  api: string
  name: string
  icon: string | null
  desc: string
  effects: TraitEffect[]
}
export interface ChampionStats {
  hp: number
  ad: number
  as: number
  armor: number
  mr: number
  mana: number
  initialMana: number
  range: number
  crit: number
  critMult: number
}
export interface Champion {
  api: string
  name: string
  cost: number
  traits: string[]
  role: string | null
  icon: string | null
  splash: string | null
  stats: ChampionStats
  ability: { name: string; icon: string | null; desc: string }
}
export type ItemCategory = 'component' | 'completed' | 'emblem' | 'artifact' | 'radiant' | 'support'
export interface Item {
  api: string
  name: string
  icon: string | null
  category: ItemCategory
  from: string[]
  desc: string
  stats: string[]
  trait?: string
}
export interface Augment {
  api: string
  name: string
  icon: string | null
  /** 1 plata, 2 oro, 3 prismático, 0 desconocido */
  tier: number
  desc: string
  traits: string[]
}
export interface GameData {
  set: number
  setName: string
  lang: string
  version: string | null
  generatedAt: string
  traits: Trait[]
  champions: Champion[]
  items: Item[]
  augments: Augment[]
}

// ---------- Composiciones del usuario ----------
export interface Placement {
  champ: string
  /** 0 = primera línea (arriba), 3 = retaguardia */
  row: number
  col: number
  stars: 1 | 2 | 3
  items: string[]
  carry?: boolean
}

export interface LevelPlan {
  units: Placement[]
  stage: string
  note: string
}

export interface ItemVariant {
  id: string
  label: string
  items: string[]
}
export interface CarryBuild {
  champ: string
  variants: ItemVariant[]
  note: string
}

export interface AugmentPick {
  api: string
  note: string
  priority: 'core' | 'good' | 'situational'
}

export interface Substitution {
  id: string
  from: string
  to: string
  note: string
}

export interface Strategy {
  summary: string
  early: string
  mid: string
  late: string
  positioning: string
  conditions: string
  tips: string
}

export type Playstyle =
  | 'Estándar'
  | 'Fast 8'
  | 'Fast 9'
  | 'Reroll nivel 5'
  | 'Reroll nivel 6'
  | 'Reroll nivel 7'
  | 'Racha de victorias'
  | 'Racha de derrotas'
export type Difficulty = 'Fácil' | 'Media' | 'Difícil'
export type Tier = 'S' | 'A' | 'B' | 'C' | 'X'

export interface Comp {
  id: string
  name: string
  set: number
  tier: Tier
  playstyle: Playstyle
  difficulty: Difficulty
  tags: string[]
  /** nivel que representa la composición final */
  finalLevel: number
  levels: Record<number, LevelPlan>
  builds: CarryBuild[]
  itemPriority: string[]
  augments: AugmentPick[]
  substitutions: Substitution[]
  strategy: Strategy
  createdAt: number
  updatedAt: number
  /** Solo en memoria: presente si la comp vive en la base de datos */
  cloud?: CloudMeta
}

export interface CloudMeta {
  owner: string
  author: string
  isPublic: boolean
}
