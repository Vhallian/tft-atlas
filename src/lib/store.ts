import { useCallback, useEffect, useState } from 'react'
import type { Comp, LevelPlan } from '../types'
import { DEFAULT_STAGE, LEVELS } from './constants'
import { uid } from './util'

const KEY = 'tft-atlas:comps:v1'

export function emptyLevels(): Record<number, LevelPlan> {
  return Object.fromEntries(LEVELS.map((l) => [l, { units: [], stage: DEFAULT_STAGE[l], note: '' }]))
}

export function newComp(set: number, partial: Partial<Comp> = {}): Comp {
  const now = Date.now()
  return {
    id: uid(),
    name: 'Nueva composición',
    set,
    tier: 'A',
    playstyle: 'Fast 8',
    difficulty: 'Media',
    tags: [],
    finalLevel: 8,
    levels: emptyLevels(),
    builds: [],
    itemPriority: [],
    augments: [],
    substitutions: [],
    strategy: { summary: '', early: '', mid: '', late: '', positioning: '', conditions: '', tips: '' },
    createdAt: now,
    updatedAt: now,
    ...partial,
  }
}

/** Rellena campos que falten (comps importadas o de versiones antiguas) */
export function sanitize(c: Partial<Comp>, set: number): Comp {
  const base = newComp(set)
  const levels = { ...base.levels }
  for (const l of LEVELS) {
    const src = c.levels?.[l]
    if (src) levels[l] = { ...levels[l], ...src, units: (src.units ?? []).map((u) => ({ ...u, items: u.items ?? [] })) }
  }
  return {
    ...base,
    ...c,
    id: c.id ?? base.id,
    levels,
    strategy: { ...base.strategy, ...(c.strategy ?? {}) },
    builds: c.builds ?? [],
    augments: c.augments ?? [],
    substitutions: c.substitutions ?? [],
    itemPriority: c.itemPriority ?? [],
    tags: c.tags ?? [],
  }
}

function read(): Comp[] | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}
function write(comps: Comp[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(comps))
  } catch {
    /* almacenamiento lleno o bloqueado */
  }
}

export function useComps(set: number, seed: () => Comp[]) {
  const [comps, setComps] = useState<Comp[]>(() => {
    const saved = read()
    return saved ? saved.map((c) => sanitize(c, set)) : seed()
  })

  useEffect(() => write(comps), [comps])

  // sincroniza entre pestañas
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) {
        const saved = read()
        if (saved) setComps(saved.map((c) => sanitize(c, set)))
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [set])

  const update = useCallback((id: string, fn: (c: Comp) => Comp) => {
    setComps((all) => all.map((c) => (c.id === id ? { ...fn(c), updatedAt: Date.now() } : c)))
  }, [])

  const add = useCallback((c: Comp) => {
    setComps((all) => [c, ...all])
    return c.id
  }, [])

  const remove = useCallback((id: string) => setComps((all) => all.filter((c) => c.id !== id)), [])

  const duplicate = useCallback(
    (id: string) => {
      const src = comps.find((c) => c.id === id)
      if (!src) return null
      const copy: Comp = {
        ...structuredClone(src),
        id: uid(),
        name: src.name + ' (copia)',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      setComps((all) => [copy, ...all])
      return copy.id
    },
    [comps],
  )

  return { comps, update, add, remove, duplicate }
}
