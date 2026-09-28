import { useMemo, useState } from 'react'
import { useGame } from '../lib/data'
import { COST_COLOR, ITEM_CATEGORY_LABEL } from '../lib/constants'
import { normalize } from '../lib/util'
import type { ItemCategory } from '../types'
import { DND_TYPE, readDrag } from './Board'
import { Img, Tip } from './common'
import { ChampionCard, ItemIcon, TraitHex } from './game'

interface Props {
  onAdd: (api: string) => void
  onRemoveUnit: (row: number, col: number) => void
  onArm: (api: string | null) => void
  armed: string | null
  used: Set<string>
}

export function Pool({ onAdd, onRemoveUnit, onArm, armed, used }: Props) {
  const game = useGame()
  const [mode, setMode] = useState<'champs' | 'items'>('champs')
  const [q, setQ] = useState('')
  const [cost, setCost] = useState<number | null>(null)
  const [trait, setTrait] = useState<string | null>(null)
  const [itemCat, setItemCat] = useState<ItemCategory>('completed')
  const [dropOver, setDropOver] = useState(false)

  const champs = useMemo(() => {
    const nq = normalize(q)
    return game.champions.filter(
      (c) =>
        (cost == null || c.cost === cost) &&
        (!trait || c.traits.includes(trait)) &&
        (!nq || normalize(c.name).includes(nq) || c.traits.some((t) => normalize(t).includes(nq))),
    )
  }, [game, q, cost, trait])

  const items = useMemo(() => {
    const nq = normalize(q)
    return game.items.filter((i) => i.category === itemCat && (!nq || normalize(i.name).includes(nq)))
  }, [game, q, itemCat])

  const traitsSorted = useMemo(
    () => [...game.traits].sort((a, b) => a.name.localeCompare(b.name, 'es')),
    [game],
  )

  return (
    <section
      className={`panel pool ${dropOver ? 'is-drop' : ''}`}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes(DND_TYPE)) return
        e.preventDefault()
        setDropOver(true)
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropOver(false)
      }}
      onDrop={(e) => {
        setDropOver(false)
        const p = readDrag(e)
        if (p?.type === 'unit') {
          e.preventDefault()
          onRemoveUnit(p.row, p.col)
        }
      }}
    >
      <div className="pool-head">
        <div className="seg">
          <button className={mode === 'champs' ? 'on' : ''} onClick={() => setMode('champs')}>
            Campeones
          </button>
          <button className={mode === 'items' ? 'on' : ''} onClick={() => setMode('items')}>
            Objetos
          </button>
        </div>
        <input
          className="input search"
          placeholder={mode === 'champs' ? 'Buscar campeón o rasgo…' : 'Buscar objeto…'}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {mode === 'champs' ? (
          <>
            <div className="cost-filter">
              {[1, 2, 3, 4, 5].map((c) => (
                <button
                  key={c}
                  className={`cost-btn ${cost === c ? 'on' : ''}`}
                  style={{ '--c': COST_COLOR[c] } as React.CSSProperties}
                  onClick={() => setCost(cost === c ? null : c)}
                >
                  {c}
                </button>
              ))}
            </div>
            <select className="input select" value={trait ?? ''} onChange={(e) => setTrait(e.target.value || null)}>
              <option value="">Todos los rasgos</option>
              {traitsSorted.map((t) => (
                <option key={t.api} value={t.name}>
                  {t.name}
                </option>
              ))}
            </select>
          </>
        ) : (
          <div className="seg seg-sm">
            {(Object.keys(ITEM_CATEGORY_LABEL) as ItemCategory[])
              .filter((c) => game.items.some((i) => i.category === c))
              .map((c) => (
                <button key={c} className={itemCat === c ? 'on' : ''} onClick={() => setItemCat(c)}>
                  {ITEM_CATEGORY_LABEL[c]}
                </button>
              ))}
          </div>
        )}
      </div>

      {dropOver && <div className="pool-drop-hint">Suelta aquí para quitar la unidad del tablero</div>}

      {mode === 'champs' ? (
        <>
          {trait && (
            <div className="pool-trait-hint">
              <TraitHex icon={game.trait.get(trait)?.icon ?? null} style={0} name={trait} size={18} />
              Filtrando por <b>{trait}</b>
              <button className="link" onClick={() => setTrait(null)}>
                quitar
              </button>
            </div>
          )}
          <div className="pool-grid">
            {champs.map((c) => (
              <Tip key={c.api} content={() => <ChampionCard champ={c} />}>
                <button
                  className={`pool-champ ${armed === c.api ? 'is-armed' : ''} ${used.has(c.api) ? 'is-used' : ''}`}
                  style={{ '--c': COST_COLOR[c.cost] } as React.CSSProperties}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData(DND_TYPE, JSON.stringify({ type: 'champ', api: c.api }))
                    e.dataTransfer.effectAllowed = 'copy'
                  }}
                  onClick={() => onAdd(c.api)}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    onArm(armed === c.api ? null : c.api)
                  }}
                >
                  <Img src={c.icon} alt={c.name} />
                  <span className="pool-cost">{c.cost}</span>
                  <span className="pool-name">{c.name}</span>
                </button>
              </Tip>
            ))}
            {champs.length === 0 && <p className="muted">Sin resultados.</p>}
          </div>
          <p className="hint">
            Arrastra al tablero o haz clic para añadir en el primer hueco. Clic derecho: elegir y luego pulsar un hexágono.
          </p>
        </>
      ) : (
        <>
          <div className="pool-items">
            {items.map((i) => (
              <div key={i.api} className="pool-item">
                <ItemIcon api={i.api} size={40} draggable />
                <span className="pool-item-name">{i.name}</span>
              </div>
            ))}
          </div>
          <p className="hint">Arrastra un objeto sobre una unidad del tablero para equiparlo (máx. 3).</p>
        </>
      )}
    </section>
  )
}
