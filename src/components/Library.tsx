import { useMemo, useRef, useState } from 'react'
import { useGame } from '../lib/data'
import { TIER_COLOR, TIERS } from '../lib/constants'
import { computeTraits } from '../lib/traits'
import { normalize, timeAgo } from '../lib/util'
import type { Comp } from '../types'
import { Tip } from './common'
import { ChampIcon, TraitCard, TraitHex } from './game'

interface Props {
  comps: Comp[]
  onOpen: (id: string) => void
  onGuide: (id: string) => void
  onNew: () => void
  onImport: (file: File) => void
  onExportAll: () => void
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
}

export function Library({ comps, onOpen, onGuide, onNew, onImport, onExportAll, onDuplicate, onDelete }: Props) {
  const game = useGame()
  const [q, setQ] = useState('')
  const [tier, setTier] = useState<string>('')
  const fileRef = useRef<HTMLInputElement>(null)

  const list = useMemo(() => {
    const nq = normalize(q)
    return comps
      .filter((c) => !tier || c.tier === tier)
      .filter((c) => {
        if (!nq) return true
        const units = c.levels[c.finalLevel].units.map((u) => game.champ.get(u.champ)?.name ?? '')
        const traits = computeTraits(c.levels[c.finalLevel].units, game).map((t) => t.name)
        return [c.name, c.playstyle, ...c.tags, ...units, ...traits].some((s) => normalize(s).includes(nq))
      })
      .sort((a, b) => TIERS.indexOf(a.tier) - TIERS.indexOf(b.tier) || b.updatedAt - a.updatedAt)
  }, [comps, q, tier, game])

  return (
    <div className="library">
      <div className="library-head">
        <div>
          <h1>Mis composiciones</h1>
          <p className="muted">
            Set {game.set} · {game.setName} · {game.champions.length} campeones · {game.augments.length} aumentos
          </p>
        </div>
        <div className="library-actions">
          <button className="btn primary" onClick={onNew}>
            + Nueva composición
          </button>
          <button className="btn" onClick={() => fileRef.current?.click()}>
            ⇧ Importar JSON
          </button>
          <button className="btn ghost" onClick={onExportAll} disabled={!comps.length}>
            ⇩ Exportar todo
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onImport(f)
              e.target.value = ''
            }}
          />
        </div>
      </div>

      <div className="library-filters">
        <input
          className="input search"
          placeholder="Buscar por nombre, campeón, rasgo o etiqueta…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="seg seg-sm">
          <button className={!tier ? 'on' : ''} onClick={() => setTier('')}>
            Todas
          </button>
          {TIERS.map((t) => (
            <button key={t} className={tier === t ? 'on' : ''} onClick={() => setTier(t)} style={{ color: tier === t ? undefined : TIER_COLOR[t] }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <div className="empty-state panel">
          <h3>{comps.length ? 'Ninguna composición coincide' : 'Aún no tienes composiciones'}</h3>
          <p className="muted">Crea una para empezar a colocar campeones en la arena.</p>
          <button className="btn primary" onClick={onNew}>
            + Nueva composición
          </button>
        </div>
      ) : (
        <div className="comp-grid">
          {list.map((c) => (
            <CompCard
              key={c.id}
              comp={c}
              onOpen={() => onOpen(c.id)}
              onGuide={() => onGuide(c.id)}
              onDuplicate={() => onDuplicate(c.id)}
              onDelete={() => onDelete(c.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function CompCard({
  comp,
  onOpen,
  onGuide,
  onDuplicate,
  onDelete,
}: {
  comp: Comp
  onOpen: () => void
  onGuide: () => void
  onDuplicate: () => void
  onDelete: () => void
}) {
  const game = useGame()
  const units = comp.levels[comp.finalLevel].units
  const traits = useMemo(() => computeTraits(units, game).filter((t) => t.level >= 0), [units, game])
  const sorted = [...units].sort(
    (a, b) => (game.champ.get(a.champ)?.cost ?? 0) - (game.champ.get(b.champ)?.cost ?? 0),
  )
  return (
    <article className="comp-card panel" onClick={onGuide}>
      <header className="comp-card-head">
        <span className="tier-badge" style={{ background: TIER_COLOR[comp.tier] }}>
          {comp.tier}
        </span>
        <div className="grow">
          <h3>{comp.name}</h3>
          <span className="small muted">
            {comp.playstyle} · {comp.difficulty} · {timeAgo(comp.updatedAt)}
          </span>
        </div>
      </header>
      <div className="comp-card-traits">
        {traits.slice(0, 8).map((t) => (
          <Tip key={t.name} content={() => <TraitCard name={t.name} active={t} />}>
            <span className="trait-chip">
              <TraitHex icon={game.trait.get(t.name)?.icon ?? null} style={t.style} name={t.name} size={20} />
              {t.count}
            </span>
          </Tip>
        ))}
      </div>
      <div className="comp-card-units">
        {sorted.length ? (
          sorted.map((u, i) => <ChampIcon key={i} api={u.champ} size={40} stars={u.stars} items={u.items} carry={u.carry} />)
        ) : (
          <span className="muted small">Tablero final vacío</span>
        )}
      </div>
      <footer className="comp-card-foot" onClick={(e) => e.stopPropagation()}>
        <button className="btn sm primary" onClick={onOpen}>
          ✎ Editar
        </button>
        <button className="btn sm" onClick={onGuide}>
          👁 Guía
        </button>
        <div className="grow" />
        <button className="icon-btn" title="Duplicar" onClick={onDuplicate}>
          ⧉
        </button>
        <button className="icon-btn danger" title="Eliminar" onClick={onDelete}>
          🗑
        </button>
      </footer>
    </article>
  )
}
