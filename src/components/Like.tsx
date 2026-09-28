import { useEffect, useState } from 'react'
import { useCloudContext } from '../lib/cloud'
import type { Comp } from '../types'

/** Botón de «me gusta» para comps públicas de la nube. */
export function LikeButton({ comp, size = 'sm' }: { comp: Comp; size?: 'sm' | 'md' }) {
  const ctx = useCloudContext()
  const base = comp.cloud?.likes ?? 0
  const [count, setCount] = useState(base)
  const [busy, setBusy] = useState(false)
  useEffect(() => setCount(base), [base, comp.id])
  if (!ctx || !comp.cloud?.isPublic) return null
  const { cloud, requestLogin } = ctx
  const liked = cloud.liked.has(comp.id)

  return (
    <button
      className={`like-btn ${size} ${liked ? 'on' : ''}`}
      disabled={busy}
      title={cloud.user ? (liked ? 'Quitar me gusta' : 'Me gusta') : 'Inicia sesión para dar me gusta'}
      aria-pressed={liked}
      onClick={async (e) => {
        e.stopPropagation()
        if (!cloud.user) return requestLogin()
        setBusy(true)
        const res = await cloud.toggleLike(comp.id)
        if (res !== null) setCount((c) => Math.max(0, c + (res ? 1 : -1)))
        setBusy(false)
      }}
    >
      <span className="like-heart">{liked ? '♥' : '♡'}</span>
      <span>{count}</span>
    </button>
  )
}
