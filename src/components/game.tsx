import type { CSSProperties } from 'react'
import { useGame } from '../lib/data'
import { AUGMENT_TIER, COST_COLOR, ITEM_CATEGORY_LABEL, STAR_MULT, TRAIT_STYLE } from '../lib/constants'
import type { ActiveTrait } from '../lib/traits'
import type { Augment, Champion, Item } from '../types'
import { Img, Rich, Tip } from './common'

// ---------------- Tooltips ----------------
export function ChampionCard({ champ, stars = 1, items = [] }: { champ: Champion; stars?: number; items?: string[] }) {
  const game = useGame()
  const s = champ.stats
  const m = STAR_MULT[stars] ?? 1
  return (
    <div className="tt-champ">
      <div className="tt-champ-head" style={{ borderColor: COST_COLOR[champ.cost] }}>
        <Img src={champ.icon} alt={champ.name} className="tt-champ-img" />
        <div>
          <div className="tt-title">
            {champ.name} {stars > 1 && <span className="stars-inline">{'★'.repeat(stars)}</span>}
          </div>
          <div className="tt-sub">
            <span className="cost-pill" style={{ background: COST_COLOR[champ.cost] }}>
              {champ.cost} 🪙
            </span>
            {champ.role && <span className="muted">{roleLabel(champ.role)}</span>}
          </div>
          <div className="tt-traits">
            {champ.traits.map((t) => (
              <span key={t} className="tt-trait">
                <Img src={game.trait.get(t)?.icon} alt={t} className="trait-ico-sm" />
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="stat-grid">
        <Stat k="Vida" v={Math.round(s.hp * m)} />
        <Stat k="Maná" v={`${s.initialMana}/${s.mana}`} />
        <Stat k="Daño" v={Math.round(s.ad * m)} />
        <Stat k="Vel. at." v={s.as} />
        <Stat k="Armadura" v={s.armor} />
        <Stat k="Res. mág." v={s.mr} />
        <Stat k="Alcance" v={s.range} />
        <Stat k="Crítico" v={`${Math.round(s.crit * 100)}%`} />
      </div>
      {champ.ability.name && (
        <div className="tt-ability">
          <div className="tt-ability-name">
            <Img src={champ.ability.icon} alt="" className="ability-ico" />
            {champ.ability.name}
          </div>
          <Rich html={champ.ability.desc} />
        </div>
      )}
      {items.length > 0 && (
        <div className="tt-items">
          {items.map((i, idx) => {
            const it = game.item.get(i)
            return it ? (
              <span key={idx} className="tt-item">
                <Img src={it.icon} alt={it.name} className="item-ico-xs" /> {it.name}
              </span>
            ) : null
          })}
        </div>
      )}
    </div>
  )
}

function Stat({ k, v }: { k: string; v: string | number }) {
  return (
    <div className="stat">
      <span className="stat-k">{k}</span>
      <span className="stat-v">{v}</span>
    </div>
  )
}

const ROLES: Record<string, string> = {
  APTank: 'Tanque (PH)',
  ADTank: 'Tanque (DA)',
  APCaster: 'Lanzador (PH)',
  ADCaster: 'Lanzador (DA)',
  ADCarry: 'Carry (DA)',
  APCarry: 'Carry (PH)',
  ADFighter: 'Luchador (DA)',
  APFighter: 'Luchador (PH)',
  ADSpecialist: 'Especialista (DA)',
  APSpecialist: 'Especialista (PH)',
  ADReaper: 'Asesino (DA)',
  APReaper: 'Asesino (PH)',
}
const roleLabel = (r: string) => ROLES[r] ?? r

export function ItemCard({ item }: { item: Item }) {
  const game = useGame()
  return (
    <div className="tt-item-card">
      <div className="tt-row">
        <Img src={item.icon} alt={item.name} className="item-ico-md" />
        <div>
          <div className="tt-title">{item.name}</div>
          <div className="muted small">{ITEM_CATEGORY_LABEL[item.category]}</div>
        </div>
      </div>
      {item.stats.length > 0 && <div className="item-stats">{item.stats.join(' · ')}</div>}
      {item.desc && <Rich html={item.desc} />}
      {item.from.length === 2 && (
        <div className="recipe">
          {item.from.map((f, i) => {
            const c = game.item.get(f)
            return (
              <span key={i} className="recipe-part">
                {i > 0 && <span className="muted">+</span>}
                <Img src={c?.icon} alt={c?.name ?? f} className="item-ico-xs" />
                <span className="small">{c?.name}</span>
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function AugmentCard({ aug }: { aug: Augment }) {
  const t = AUGMENT_TIER[aug.tier]
  return (
    <div className="tt-aug">
      <div className="tt-row">
        <Img src={aug.icon} alt={aug.name} className="aug-ico-md" />
        <div>
          <div className="tt-title">{aug.name}</div>
          <div className="small" style={{ color: t.color }}>
            {t.name}
          </div>
        </div>
      </div>
      <Rich html={aug.desc} />
    </div>
  )
}

export function TraitCard({ name, active }: { name: string; active?: ActiveTrait }) {
  const game = useGame()
  const t = game.trait.get(name)
  if (!t) return null
  const champs = game.champions.filter((c) => c.traits.includes(name))
  return (
    <div className="tt-trait-card">
      <div className="tt-row">
        <TraitHex icon={t.icon} style={active?.style ?? 0} name={name} />
        <div className="tt-title">{t.name}</div>
      </div>
      <div className="bp-row">
        {t.effects.map((e, i) => (
          <span key={i} className={`bp ${active && active.level >= i ? 'bp-on' : ''}`}>
            {e.min}
          </span>
        ))}
      </div>
      <Rich html={t.desc} />
      <div className="trait-champs">
        {champs.map((c) => (
          <Img
            key={c.api}
            src={c.icon}
            alt={c.name}
            className={`mini-champ ${active?.champs.includes(c.api) ? 'is-on' : ''}`}
            style={{ borderColor: COST_COLOR[c.cost] }}
          />
        ))}
      </div>
    </div>
  )
}

// ---------------- Iconos ----------------
export function TraitHex({ icon, style, name, size = 26 }: { icon: string | null; style: number; name: string; size?: number }) {
  const s = TRAIT_STYLE[style] ?? TRAIT_STYLE[0]
  return (
    <span className="trait-hex" style={{ background: s.bg, width: size, height: size * 1.1547 }}>
      <Img src={icon} alt={name} className="trait-hex-img" style={{ filter: style ? 'brightness(0)' : undefined }} />
    </span>
  )
}

export function ItemIcon({
  api,
  size = 28,
  className,
  onClick,
  draggable,
}: {
  api: string
  size?: number
  className?: string
  onClick?: () => void
  draggable?: boolean
}) {
  const game = useGame()
  const item = game.item.get(api)
  if (!item) return <span className="item-ico missing" style={{ width: size, height: size }} />
  return (
    <Tip content={() => <ItemCard item={item} />}>
      <span
        className={`item-ico ${className ?? ''}`}
        style={{ width: size, height: size }}
        onClick={onClick}
        draggable={draggable}
        onDragStart={(e) => {
          e.dataTransfer.setData('application/x-tft', JSON.stringify({ type: 'item', api }))
          e.dataTransfer.effectAllowed = 'copy'
        }}
      >
        <Img src={item.icon} alt={item.name} />
      </span>
    </Tip>
  )
}

export function ChampIcon({
  api,
  size = 44,
  stars,
  items,
  carry,
  showName,
  className,
  style,
}: {
  api: string
  size?: number
  stars?: number
  items?: string[]
  carry?: boolean
  showName?: boolean
  className?: string
  style?: CSSProperties
}) {
  const game = useGame()
  const c = game.champ.get(api)
  if (!c) return null
  return (
    <Tip content={() => <ChampionCard champ={c} stars={stars} items={items} />}>
      <span className={`champ-ico ${className ?? ''}`} style={{ width: size, ...style }}>
        {stars && stars > 1 && <span className={`champ-ico-stars s${stars}`}>{'★'.repeat(stars)}</span>}
        <span className="champ-ico-frame" style={{ borderColor: COST_COLOR[c.cost], width: size, height: size }}>
          <Img src={c.icon} alt={c.name} />
          {carry && <span className="carry-badge">♛</span>}
        </span>
        {items && items.length > 0 && (
          <span className="champ-ico-items">
            {items.map((i, idx) => (
              <span key={idx} className="champ-ico-item">
                <Img src={game.item.get(i)?.icon} alt="" />
              </span>
            ))}
          </span>
        )}
        {showName && <span className="champ-ico-name">{c.name}</span>}
      </span>
    </Tip>
  )
}

export function AugmentIcon({ api, size = 40 }: { api: string; size?: number }) {
  const game = useGame()
  const a = game.augment.get(api)
  if (!a) return null
  return (
    <Tip content={() => <AugmentCard aug={a} />}>
      <span className={`aug-ico tier-${a.tier}`} style={{ width: size, height: size }}>
        <Img src={a.icon} alt={a.name} />
      </span>
    </Tip>
  )
}
