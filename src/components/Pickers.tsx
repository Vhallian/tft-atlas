import { useMemo, useState } from 'react'
import { useGame } from '../lib/data'
import { AUGMENT_TIER, COST_COLOR, ITEM_CATEGORY_LABEL } from '../lib/constants'
import { normalize } from '../lib/util'
import type { ItemCategory } from '../types'
import { Img, Modal, Rich, Tip } from './common'
import { AugmentCard, ChampionCard, ItemCard } from './game'

export function ItemPicker({
  onPick,
  onClose,
  title = 'Elegir objeto',
  categories,
}: {
  onPick: (api: string) => void
  onClose: () => void
  title?: string
  categories?: ItemCategory[]
}) {
  const game = useGame()
  const cats = (categories ?? (Object.keys(ITEM_CATEGORY_LABEL) as ItemCategory[])).filter((c) =>
    game.items.some((i) => i.category === c),
  )
  const [cat, setCat] = useState<ItemCategory>(cats[0])
  const [q, setQ] = useState('')
  const list = useMemo(() => {
    const nq = normalize(q)
    return game.items.filter((i) => (nq ? true : i.category === cat) && (!nq || normalize(i.name).includes(nq)))
  }, [game, q, cat])

  return (
    <Modal title={title} onClose={onClose} wide>
      <div className="picker-head">
        <input autoFocus className="input search" placeholder="Buscar objeto…" value={q} onChange={(e) => setQ(e.target.value)} />
        {!q && (
          <div className="seg seg-sm">
            {cats.map((c) => (
              <button key={c} className={cat === c ? 'on' : ''} onClick={() => setCat(c)}>
                {ITEM_CATEGORY_LABEL[c]}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="picker-grid">
        {list.map((i) => (
          <Tip key={i.api} content={() => <ItemCard item={i} />}>
            <button className="picker-cell" onClick={() => onPick(i.api)}>
              <Img src={i.icon} alt={i.name} className="item-ico-md" />
              <span>{i.name}</span>
            </button>
          </Tip>
        ))}
      </div>
    </Modal>
  )
}

export function ChampPicker({ onPick, onClose, title = 'Elegir campeón' }: { onPick: (api: string) => void; onClose: () => void; title?: string }) {
  const game = useGame()
  const [q, setQ] = useState('')
  const list = useMemo(() => {
    const nq = normalize(q)
    return game.champions.filter((c) => !nq || normalize(c.name).includes(nq) || c.traits.some((t) => normalize(t).includes(nq)))
  }, [game, q])
  return (
    <Modal title={title} onClose={onClose} wide>
      <div className="picker-head">
        <input autoFocus className="input search" placeholder="Buscar campeón o rasgo…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="picker-grid champs">
        {list.map((c) => (
          <Tip key={c.api} content={() => <ChampionCard champ={c} />}>
            <button className="picker-cell" onClick={() => onPick(c.api)}>
              <Img src={c.icon} alt={c.name} className="champ-sq" style={{ borderColor: COST_COLOR[c.cost] }} />
              <span>{c.name}</span>
            </button>
          </Tip>
        ))}
      </div>
    </Modal>
  )
}

export function AugmentPicker({
  onPick,
  onClose,
  exclude,
  suggestTraits,
}: {
  onPick: (api: string) => void
  onClose: () => void
  exclude: Set<string>
  suggestTraits: string[]
}) {
  const game = useGame()
  const [q, setQ] = useState('')
  const [tier, setTier] = useState<number | 'rel'>(suggestTraits.length ? 'rel' : 2)
  const list = useMemo(() => {
    const nq = normalize(q)
    const nt = suggestTraits.map(normalize)
    return game.augments.filter((a) => {
      if (exclude.has(a.api)) return false
      if (nq) return normalize(a.name).includes(nq) || normalize(a.desc).includes(nq)
      if (tier === 'rel') {
        const text = normalize(a.name + ' ' + a.desc.replace(/<[^>]+>/g, ' ')).replace(/[^a-z0-9']+/g, ' ')
        return a.traits.some((t) => suggestTraits.includes(t)) || nt.some((t) => (' ' + text).includes(' ' + t))
      }
      return a.tier === tier
    })
  }, [game, q, tier, exclude, suggestTraits])

  return (
    <Modal title="Añadir aumento" onClose={onClose} wide>
      <div className="picker-head">
        <input autoFocus className="input search" placeholder="Buscar por nombre o efecto…" value={q} onChange={(e) => setQ(e.target.value)} />
        {!q && (
          <div className="seg seg-sm">
            {suggestTraits.length > 0 && (
              <button className={tier === 'rel' ? 'on' : ''} onClick={() => setTier('rel')}>
                Relacionados con tu comp
              </button>
            )}
            {[1, 2, 3, 0].map((t) => (
              <button key={t} className={tier === t ? 'on' : ''} onClick={() => setTier(t)} style={{ color: tier === t ? undefined : AUGMENT_TIER[t].color }}>
                {AUGMENT_TIER[t].name}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="aug-list">
        {list.map((a) => (
          <Tip key={a.api} content={() => <AugmentCard aug={a} />}>
            <button className="aug-option" onClick={() => onPick(a.api)}>
              <span className={`aug-ico tier-${a.tier}`}>
                <Img src={a.icon} alt={a.name} />
              </span>
              <span className="aug-option-body">
                <span className="aug-option-name">
                  {a.name}
                  <span className="small" style={{ color: AUGMENT_TIER[a.tier].color }}>
                    {' '}
                    · {AUGMENT_TIER[a.tier].name}
                  </span>
                </span>
                <Rich html={a.desc} className="clamp-2 small muted" />
              </span>
            </button>
          </Tip>
        ))}
        {list.length === 0 && (
          <p className="muted">
            {tier === 'rel'
              ? 'No hay más aumentos que mencionen los rasgos o campeones de tu tablero final. Prueba con Plata, Oro o Prismático.'
              : 'Sin resultados.'}
          </p>
        )}
      </div>
    </Modal>
  )
}
