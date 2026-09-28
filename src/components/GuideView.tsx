import { useMemo, useRef, useState } from 'react'
import { useGame } from '../lib/data'
import { LEVELS, TIER_COLOR } from '../lib/constants'
import { computeTraits } from '../lib/traits'
import { timeAgo } from '../lib/util'
import type { Comp } from '../types'
import { AugmentSummary } from './AugmentsTab'
import { Board, useHexFit } from './Board'
import { ChampIcon, ItemIcon } from './game'
import { BuildSummary } from './ItemsTab'
import { LevelBar, OddsStrip } from './Levels'
import { STRATEGY_FIELDS } from './StrategyTab'
import { TraitsPanel } from './TraitsPanel'

export function GuideView({ comp, actions }: { comp: Comp; actions: React.ReactNode }) {
  const game = useGame()
  const [level, setLevel] = useState(comp.finalLevel)
  const boardRef = useRef<HTMLDivElement>(null)
  const hexSize = useHexFit(boardRef, 74)
  const units = comp.levels[level].units
  const traits = useMemo(() => computeTraits(units, game), [units, game])
  const strategy = STRATEGY_FIELDS.filter((f) => comp.strategy[f.key]?.trim())
  const levelsWithUnits = LEVELS.filter((l) => comp.levels[l].units.length || comp.levels[l].note)
  const carries = comp.levels[comp.finalLevel].units.filter((u) => u.carry)

  return (
    <div className="guide">
      <header className="guide-hero panel">
        <div className="guide-tier" style={{ background: TIER_COLOR[comp.tier] }}>
          {comp.tier}
        </div>
        <div className="grow">
          <h1>{comp.name}</h1>
          <div className="guide-meta">
            <span className="pill">{comp.playstyle}</span>
            <span className="pill">Dificultad: {comp.difficulty}</span>
            <span className="pill">Nivel final {comp.finalLevel}</span>
            {comp.tags.map((t) => (
              <span key={t} className="pill ghost">
                #{t}
              </span>
            ))}
            <span className="small muted">Actualizada {timeAgo(comp.updatedAt)}</span>
          </div>
          {carries.length > 0 && (
            <div className="guide-carries">
              <span className="small muted">Carries:</span>
              {carries.map((u, i) => (
                <ChampIcon key={i} api={u.champ} size={34} stars={u.stars} showName />
              ))}
            </div>
          )}
        </div>
        <div className="guide-actions">{actions}</div>
      </header>

      {comp.strategy.summary && (
        <section className="panel guide-summary">
          <p>{comp.strategy.summary}</p>
        </section>
      )}

      <section className="panel guide-board">
        <LevelBar comp={comp} level={level} onLevel={setLevel} />
        <div className="guide-board-grid">
          <div className="traits-col">
            <TraitsPanel traits={traits} compact />
          </div>
          <div className="guide-board-main" ref={boardRef}>
            <Board units={units} readOnly size={hexSize} />
            <div className="guide-level-info">
              <span className="pill">Etapa {comp.levels[level].stage}</span>
              <OddsStrip level={level} />
            </div>
            {comp.levels[level].note && <p className="guide-note">{comp.levels[level].note}</p>}
          </div>
        </div>
      </section>

      <div className="guide-cols">
        <section className="panel">
          <h2 className="section-title">🗡 Objetos</h2>
          {comp.builds.length ? <BuildSummary comp={comp} /> : <p className="muted small">Sin builds definidas.</p>}
          {comp.itemPriority.length > 0 && (
            <>
              <h3 className="sub-title">Prioridad de objetos</h3>
              <div className="prio-inline">
                {comp.itemPriority.map((i, idx) => (
                  <span key={i} className="prio-inline-item">
                    {idx > 0 && <span className="muted">›</span>}
                    <ItemIcon api={i} size={32} />
                  </span>
                ))}
              </div>
            </>
          )}
        </section>
        <section className="panel">
          <h2 className="section-title">✨ Aumentos</h2>
          <AugmentSummary comp={comp} />
        </section>
      </div>

      {levelsWithUnits.length > 0 && (
        <section className="panel">
          <h2 className="section-title">📈 Plan de niveles</h2>
          <div className="guide-levels">
            {levelsWithUnits.map((l) => (
              <button key={l} className={`guide-level ${l === level ? 'on' : ''}`} onClick={() => setLevel(l)}>
                <div className="guide-level-head">
                  <b>Nivel {l}</b>
                  <span className="muted small">Etapa {comp.levels[l].stage}</span>
                  {l === comp.finalLevel && <span className="final-pill">★ Final</span>}
                </div>
                <div className="guide-level-units">
                  {comp.levels[l].units.map((u, i) => (
                    <ChampIcon key={i} api={u.champ} size={34} stars={u.stars} carry={u.carry} />
                  ))}
                </div>
                {comp.levels[l].note && <p className="small">{comp.levels[l].note}</p>}
              </button>
            ))}
          </div>
        </section>
      )}

      {(strategy.length > 0 || comp.substitutions.length > 0) && (
        <section className="panel">
          <h2 className="section-title">📜 Estrategia</h2>
          <div className="guide-strategy">
            {strategy
              .filter((f) => f.key !== 'summary')
              .map((f) => (
                <div key={f.key} className="guide-strat">
                  <h3 className="sub-title">
                    {f.icon} {f.title}
                  </h3>
                  <p>{comp.strategy[f.key]}</p>
                </div>
              ))}
          </div>
          {comp.substitutions.filter((s) => s.from && s.to).length > 0 && (
            <>
              <h3 className="sub-title">🔁 Sustituciones</h3>
              <div className="subs">
                {comp.substitutions
                  .filter((s) => s.from && s.to)
                  .map((s) => (
                    <div key={s.id} className="sub-row">
                      <ChampIcon api={s.from} size={36} showName />
                      <span className="sub-arrow">→</span>
                      <ChampIcon api={s.to} size={36} showName />
                      <span className="small muted">{s.note}</span>
                    </div>
                  ))}
              </div>
            </>
          )}
        </section>
      )}
    </div>
  )
}
