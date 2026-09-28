import { useState } from 'react'
import { uid } from '../lib/util'
import type { Comp, Strategy } from '../types'
import { AutoTextarea } from './common'
import { ChampIcon } from './game'
import { ChampPicker } from './Pickers'

export const STRATEGY_FIELDS: { key: keyof Strategy; title: string; icon: string; placeholder: string }[] = [
  { key: 'summary', title: 'Resumen', icon: '📌', placeholder: 'Qué hace la comp, quién es el carry y cuándo jugarla…' },
  { key: 'early', title: 'Early game (etapas 1–2)', icon: '🌱', placeholder: 'Unidades de apertura, racha, a qué componentes ir…' },
  { key: 'mid', title: 'Mid game (etapas 3–4)', icon: '⚔️', placeholder: 'Cuándo subir de nivel, cuándo tirar, economía…' },
  { key: 'late', title: 'Late game (etapa 5+)', icon: '👑', placeholder: 'Tablero final, mejoras, legendarios, subir a 9…' },
  { key: 'positioning', title: 'Posicionamiento', icon: '🧭', placeholder: 'Dónde poner al carry, tanques, contra asesinos…' },
  { key: 'conditions', title: 'Condiciones para jugarla', icon: '✅', placeholder: 'Objetos, aumentos o unidades que te llevan a esta comp…' },
  { key: 'tips', title: 'Consejos y counters', icon: '💡', placeholder: 'Errores comunes, qué hacer si el lobby la disputa…' },
]

export function StrategyTab({ comp, update }: { comp: Comp; update: (fn: (c: Comp) => Comp) => void }) {
  const [picking, setPicking] = useState<{ id: string; side: 'from' | 'to' } | null>(null)
  const setField = (k: keyof Strategy, v: string) => update((c) => ({ ...c, strategy: { ...c.strategy, [k]: v } }))

  return (
    <div className="tab-strategy">
      <div className="strategy-grid">
        {STRATEGY_FIELDS.map((f) => (
          <section key={f.key} className={`panel-lite ${f.key === 'summary' ? 'span-2' : ''}`}>
            <h4>
              {f.icon} {f.title}
            </h4>
            <AutoTextarea value={comp.strategy[f.key]} onChange={(v) => setField(f.key, v)} placeholder={f.placeholder} />
          </section>
        ))}
      </div>

      <section className="panel-lite">
        <h4>🔁 Sustituciones y flex</h4>
        <p className="small muted">Unidades que puedes cambiar según lo que te salga en la tienda.</p>
        <div className="subs">
          {comp.substitutions.map((s) => (
            <div key={s.id} className="sub-row">
              <button className="sub-champ" onClick={() => setPicking({ id: s.id, side: 'from' })}>
                {s.from ? <ChampIcon api={s.from} size={40} showName /> : <span className="slot sm">?</span>}
              </button>
              <span className="sub-arrow">→</span>
              <button className="sub-champ" onClick={() => setPicking({ id: s.id, side: 'to' })}>
                {s.to ? <ChampIcon api={s.to} size={40} showName /> : <span className="slot sm">?</span>}
              </button>
              <input
                className="input grow"
                placeholder="Cuándo hacer el cambio…"
                value={s.note}
                onChange={(e) =>
                  update((c) => ({
                    ...c,
                    substitutions: c.substitutions.map((x) => (x.id === s.id ? { ...x, note: e.target.value } : x)),
                  }))
                }
              />
              <button
                className="icon-btn"
                onClick={() => update((c) => ({ ...c, substitutions: c.substitutions.filter((x) => x.id !== s.id) }))}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button
          className="btn ghost sm"
          onClick={() =>
            update((c) => ({ ...c, substitutions: [...c.substitutions, { id: uid(), from: '', to: '', note: '' }] }))
          }
        >
          + Añadir sustitución
        </button>
      </section>

      {picking && (
        <ChampPicker
          title={picking.side === 'from' ? 'Unidad a sustituir' : 'Sustituto'}
          onClose={() => setPicking(null)}
          onPick={(api) => {
            update((c) => ({
              ...c,
              substitutions: c.substitutions.map((x) => (x.id === picking.id ? { ...x, [picking.side]: api } : x)),
            }))
            setPicking(null)
          }}
        />
      )}
    </div>
  )
}
