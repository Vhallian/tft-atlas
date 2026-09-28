import type { Placement } from '../types'
import type { Game } from './data'

export interface ActiveTrait {
  name: string
  count: number
  /** índice del último umbral alcanzado, -1 si ninguno */
  level: number
  style: number
  breakpoints: number[]
  /** unidades que aportan (api de campeón) */
  champs: string[]
}

/** Cuenta rasgos contando cada campeón una sola vez (como en el juego) y sumando emblemas. */
export function computeTraits(units: Placement[], game: Game): ActiveTrait[] {
  const byTrait = new Map<string, Set<string>>()
  const add = (trait: string, key: string) => {
    if (!byTrait.has(trait)) byTrait.set(trait, new Set())
    byTrait.get(trait)!.add(key)
  }
  for (const u of units) {
    const c = game.champ.get(u.champ)
    if (!c) continue
    const own = new Set(c.traits)
    c.traits.forEach((t) => add(t, c.api))
    for (const it of u.items) {
      const item = game.item.get(it)
      if (item?.category === 'emblem' && item.trait && !own.has(item.trait)) {
        own.add(item.trait)
        // cada emblema cuenta aunque el campeón esté repetido
        add(item.trait, `${c.api}@${u.row},${u.col}`)
      }
    }
  }
  const out: ActiveTrait[] = []
  for (const [name, set] of byTrait) {
    const t = game.trait.get(name)
    if (!t) continue
    const count = set.size
    let level = -1
    t.effects.forEach((e, i) => {
      if (count >= e.min) level = i
    })
    out.push({
      name,
      count,
      level,
      style: level >= 0 ? t.effects[level].style : 0,
      breakpoints: t.effects.map((e) => e.min),
      champs: [...set].map((k) => k.split('@')[0]),
    })
  }
  const rank = (s: number) => ({ 6: 6, 5: 5, 4: 3.5, 3: 3, 2: 2, 1: 1, 0: 0 })[s] ?? 0
  return out.sort(
    (a, b) => rank(b.style) - rank(a.style) || b.count - a.count || a.name.localeCompare(b.name, 'es'),
  )
}
