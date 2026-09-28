import { useGame } from '../lib/data'
import type { ActiveTrait } from '../lib/traits'
import { Tip } from './common'
import { TraitCard, TraitHex } from './game'

export function TraitsPanel({ traits, compact }: { traits: ActiveTrait[]; compact?: boolean }) {
  const game = useGame()
  const active = traits.filter((t) => t.level >= 0)
  const inactive = traits.filter((t) => t.level < 0)
  if (traits.length === 0) return <p className="muted small">Añade campeones para ver los rasgos.</p>

  const row = (t: ActiveTrait) => {
    const info = game.trait.get(t.name)
    const next = t.breakpoints.find((b) => b > t.count)
    return (
      <Tip key={t.name} content={() => <TraitCard name={t.name} active={t} />}>
        <div className={`trait-row ${t.level < 0 ? 'is-off' : ''}`}>
          <TraitHex icon={info?.icon ?? null} style={t.style} name={t.name} size={compact ? 22 : 28} />
          <span className="trait-count">{t.count}</span>
          <div className="trait-body">
            <span className="trait-name">{t.name}</span>
            {!compact && (
              <span className="trait-bps">
                {t.breakpoints.map((b, i) => (
                  <span key={i} className={i === t.level ? 'bp-cur' : t.count >= b ? 'bp-past' : ''}>
                    {b}
                  </span>
                ))}
                {next && t.breakpoints.length > 1 && <span className="muted"> · faltan {next - t.count}</span>}
              </span>
            )}
          </div>
        </div>
      </Tip>
    )
  }

  return (
    <div className="traits">
      {active.map(row)}
      {inactive.length > 0 && active.length > 0 && <div className="traits-sep" />}
      {inactive.map(row)}
    </div>
  )
}
