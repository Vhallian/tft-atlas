import { useMemo, useState } from 'react'
import { useGame } from '../lib/data'
import { uid } from '../lib/util'
import type { CarryBuild, Comp } from '../types'
import { AutoTextarea } from './common'
import { ChampIcon, ItemIcon } from './game'
import { ChampPicker, ItemPicker } from './Pickers'

interface Props {
  comp: Comp
  update: (fn: (c: Comp) => Comp) => void
}

type Picking =
  | { kind: 'variant'; champ: string; variant: string }
  | { kind: 'priority' }
  | { kind: 'champ' }
  | null

export function ItemsTab({ comp, update }: Props) {
  const game = useGame()
  const [picking, setPicking] = useState<Picking>(null)
  const finalUnits = comp.levels[comp.finalLevel]?.units ?? []

  const setBuilds = (fn: (b: CarryBuild[]) => CarryBuild[]) => update((c) => ({ ...c, builds: fn(c.builds) }))
  const setBuild = (champ: string, fn: (b: CarryBuild) => CarryBuild) =>
    setBuilds((bs) => bs.map((b) => (b.champ === champ ? fn(b) : b)))

  function importFromBoard() {
    setBuilds((bs) => {
      const out = [...bs]
      for (const u of finalUnits) {
        if (u.items.length === 0) continue
        const idx = out.findIndex((b) => b.champ === u.champ)
        const variant = { id: uid(), label: 'Mejor en ranura', items: [...u.items] }
        if (idx < 0) out.push({ champ: u.champ, note: '', variants: [variant] })
        else if (!out[idx].variants.some((v) => v.items.join() === u.items.join()))
          out[idx] = { ...out[idx], variants: [variant, ...out[idx].variants] }
      }
      return out
    })
  }

  // Componentes necesarios para el tablero final
  const components = useMemo(() => {
    const count = new Map<string, number>()
    for (const u of finalUnits)
      for (const i of u.items) {
        const it = game.item.get(i)
        const parts = it?.category === 'component' ? [i] : (it?.from ?? [])
        parts.forEach((p) => count.set(p, (count.get(p) ?? 0) + 1))
      }
    return [...count.entries()].sort((a, b) => b[1] - a[1])
  }, [finalUnits, game])

  const boardHasItems = finalUnits.some((u) => u.items.length)

  return (
    <div className="tab-items">
      <div className="tab-toolbar">
        <button className="btn" onClick={() => setPicking({ kind: 'champ' })}>
          + Añadir campeón
        </button>
        <button className="btn ghost" onClick={importFromBoard} disabled={!boardHasItems}>
          ⇩ Importar objetos del tablero (nivel {comp.finalLevel})
        </button>
      </div>

      {comp.builds.length === 0 && (
        <p className="empty-note">
          Aún no hay builds. Equipa objetos en el tablero y pulsa <b>Importar objetos del tablero</b>, o añade un campeón.
        </p>
      )}

      <div className="builds">
        {comp.builds.map((b) => {
          const champ = game.champ.get(b.champ)
          if (!champ) return null
          return (
            <article key={b.champ} className="build-card">
              <header className="build-head">
                <ChampIcon api={b.champ} size={52} />
                <div className="build-title">
                  <h4>{champ.name}</h4>
                  <span className="small muted">{champ.traits.join(' · ')}</span>
                </div>
                <button
                  className="icon-btn"
                  title="Eliminar build"
                  onClick={() => setBuilds((bs) => bs.filter((x) => x.champ !== b.champ))}
                >
                  🗑
                </button>
              </header>
              {b.variants.map((v, idx) => (
                <div key={v.id} className={`variant ${idx === 0 ? 'is-bis' : ''}`}>
                  <input
                    className="input variant-label"
                    value={v.label}
                    placeholder={idx === 0 ? 'Mejor en ranura' : 'Variante (p. ej. «sin Lágrima»)'}
                    onChange={(e) =>
                      setBuild(b.champ, (x) => ({
                        ...x,
                        variants: x.variants.map((y) => (y.id === v.id ? { ...y, label: e.target.value } : y)),
                      }))
                    }
                  />
                  <div className="variant-items">
                    {[0, 1, 2].map((i) =>
                      v.items[i] ? (
                        <span key={i} title="Clic para quitar">
                          <ItemIcon
                            api={v.items[i]}
                            size={38}
                            onClick={() =>
                              setBuild(b.champ, (x) => ({
                                ...x,
                                variants: x.variants.map((y) =>
                                  y.id === v.id ? { ...y, items: y.items.filter((_, j) => j !== i) } : y,
                                ),
                              }))
                            }
                          />
                        </span>
                      ) : (
                        <button
                          key={i}
                          className="slot sm"
                          onClick={() => setPicking({ kind: 'variant', champ: b.champ, variant: v.id })}
                        >
                          +
                        </button>
                      ),
                    )}
                  </div>
                  <button
                    className="icon-btn"
                    title="Quitar variante"
                    onClick={() =>
                      setBuild(b.champ, (x) => ({ ...x, variants: x.variants.filter((y) => y.id !== v.id) }))
                    }
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                className="btn ghost sm"
                onClick={() =>
                  setBuild(b.champ, (x) => ({
                    ...x,
                    variants: [
                      ...x.variants,
                      { id: uid(), label: x.variants.length ? `Alternativa ${x.variants.length}` : 'Mejor en ranura', items: [] },
                    ],
                  }))
                }
              >
                + Variante de objetos
              </button>
              <AutoTextarea
                minRows={2}
                value={b.note}
                placeholder="Notas: prioridad de objetos, cuándo cambiar de portador…"
                onChange={(note) => setBuild(b.champ, (x) => ({ ...x, note }))}
              />
            </article>
          )
        })}
      </div>

      <div className="two-col">
        <section className="panel-lite">
          <h4>Prioridad de objetos (slam)</h4>
          <p className="small muted">Orden en el que conviene completar objetos.</p>
          <ol className="priority">
            {comp.itemPriority.map((api, i) => (
              <li key={api + i}>
                <span className="prio-n">{i + 1}</span>
                <ItemIcon api={api} size={32} />
                <span className="grow">{game.item.get(api)?.name}</span>
                <button
                  className="icon-btn"
                  disabled={i === 0}
                  onClick={() =>
                    update((c) => {
                      const p = [...c.itemPriority]
                      ;[p[i - 1], p[i]] = [p[i], p[i - 1]]
                      return { ...c, itemPriority: p }
                    })
                  }
                >
                  ↑
                </button>
                <button
                  className="icon-btn"
                  onClick={() => update((c) => ({ ...c, itemPriority: c.itemPriority.filter((_, j) => j !== i) }))}
                >
                  ✕
                </button>
              </li>
            ))}
          </ol>
          <button className="btn ghost sm" onClick={() => setPicking({ kind: 'priority' })}>
            + Añadir objeto
          </button>
        </section>

        <section className="panel-lite">
          <h4>Componentes necesarios</h4>
          <p className="small muted">Calculado a partir de los objetos del tablero final (nivel {comp.finalLevel}).</p>
          {components.length === 0 ? (
            <p className="muted small">Sin objetos en el tablero final.</p>
          ) : (
            <div className="components">
              {components.map(([api, n]) => (
                <div key={api} className="component">
                  <ItemIcon api={api} size={36} />
                  <b>×{n}</b>
                  <span className="small muted">{game.item.get(api)?.name}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {picking?.kind === 'variant' && (
        <ItemPicker
          onClose={() => setPicking(null)}
          onPick={(api) => {
            setBuild(picking.champ, (x) => ({
              ...x,
              variants: x.variants.map((y) =>
                y.id === picking.variant && y.items.length < 3 ? { ...y, items: [...y.items, api] } : y,
              ),
            }))
            const b = comp.builds.find((x) => x.champ === picking.champ)
            const v = b?.variants.find((y) => y.id === picking.variant)
            if (!v || v.items.length >= 2) setPicking(null)
          }}
        />
      )}
      {picking?.kind === 'priority' && (
        <ItemPicker
          onClose={() => setPicking(null)}
          onPick={(api) => {
            update((c) => ({ ...c, itemPriority: c.itemPriority.includes(api) ? c.itemPriority : [...c.itemPriority, api] }))
            setPicking(null)
          }}
        />
      )}
      {picking?.kind === 'champ' && (
        <ChampPicker
          onClose={() => setPicking(null)}
          onPick={(api) => {
            setBuilds((bs) =>
              bs.some((b) => b.champ === api)
                ? bs
                : [...bs, { champ: api, note: '', variants: [{ id: uid(), label: 'Mejor en ranura', items: [] }] }],
            )
            setPicking(null)
          }}
        />
      )}
    </div>
  )
}

export function BuildSummary({ comp }: { comp: Comp }) {
  if (comp.builds.length === 0) return null
  return (
    <div className="build-summary">
      {comp.builds.map((b) => (
        <div key={b.champ} className="bs-row">
          <ChampIcon api={b.champ} size={44} />
          <div className="bs-variants">
            {b.variants.map((v, i) => (
              <div key={v.id} className={`bs-variant ${i === 0 ? 'is-bis' : ''}`}>
                <span className="bs-items">
                  {v.items.map((it, j) => (
                    <ItemIcon key={j} api={it} size={30} />
                  ))}
                </span>
                <span className="small">{v.label}</span>
              </div>
            ))}
            {b.note && <p className="small muted">{b.note}</p>}
          </div>
        </div>
      ))}
    </div>
  )
}
