import { useMemo, useState } from 'react'
import { useGame } from '../lib/data'
import { AUGMENT_TIER } from '../lib/constants'
import type { AugmentPick, Comp } from '../types'
import { Img, Rich } from './common'
import { AugmentIcon } from './game'
import { AugmentPicker } from './Pickers'

const PRIORITY: Record<AugmentPick['priority'], { label: string; desc: string }> = {
  core: { label: 'Clave', desc: 'Cógelo siempre que salga' },
  good: { label: 'Bueno', desc: 'Buena opción en la mayoría de partidas' },
  situational: { label: 'Situacional', desc: 'Depende de objetos, racha o lobby' },
}

export function AugmentsTab({ comp, update, traitNames }: { comp: Comp; update: (fn: (c: Comp) => Comp) => void; traitNames: string[] }) {
  const game = useGame()
  const [picking, setPicking] = useState(false)
  const [groupBy, setGroupBy] = useState<'priority' | 'tier'>('priority')
  const exclude = useMemo(() => new Set(comp.augments.map((a) => a.api)), [comp.augments])

  const set = (api: string, patch: Partial<AugmentPick>) =>
    update((c) => ({ ...c, augments: c.augments.map((a) => (a.api === api ? { ...a, ...patch } : a)) }))

  const groups =
    groupBy === 'priority'
      ? (Object.keys(PRIORITY) as AugmentPick['priority'][]).map((p) => ({
          key: p,
          title: PRIORITY[p].label,
          sub: PRIORITY[p].desc,
          color: undefined as string | undefined,
          list: comp.augments.filter((a) => a.priority === p),
        }))
      : [1, 2, 3, 0].map((t) => ({
          key: String(t),
          title: AUGMENT_TIER[t].name,
          sub: '',
          color: AUGMENT_TIER[t].color,
          list: comp.augments.filter((a) => (game.augment.get(a.api)?.tier ?? 0) === t),
        }))

  return (
    <div className="tab-augments">
      <div className="tab-toolbar">
        <button className="btn" onClick={() => setPicking(true)}>
          + Añadir aumento
        </button>
        <div className="seg seg-sm">
          <button className={groupBy === 'priority' ? 'on' : ''} onClick={() => setGroupBy('priority')}>
            Por prioridad
          </button>
          <button className={groupBy === 'tier' ? 'on' : ''} onClick={() => setGroupBy('tier')}>
            Por rareza
          </button>
        </div>
      </div>

      {comp.augments.length === 0 && (
        <p className="empty-note">
          Añade los aumentos recomendados. El buscador sugiere primero los relacionados con los rasgos de tu tablero final.
        </p>
      )}

      <div className="aug-groups">
        {groups
          .filter((g) => g.list.length > 0 || groupBy === 'priority')
          .map((g) => (
            <section key={g.key} className="aug-group">
              <h4 style={{ color: g.color }}>
                {g.title} <span className="muted small">({g.list.length})</span>
              </h4>
              {g.sub && <p className="small muted">{g.sub}</p>}
              {g.list.map((pick) => {
                const a = game.augment.get(pick.api)
                if (!a) return null
                return (
                  <div key={pick.api} className={`aug-pick tier-${a.tier}`}>
                    <AugmentIcon api={a.api} size={44} />
                    <div className="aug-pick-body">
                      <div className="aug-pick-head">
                        <b>{a.name}</b>
                        <span className="small" style={{ color: AUGMENT_TIER[a.tier].color }}>
                          {AUGMENT_TIER[a.tier].name}
                        </span>
                        <select
                          className="input select sm"
                          value={pick.priority}
                          onChange={(e) => set(pick.api, { priority: e.target.value as AugmentPick['priority'] })}
                        >
                          {Object.entries(PRIORITY).map(([k, v]) => (
                            <option key={k} value={k}>
                              {v.label}
                            </option>
                          ))}
                        </select>
                        <button
                          className="icon-btn"
                          onClick={() => update((c) => ({ ...c, augments: c.augments.filter((x) => x.api !== pick.api) }))}
                        >
                          ✕
                        </button>
                      </div>
                      <Rich html={a.desc} className="small muted clamp-3" />
                      <input
                        className="input sm"
                        placeholder="Nota (cuándo cogerlo, sinergias…)"
                        value={pick.note}
                        onChange={(e) => set(pick.api, { note: e.target.value })}
                      />
                    </div>
                  </div>
                )
              })}
            </section>
          ))}
      </div>

      {picking && (
        <AugmentPicker
          exclude={exclude}
          suggestTraits={traitNames}
          onClose={() => setPicking(false)}
          onPick={(api) =>
            update((c) => ({ ...c, augments: [...c.augments, { api, note: '', priority: 'good' }] }))
          }
        />
      )}
    </div>
  )
}

export function AugmentSummary({ comp }: { comp: Comp }) {
  const game = useGame()
  const order: AugmentPick['priority'][] = ['core', 'good', 'situational']
  const list = [...comp.augments].sort((a, b) => order.indexOf(a.priority) - order.indexOf(b.priority))
  if (!list.length) return <p className="muted small">Sin aumentos recomendados.</p>
  return (
    <div className="aug-summary">
      {list.map((p) => {
        const a = game.augment.get(p.api)
        if (!a) return null
        return (
          <div key={p.api} className={`aug-sum tier-${a.tier}`}>
            <span className={`aug-ico tier-${a.tier}`} style={{ width: 40, height: 40 }}>
              <Img src={a.icon} alt={a.name} />
            </span>
            <div>
              <div>
                <b>{a.name}</b> <span className={`prio prio-${p.priority}`}>{PRIORITY[p.priority].label}</span>
              </div>
              <Rich html={a.desc} className="small muted" />
              {p.note && <div className="small note">💬 {p.note}</div>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
