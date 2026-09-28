import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { fetchPublic } from '../lib/cloud'
import { useGame, type Game } from '../lib/data'
import { TIER_COLOR, TIERS } from '../lib/constants'
import { computeTraits } from '../lib/traits'
import { normalize, timeAgo } from '../lib/util'
import type { Comp } from '../types'
import { Tip } from './common'
import { ChampIcon, TraitCard, TraitHex } from './game'

interface Props {
  local: Comp[]
  cloud: Comp[] | null
  cloudLoading?: boolean
  signedIn: boolean
  onOpen: (id: string) => void
  onGuide: (id: string) => void
  onNew: () => void
  onImport: (file: File) => void
  onExportAll: () => void
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
  onUpload: (ids: string[]) => void
  onLogin: () => void
}

function matches(c: Comp, nq: string, game: Game) {
  if (!nq) return true
  const units = c.levels[c.finalLevel].units.map((u) => game.champ.get(u.champ)?.name ?? '')
  const traits = computeTraits(c.levels[c.finalLevel].units, game).map((t) => t.name)
  return [c.name, c.playstyle, c.cloud?.author ?? '', ...c.tags, ...units, ...traits].some((s) =>
    normalize(s).includes(nq),
  )
}
const byTier = (a: Comp, b: Comp) => TIERS.indexOf(a.tier) - TIERS.indexOf(b.tier) || b.updatedAt - a.updatedAt

export function Library(p: Props) {
  const game = useGame()
  const [q, setQ] = useState('')
  const [tier, setTier] = useState<string>('')
  const fileRef = useRef<HTMLInputElement>(null)
  const filter = (list: Comp[]) => {
    const nq = normalize(q)
    return list.filter((c) => (!tier || c.tier === tier) && matches(c, nq, game)).sort(byTier)
  }
  const cloudList = useMemo(() => (p.cloud ? filter(p.cloud) : []), [p.cloud, q, tier, game]) // eslint-disable-line react-hooks/exhaustive-deps
  const localList = useMemo(() => filter(p.local), [p.local, q, tier, game]) // eslint-disable-line react-hooks/exhaustive-deps
  const total = (p.cloud?.length ?? 0) + p.local.length

  const card = (c: Comp) => (
    <CompCard
      key={c.id}
      comp={c}
      onOpen={() => p.onGuide(c.id)}
      badge={c.cloud ? <VisibilityBadge isPublic={c.cloud.isPublic} /> : null}
      actions={
        <>
          <button className="btn sm primary" onClick={() => p.onOpen(c.id)}>
            ✎ Editar
          </button>
          <button className="btn sm" onClick={() => p.onGuide(c.id)}>
            👁 Guía
          </button>
          {!c.cloud && p.signedIn && (
            <button className="btn sm" onClick={() => p.onUpload([c.id])} title="Mover a tu cuenta">
              ☁ Subir
            </button>
          )}
          <div className="grow" />
          <button className="icon-btn" title="Duplicar" onClick={() => p.onDuplicate(c.id)}>
            ⧉
          </button>
          <button className="icon-btn danger" title="Eliminar" onClick={() => p.onDelete(c.id)}>
            🗑
          </button>
        </>
      }
    />
  )

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
          <button className="btn primary" onClick={p.onNew}>
            + Nueva composición
          </button>
          <button className="btn" onClick={() => fileRef.current?.click()}>
            ⇧ Importar JSON
          </button>
          <button className="btn ghost" onClick={p.onExportAll} disabled={!total}>
            ⇩ Exportar todo
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) p.onImport(f)
              e.target.value = ''
            }}
          />
        </div>
      </div>

      {p.cloud && !p.signedIn && (
        <div className="banner">
          <span>
            ☁ <b>Inicia sesión</b> para guardar tus composiciones en la nube, verlas desde cualquier dispositivo y
            publicarlas en la comunidad.
          </span>
          <button className="btn sm primary" onClick={p.onLogin}>
            Iniciar sesión
          </button>
        </div>
      )}

      <Filters q={q} setQ={setQ} tier={tier} setTier={setTier} />

      {p.signedIn && (
        <section className="lib-section">
          <h2 className="lib-title">
            ☁ En tu cuenta <span className="muted small">({p.cloud?.length ?? 0})</span>
          </h2>
          {p.cloudLoading ? (
            <div className="splash small-splash">
              <div className="spinner" />
            </div>
          ) : cloudList.length ? (
            <div className="comp-grid">{cloudList.map(card)}</div>
          ) : (
            <p className="empty-note">
              {p.cloud?.length ? 'Ninguna composición coincide.' : 'Aún no tienes composiciones en tu cuenta. Crea una nueva o sube las de este navegador.'}
            </p>
          )}
        </section>
      )}

      {(p.local.length > 0 || !p.signedIn) && (
        <section className="lib-section">
          {p.signedIn && (
            <div className="lib-title-row">
              <h2 className="lib-title">
                💻 En este navegador <span className="muted small">({p.local.length})</span>
              </h2>
              <button className="btn sm" onClick={() => p.onUpload(p.local.map((c) => c.id))}>
                ☁ Subir todas a mi cuenta
              </button>
            </div>
          )}
          {localList.length ? (
            <div className="comp-grid">{localList.map(card)}</div>
          ) : (
            <div className="empty-state panel">
              <h3>{total ? 'Ninguna composición coincide' : 'Aún no tienes composiciones'}</h3>
              <p className="muted">Crea una para empezar a colocar campeones en la arena.</p>
              <button className="btn primary" onClick={p.onNew}>
                + Nueva composición
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  )
}

function Filters({ q, setQ, tier, setTier }: { q: string; setQ: (v: string) => void; tier: string; setTier: (v: string) => void }) {
  return (
    <div className="library-filters">
      <input
        className="input search"
        placeholder="Buscar por nombre, autor, campeón, rasgo o etiqueta…"
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
  )
}

export function VisibilityBadge({ isPublic }: { isPublic: boolean }) {
  return <span className={`vis-badge ${isPublic ? 'pub' : ''}`}>{isPublic ? '🌐 Pública' : '🔒 Privada'}</span>
}

// ---------------- Comunidad ----------------
export function Community({ onGuide, onCopy }: { onGuide: (id: string) => void; onCopy: (c: Comp) => void }) {
  const game = useGame()
  const [q, setQ] = useState('')
  const [tier, setTier] = useState('')
  const [comps, setComps] = useState<Comp[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  // búsqueda en servidor por nombre/autor (con retardo); el resto de filtros en cliente
  useEffect(() => {
    let cancelled = false
    const t = setTimeout(() => {
      fetchPublic(game.set, q)
        .then((list) => !cancelled && (setComps(list), setError(null)))
        .catch((e) => !cancelled && setError(String(e.message ?? e)))
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [q, game.set])

  const list = (comps ?? []).filter((c) => !tier || c.tier === tier)

  return (
    <div className="library">
      <div className="library-head">
        <div>
          <h1>Comunidad</h1>
          <p className="muted">Composiciones públicas de todos los jugadores · Set {game.set}</p>
        </div>
      </div>
      <Filters q={q} setQ={setQ} tier={tier} setTier={setTier} />
      {error ? (
        <p className="empty-note">No se pudo cargar la comunidad: {error}</p>
      ) : comps === null ? (
        <div className="splash small-splash">
          <div className="spinner" />
        </div>
      ) : list.length === 0 ? (
        <div className="empty-state panel">
          <h3>Todavía no hay composiciones públicas{q && ' que coincidan'}</h3>
          <p className="muted">Publica una de las tuyas marcándola como «Pública» en el editor.</p>
        </div>
      ) : (
        <div className="comp-grid">
          {list.map((c) => (
            <CompCard
              key={c.id}
              comp={c}
              onOpen={() => onGuide(c.id)}
              actions={
                <>
                  <button className="btn sm primary" onClick={() => onGuide(c.id)}>
                    👁 Ver guía
                  </button>
                  <button className="btn sm" onClick={() => onCopy(c)}>
                    ⧉ Copiar a mis comps
                  </button>
                </>
              }
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------- Tarjeta ----------------
export function CompCard({
  comp,
  onOpen,
  actions,
  badge,
}: {
  comp: Comp
  onOpen: () => void
  actions: ReactNode
  badge?: ReactNode
}) {
  const game = useGame()
  const units = comp.levels[comp.finalLevel].units
  const traits = useMemo(() => computeTraits(units, game).filter((t) => t.level >= 0), [units, game])
  const sorted = [...units].sort((a, b) => (game.champ.get(a.champ)?.cost ?? 0) - (game.champ.get(b.champ)?.cost ?? 0))
  return (
    <article className="comp-card panel" onClick={onOpen}>
      <header className="comp-card-head">
        <span className="tier-badge" style={{ background: TIER_COLOR[comp.tier] }}>
          {comp.tier}
        </span>
        <div className="grow">
          <h3>{comp.name}</h3>
          <span className="small muted">
            {comp.cloud?.author && <>por {comp.cloud.author} · </>}
            {comp.playstyle} · {comp.difficulty} · {timeAgo(comp.updatedAt)}
          </span>
        </div>
        {badge}
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
        {actions}
      </footer>
    </article>
  )
}
