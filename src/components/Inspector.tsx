import { useState } from 'react'
import { useGame } from '../lib/data'
import { COST_COLOR, POOL_SIZE, SHOP_ODDS, XP_TO_LEVEL } from '../lib/constants'
import type { CarryBuild, Placement } from '../types'
import { Img } from './common'
import { ChampionCard, ItemIcon } from './game'
import { ItemPicker } from './Pickers'

interface Props {
  unit: Placement | null
  onChange: (u: Placement) => void
  onRemove: () => void
  builds: CarryBuild[]
  level: number
  units: Placement[]
}

export function Inspector({ unit, onChange, onRemove, builds, level, units }: Props) {
  const game = useGame()
  const [picking, setPicking] = useState(false)
  const champ = unit ? game.champ.get(unit.champ) : null

  if (!unit || !champ) return <LevelInfo level={level} units={units} />

  const build = builds.find((b) => b.champ === champ.api)
  const addItem = (api: string) => {
    if (unit.items.length >= 3) return
    onChange({ ...unit, items: [...unit.items, api] })
  }

  return (
    <div className="inspector">
      <div className="insp-splash" style={{ borderColor: COST_COLOR[champ.cost] }}>
        <Img src={champ.splash ?? champ.icon} alt={champ.name} />
      </div>
      <ChampionCard champ={champ} stars={unit.stars} />

      <div className="insp-section">
        <label className="lbl">Estrellas</label>
        <div className="seg">
          {([1, 2, 3] as const).map((s) => (
            <button key={s} className={unit.stars === s ? 'on' : ''} onClick={() => onChange({ ...unit, stars: s })}>
              {'★'.repeat(s)}
            </button>
          ))}
        </div>
        <label className="check">
          <input type="checkbox" checked={!!unit.carry} onChange={(e) => onChange({ ...unit, carry: e.target.checked })} />
          Marcar como carry ♛
        </label>
      </div>

      <div className="insp-section">
        <label className="lbl">Objetos</label>
        <div className="slots">
          {[0, 1, 2].map((i) => {
            const it = unit.items[i]
            return it ? (
              <div key={i} className="slot filled" title="Clic para quitar">
                <ItemIcon api={it} size={44} onClick={() => onChange({ ...unit, items: unit.items.filter((_, j) => j !== i) })} />
              </div>
            ) : (
              <button key={i} className="slot" onClick={() => setPicking(true)} disabled={unit.items.length >= 3}>
                +
              </button>
            )
          })}
        </div>
        {build && build.variants.length > 0 && (
          <div className="insp-builds">
            <span className="small muted">Aplicar build guardada:</span>
            {build.variants.map((v) => (
              <button key={v.id} className="chip" onClick={() => onChange({ ...unit, items: v.items.slice(0, 3) })}>
                {v.items.map((i) => (
                  <Img key={i} src={game.item.get(i)?.icon} alt="" className="item-ico-xs" />
                ))}
                {v.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <button className="btn danger block" onClick={onRemove}>
        Quitar del tablero
      </button>

      {picking && (
        <ItemPicker
          title={`Objeto para ${champ.name}`}
          onClose={() => setPicking(false)}
          onPick={(api) => {
            addItem(api)
            setPicking(false)
          }}
        />
      )}
    </div>
  )
}

export function ShopOdds({ level }: { level: number }) {
  const odds = SHOP_ODDS[level] ?? SHOP_ODDS[10]
  return (
    <div className="odds">
      {odds.map((p, i) => (
        <div key={i} className="odds-col" title={`Coste ${i + 1}: ${p}%`}>
          <div className="odds-bar">
            <div className="odds-fill" style={{ height: `${p}%`, background: COST_COLOR[i + 1] }} />
          </div>
          <span className="odds-pct">{p}%</span>
          <span className="odds-cost" style={{ color: COST_COLOR[i + 1] }}>
            {i + 1}🪙
          </span>
        </div>
      ))}
    </div>
  )
}

function LevelInfo({ level, units }: { level: number; units: Placement[] }) {
  const game = useGame()
  const gold = units.reduce((s, u) => {
    const c = game.champ.get(u.champ)
    return s + (c ? c.cost * 3 ** (u.stars - 1) : 0)
  }, 0)
  return (
    <div className="inspector empty">
      <h4>Nivel {level}</h4>
      <p className="small muted">Probabilidades de tienda en este nivel</p>
      <ShopOdds level={level} />
      <div className="kv">
        <span>Unidades en tablero</span>
        <b className={units.length > level ? 'warn' : ''}>
          {units.length} / {level}
        </b>
      </div>
      <div className="kv">
        <span>Valor del tablero</span>
        <b>{gold} 🪙</b>
      </div>
      {XP_TO_LEVEL[level] && (
        <div className="kv">
          <span>XP para llegar a nivel {level}</span>
          <b>{XP_TO_LEVEL[level]}</b>
        </div>
      )}
      <div className="kv">
        <span>Copias por campeón (1–5)</span>
        <b>{Object.values(POOL_SIZE).join(' / ')}</b>
      </div>
      <div className="help">
        <p>
          <b>Cómo usar el tablero</b>
        </p>
        <ul>
          <li>Arrastra campeones desde el panel inferior.</li>
          <li>Arrastra entre hexágonos para moverlos o intercambiarlos.</li>
          <li>Doble clic: cambia estrellas. Clic derecho: quitar.</li>
          <li>Clic en una unidad para editar sus objetos.</li>
          <li>Arrastra una unidad al panel inferior para quitarla.</li>
        </ul>
      </div>
    </div>
  )
}
