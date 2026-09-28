import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Augment, Champion, GameData, Item, Trait } from '../types'

export interface Game extends GameData {
  champ: Map<string, Champion>
  trait: Map<string, Trait>
  item: Map<string, Item>
  augment: Map<string, Augment>
}

const Ctx = createContext<Game | null>(null)

export function GameDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<GameData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/set.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(setData)
      .catch((e) => setError(String(e)))
  }, [])

  const game = useMemo<Game | null>(() => {
    if (!data) return null
    return {
      ...data,
      champ: new Map(data.champions.map((c) => [c.api, c])),
      trait: new Map(data.traits.map((t) => [t.name, t])),
      item: new Map(data.items.map((i) => [i.api, i])),
      augment: new Map(data.augments.map((a) => [a.api, a])),
    }
  }, [data])

  if (error)
    return (
      <div className="splash">
        <h1>No se pudieron cargar los datos</h1>
        <p>{error}</p>
        <p>
          Ejecuta <code>npm run data</code> para generar <code>public/data/set.json</code>.
        </p>
      </div>
    )
  if (!game)
    return (
      <div className="splash">
        <div className="spinner" />
        <p>Cargando datos del set…</p>
      </div>
    )
  return <Ctx.Provider value={game}>{children}</Ctx.Provider>
}

export function useGame(): Game {
  const g = useContext(Ctx)
  if (!g) throw new Error('useGame fuera de GameDataProvider')
  return g
}
