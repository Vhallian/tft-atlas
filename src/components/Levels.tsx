import { useGame } from '../lib/data'
import { COST_COLOR, LEVEL_HINT, LEVELS, SHOP_ODDS } from '../lib/constants'
import type { Comp, LevelPlan } from '../types'
import { AutoTextarea } from './common'
import { ChampIcon } from './game'

export function LevelBar({
  comp,
  level,
  onLevel,
}: {
  comp: Comp
  level: number
  onLevel: (l: number) => void
}) {
  return (
    <div className="levelbar" role="tablist">
      {LEVELS.map((l) => {
        const n = comp.levels[l]?.units.length ?? 0
        return (
          <button
            key={l}
            role="tab"
            aria-selected={l === level}
            className={`lvl-tab ${l === level ? 'on' : ''} ${n === 0 ? 'empty' : ''} ${l === comp.finalLevel ? 'final' : ''}`}
            onClick={() => onLevel(l)}
            title={l === comp.finalLevel ? 'Composición final' : undefined}
          >
            <span className="lvl-n">Nv {l}</span>
            <span className={`lvl-count ${n > l ? 'warn' : ''}`}>
              {n}/{l}
            </span>
            <span className="lvl-stage">{comp.levels[l]?.stage}</span>
          </button>
        )
      })}
    </div>
  )
}

/** Mini barra de probabilidades de tienda */
export function OddsStrip({ level }: { level: number }) {
  const odds = SHOP_ODDS[level] ?? SHOP_ODDS[10]
  return (
    <div className="odds-strip" title={odds.map((p, i) => `${i + 1}🪙 ${p}%`).join(' · ')}>
      {odds.map((p, i) =>
        p > 0 ? (
          <span key={i} style={{ width: `${p}%`, background: COST_COLOR[i + 1] }}>
            {p >= 10 ? `${p}%` : ''}
          </span>
        ) : null,
      )}
    </div>
  )
}

export function LevelsTab({
  comp,
  update,
  onEdit,
}: {
  comp: Comp
  update: (fn: (c: Comp) => Comp) => void
  onEdit: (l: number) => void
}) {
  const game = useGame()
  const setLevel = (l: number, patch: Partial<LevelPlan>) =>
    update((c) => ({ ...c, levels: { ...c.levels, [l]: { ...c.levels[l], ...patch } } }))

  return (
    <div className="levels-plan">
      <p className="small muted">
        Planifica qué tablero jugar en cada nivel. La etapa indica cuándo sueles alcanzarlo. El nivel marcado con ★ es la
        composición final.
      </p>
      {LEVELS.map((l) => {
        const plan = comp.levels[l]
        const n = plan.units.length
        const gold = plan.units.reduce((s, u) => s + (game.champ.get(u.champ)?.cost ?? 0) * 3 ** (u.stars - 1), 0)
        return (
          <article key={l} className={`level-row ${l === comp.finalLevel ? 'is-final' : ''} ${n === 0 ? 'is-empty' : ''}`}>
            <div className="level-side">
              <div className="level-badge">
                {l === comp.finalLevel && <span title="Composición final">★ </span>}Nivel {l}
              </div>
              <label className="small muted">
                Etapa
                <input className="input sm stage" value={plan.stage} onChange={(e) => setLevel(l, { stage: e.target.value })} />
              </label>
              <span className={`small ${n > l ? 'warn' : 'muted'}`}>
                {n}/{l} unidades · {gold} 🪙
              </span>
              <OddsStrip level={l} />
            </div>
            <div className="level-main">
              <div className="level-units">
                {n === 0 ? (
                  <span className="muted small">Sin unidades — {LEVEL_HINT[l]}</span>
                ) : (
                  [...plan.units]
                    .sort((a, b) => (game.champ.get(a.champ)?.cost ?? 0) - (game.champ.get(b.champ)?.cost ?? 0))
                    .map((u, i) => (
                      <ChampIcon key={i} api={u.champ} size={42} stars={u.stars} items={u.items} carry={u.carry} />
                    ))
                )}
              </div>
              <AutoTextarea
                minRows={1}
                value={plan.note}
                placeholder={`Qué hacer en nivel ${l}: ${LEVEL_HINT[l]}`}
                onChange={(note) => setLevel(l, { note })}
              />
            </div>
            <div className="level-actions">
              <button className="btn sm" onClick={() => onEdit(l)}>
                Editar tablero
              </button>
              {l > LEVELS[0] && (
                <button
                  className="btn ghost sm"
                  onClick={() => setLevel(l, { units: structuredClone(comp.levels[l - 1].units) })}
                  title={`Copiar las unidades del nivel ${l - 1}`}
                >
                  Copiar Nv {l - 1}
                </button>
              )}
              {l !== comp.finalLevel && (
                <button className="btn ghost sm" onClick={() => update((c) => ({ ...c, finalLevel: l }))}>
                  Marcar final ★
                </button>
              )}
            </div>
          </article>
        )
      })}
    </div>
  )
}
