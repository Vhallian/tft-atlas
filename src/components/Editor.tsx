import { useEffect, useMemo, useRef, useState } from 'react'
import { useGame } from '../lib/data'
import { DIFFICULTIES, LEVEL_HINT, LEVELS, PLAYSTYLES, TIER_COLOR, TIERS } from '../lib/constants'
import { computeTraits } from '../lib/traits'
import type { Comp, Placement } from '../types'
import { AugmentsTab } from './AugmentsTab'
import { Board, firstFreeSlot, useHexFit } from './Board'
import { AutoTextarea } from './common'
import { Inspector } from './Inspector'
import { ItemsTab } from './ItemsTab'
import { LevelBar, LevelsTab, OddsStrip } from './Levels'
import { Pool } from './Pool'
import { StrategyTab } from './StrategyTab'
import { TraitsPanel } from './TraitsPanel'

type Tab = 'items' | 'augments' | 'strategy' | 'levels'

interface Props {
  comp: Comp
  update: (fn: (c: Comp) => Comp) => void
  onGuide: () => void
  onShare: () => void
  onExport: () => void
  onDuplicate: () => void
  onDelete: () => void
  /** Controles de nube: visibilidad, estado de guardado, subir… */
  cloudControls?: React.ReactNode
}

export function Editor({ comp, update, onGuide, onShare, onExport, onDuplicate, onDelete, cloudControls }: Props) {
  const game = useGame()
  const [level, setLevel] = useState(comp.finalLevel)
  const [selected, setSelected] = useState<{ row: number; col: number } | null>(null)
  const [armed, setArmed] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('items')
  const boardCol = useRef<HTMLDivElement>(null)
  const tabsRef = useRef<HTMLDivElement>(null)
  const hexSize = useHexFit(boardCol)

  useEffect(() => {
    setLevel(comp.finalLevel)
    setSelected(null)
    // solo al cambiar de comp
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comp.id])

  const plan = comp.levels[level]
  const units = plan.units
  const setUnits = (next: Placement[]) =>
    update((c) => ({ ...c, levels: { ...c.levels, [level]: { ...c.levels[level], units: next } } }))
  const setPlan = (patch: Partial<typeof plan>) =>
    update((c) => ({ ...c, levels: { ...c.levels, [level]: { ...c.levels[level], ...patch } } }))

  const traits = useMemo(() => computeTraits(units, game), [units, game])
  // términos para sugerir aumentos: rasgos activos y campeones del tablero final
  const finalTerms = useMemo(() => {
    const finalUnits = comp.levels[comp.finalLevel].units
    const traitNames = computeTraits(finalUnits, game)
      .filter((t) => t.level >= 0)
      .map((t) => t.name)
    const champNames = finalUnits.map((u) => game.champ.get(u.champ)?.name.replace(/ \(.*\)$/, '') ?? '')
    return [...new Set([...traitNames, ...champNames].filter(Boolean))]
  }, [comp.levels, comp.finalLevel, game])
  const selUnit = selected ? (units.find((u) => u.row === selected.row && u.col === selected.col) ?? null) : null
  const used = useMemo(() => new Set(units.map((u) => u.champ)), [units])

  // atajos de teclado sobre la unidad seleccionada
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (!selUnit || t.closest('input, textarea, select, [contenteditable]')) return
      if (e.key === 'Delete' || e.key === 'Backspace') {
        setUnits(units.filter((u) => u !== selUnit))
        setSelected(null)
      } else if (['1', '2', '3'].includes(e.key)) {
        setUnits(units.map((u) => (u === selUnit ? { ...u, stars: Number(e.key) as 1 | 2 | 3 } : u)))
      } else if (e.key === 'Escape') setSelected(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  function addChamp(api: string) {
    const c = game.champ.get(api)
    const slot = firstFreeSlot(units, c?.stats.range ?? 1)
    if (!slot) return
    setUnits([...units, { champ: api, ...slot, stars: 1, items: [] }])
    setSelected(slot)
  }

  const copyPrev = () => {
    const i = LEVELS.indexOf(level as (typeof LEVELS)[number])
    if (i > 0) setUnits(structuredClone(comp.levels[LEVELS[i - 1]].units))
  }

  return (
    <div className="editor">
      <header className="comp-header panel">
        <div className="comp-header-main">
          <select
            className="tier-select"
            value={comp.tier}
            style={{ background: TIER_COLOR[comp.tier] }}
            onChange={(e) => update((c) => ({ ...c, tier: e.target.value as Comp['tier'] }))}
            title="Tier"
          >
            {TIERS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <input
            className="comp-name"
            value={comp.name}
            onChange={(e) => update((c) => ({ ...c, name: e.target.value }))}
            placeholder="Nombre de la composición"
          />
        </div>
        <div className="comp-header-meta">
          <label>
            Estilo
            <select className="input select sm" value={comp.playstyle} onChange={(e) => update((c) => ({ ...c, playstyle: e.target.value as Comp['playstyle'] }))}>
              {PLAYSTYLES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
          <label>
            Dificultad
            <select className="input select sm" value={comp.difficulty} onChange={(e) => update((c) => ({ ...c, difficulty: e.target.value as Comp['difficulty'] }))}>
              {DIFFICULTIES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
          <label className="grow">
            Etiquetas
            <input
              className="input sm"
              placeholder="PH, flexible, contesta…"
              defaultValue={comp.tags.join(', ')}
              key={comp.id}
              onBlur={(e) =>
                update((c) => ({ ...c, tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) }))
              }
            />
          </label>
          <div className="comp-actions">
            {cloudControls}
            <button className="btn primary" onClick={onGuide}>
              👁 Ver guía
            </button>
            <button className="btn" onClick={onShare} title="Copiar enlace para compartir">
              🔗 Compartir
            </button>
            <button className="btn ghost" onClick={onExport} title="Descargar JSON">
              ⇩ JSON
            </button>
            <button className="btn ghost" onClick={onDuplicate}>
              ⧉ Duplicar
            </button>
            <button className="btn ghost danger" onClick={onDelete}>
              🗑
            </button>
          </div>
        </div>
      </header>

      <div className="editor-grid">
        <aside className="panel traits-col">
          <h3 className="panel-title">Rasgos · Nv {level}</h3>
          <TraitsPanel traits={traits} />
        </aside>

        <section className="board-col" ref={boardCol}>
          <LevelBar comp={comp} level={level} onLevel={(l) => (setLevel(l), setSelected(null))} />
          <div className="board-toolbar">
            <label className="small">
              Etapa
              <input className="input sm stage" value={plan.stage} onChange={(e) => setPlan({ stage: e.target.value })} />
            </label>
            <span className={`count-pill ${units.length > level ? 'warn' : units.length === level ? 'ok' : ''}`}>
              {units.length}/{level} unidades
            </span>
            <OddsStrip level={level} />
            <div className="grow" />
            {level > LEVELS[0] && (
              <button className="btn ghost sm" onClick={copyPrev} title="Reemplaza este tablero por el del nivel anterior">
                ⧉ Copiar Nv {level - 1}
              </button>
            )}
            {level !== comp.finalLevel ? (
              <button className="btn ghost sm" onClick={() => update((c) => ({ ...c, finalLevel: level }))}>
                ★ Marcar como final
              </button>
            ) : (
              <span className="final-pill">★ Composición final</span>
            )}
            <button className="btn ghost sm" onClick={() => (setUnits([]), setSelected(null))} disabled={!units.length}>
              Vaciar
            </button>
          </div>
          <div className="board-wrap">
            <div className="board-label top">Primera línea</div>
            <Board
              units={units}
              onChange={setUnits}
              selected={selected}
              onSelect={setSelected}
              armed={armed}
              onPlaced={() => setArmed(null)}
              size={hexSize}
            />
            <div className="board-label bottom">Retaguardia</div>
            {armed && (
              <div className="armed-hint">
                Pulsa un hexágono para colocar a <b>{game.champ.get(armed)?.name}</b>{' '}
                <button className="link" onClick={() => setArmed(null)}>
                  cancelar
                </button>
              </div>
            )}
          </div>
          <AutoTextarea
            minRows={2}
            value={plan.note}
            placeholder={`Notas para nivel ${level} — ${LEVEL_HINT[level]}`}
            onChange={(note) => setPlan({ note })}
          />
        </section>

        <aside className="panel insp-col">
          <Inspector
            unit={selUnit}
            level={level}
            units={units}
            builds={comp.builds}
            onChange={(u) => setUnits(units.map((x) => (x === selUnit ? u : x)))}
            onRemove={() => {
              setUnits(units.filter((x) => x !== selUnit))
              setSelected(null)
            }}
          />
        </aside>
      </div>

      <Pool
        onAdd={addChamp}
        armed={armed}
        onArm={setArmed}
        used={used}
        onRemoveUnit={(r, c) => {
          setUnits(units.filter((u) => !(u.row === r && u.col === c)))
          setSelected(null)
        }}
      />

      <div className="tabs panel" ref={tabsRef}>
        <nav className="tab-nav" role="tablist">
          {(
            [
              ['items', '🗡 Objetos', comp.builds.length],
              ['augments', '✨ Aumentos', comp.augments.length],
              ['strategy', '📜 Estrategia', null],
              ['levels', '📈 Plan de niveles', LEVELS.filter((l) => comp.levels[l].units.length).length],
            ] as [Tab, string, number | null][]
          ).map(([k, label, n]) => (
            <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
              {label}
              {n != null && n > 0 && <span className="tab-count">{n}</span>}
            </button>
          ))}
        </nav>
        <div className="tab-body">
          {tab === 'items' && <ItemsTab comp={comp} update={update} />}
          {tab === 'augments' && <AugmentsTab comp={comp} update={update} traitNames={finalTerms} />}
          {tab === 'strategy' && <StrategyTab comp={comp} update={update} />}
          {tab === 'levels' && (
            <LevelsTab
              comp={comp}
              update={update}
              onEdit={(l) => {
                setLevel(l)
                setSelected(null)
                boardCol.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}
