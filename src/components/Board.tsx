import { useEffect, useState, type CSSProperties, type RefObject } from 'react'
import { useGame } from '../lib/data'
import { COLS, COST_COLOR, ROWS } from '../lib/constants'
import type { Placement } from '../types'
import { Img, Tip } from './common'
import { ChampionCard } from './game'

export type DragPayload =
  | { type: 'champ'; api: string }
  | { type: 'unit'; row: number; col: number }
  | { type: 'item'; api: string }

export const DND_TYPE = 'application/x-tft'

export function readDrag(e: React.DragEvent): DragPayload | null {
  try {
    return JSON.parse(e.dataTransfer.getData(DND_TYPE))
  } catch {
    return null
  }
}

interface Props {
  units: Placement[]
  onChange?: (units: Placement[]) => void
  selected?: { row: number; col: number } | null
  onSelect?: (pos: { row: number; col: number } | null) => void
  /** campeón «armado» desde el panel para colocar con un clic (útil en táctil) */
  armed?: string | null
  onPlaced?: () => void
  size?: number
  readOnly?: boolean
}

export function Board({ units, onChange, selected, onSelect, armed, onPlaced, size = 76, readOnly }: Props) {
  const game = useGame()
  const [over, setOver] = useState<string | null>(null)
  const gap = Math.round(size * 0.06)
  const w = size
  const h = size * 1.1547
  const stepX = w + gap
  const stepY = h * 0.75 + gap
  const width = COLS * stepX + stepX / 2
  const height = (ROWS - 1) * stepY + h + 26

  const at = (r: number, c: number) => units.find((u) => u.row === r && u.col === c)

  function apply(p: DragPayload, row: number, col: number) {
    if (!onChange) return
    const target = at(row, col)
    if (p.type === 'champ') {
      const rest = units.filter((u) => u !== target)
      onChange([...rest, { champ: p.api, row, col, stars: target?.stars ?? 1, items: target?.items ?? [] }])
      onSelect?.({ row, col })
    } else if (p.type === 'unit') {
      if (p.row === row && p.col === col) return
      const src = at(p.row, p.col)
      if (!src) return
      onChange(
        units.map((u) => {
          if (u === src) return { ...u, row, col }
          if (u === target) return { ...u, row: p.row, col: p.col }
          return u
        }),
      )
      onSelect?.({ row, col })
    } else if (p.type === 'item') {
      if (!target) return
      const item = game.item.get(p.api)
      if (target.items.length >= 3) return
      if (item?.category === 'emblem') {
        const c = game.champ.get(target.champ)
        if (c?.traits.includes(item.trait ?? '') || target.items.includes(p.api)) return
      }
      onChange(units.map((u) => (u === target ? { ...u, items: [...u.items, p.api] } : u)))
    }
  }

  const cells = []
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const u = at(r, c)
      const key = `${r}-${c}`
      const left = c * stepX + (r % 2 === 1 ? stepX / 2 : 0)
      const top = r * stepY + 14
      const isSel = selected?.row === r && selected?.col === c
      const champ = u ? game.champ.get(u.champ) : null
      const style: CSSProperties = { left, top, width: w, height: h }

      cells.push(
        <div
          key={key}
          className={`hex-cell ${over === key ? 'is-over' : ''} ${isSel ? 'is-sel' : ''} ${armed && !readOnly ? 'is-armed' : ''}`}
          style={style}
          onDragOver={(e) => {
            if (readOnly || !e.dataTransfer.types.includes(DND_TYPE)) return
            e.preventDefault()
            setOver(key)
          }}
          onDragLeave={() => setOver((o) => (o === key ? null : o))}
          onDrop={(e) => {
            e.preventDefault()
            setOver(null)
            const p = readDrag(e)
            if (p) apply(p, r, c)
          }}
          onClick={() => {
            if (readOnly) return
            if (armed) {
              apply({ type: 'champ', api: armed }, r, c)
              onPlaced?.()
            } else onSelect?.(u ? { row: r, col: c } : null)
          }}
          onDoubleClick={() => {
            if (readOnly || !u || !onChange) return
            onChange(units.map((x) => (x === u ? { ...x, stars: ((x.stars % 3) + 1) as 1 | 2 | 3 } : x)))
          }}
          onContextMenu={(e) => {
            if (readOnly || !u || !onChange) return
            e.preventDefault()
            onChange(units.filter((x) => x !== u))
            if (isSel) onSelect?.(null)
          }}
        >
          <div className="hex hex-outer" style={{ background: champ ? COST_COLOR[champ.cost] : undefined }}>
            <div className="hex hex-inner">
              {champ && (
                <Tip content={() => <ChampionCard champ={champ} stars={u!.stars} items={u!.items} />} className="hex-tip">
                  <div
                    className="hex-unit"
                    draggable={!readOnly}
                    onDragStart={(e) => {
                      e.dataTransfer.setData(DND_TYPE, JSON.stringify({ type: 'unit', row: r, col: c }))
                      e.dataTransfer.effectAllowed = 'move'
                    }}
                  >
                    <Img src={champ.icon} alt={champ.name} className="hex-img" />
                    <span className="hex-name">{champ.name}</span>
                  </div>
                </Tip>
              )}
            </div>
          </div>
          {u && u.stars > 1 && <div className={`hex-stars s${u.stars}`}>{'★'.repeat(u.stars)}</div>}
          {u?.carry && <div className="hex-carry" title="Carry">♛</div>}
          {u && u.items.length > 0 && (
            <div className="hex-items">
              {u.items.map((i, idx) => (
                <span key={idx} className="hex-item">
                  <Img src={game.item.get(i)?.icon} alt={game.item.get(i)?.name ?? ''} />
                </span>
              ))}
            </div>
          )}
        </div>,
      )
    }
  }

  return (
    <div className={`board ${readOnly ? 'is-readonly' : ''} ${size < 62 ? 'is-compact' : ''}`} style={{ width, height }}>
      {cells}
    </div>
  )
}

/** Busca el primer hueco libre, priorizando la fila según el alcance del campeón. */
export function firstFreeSlot(units: Placement[], range: number): { row: number; col: number } | null {
  const rows = range >= 3 ? [3, 2, 1, 0] : [0, 1, 2, 3]
  const order = [3, 2, 4, 1, 5, 0, 6]
  for (const r of rows)
    for (const c of order) if (!units.some((u) => u.row === r && u.col === c)) return { row: r, col: c }
  return null
}

/** Calcula el tamaño de hexágono que cabe en el ancho del contenedor. */
export function useHexFit(ref: RefObject<HTMLElement | null>, max = 88) {
  const [size, setSize] = useState(max - 12)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => {
      const w = e.contentRect.width - 16
      setSize(Math.max(36, Math.min(max, Math.floor(w / (7.5 * 1.06)))))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref, max])
  return size
}
