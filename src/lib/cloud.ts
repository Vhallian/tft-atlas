import type { Session, User } from '@supabase/supabase-js'
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { Comp } from '../types'
import { sanitize } from './store'
import { supabase } from './supabase'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface Row {
  id: string
  owner: string
  author: string
  name: string
  set: number
  tier: string
  playstyle: string
  is_public: boolean
  data: Partial<Comp>
  created_at: string
  updated_at: string
  likes?: number
}

// '*' para seguir funcionando aunque la base de datos aún no tenga columnas nuevas
const COLUMNS = '*'
const SAVE_DELAY = 800
export const PAGE_SIZE = 30
export type CommunitySort = 'recent' | 'popular'

export function displayName(user: User | null | undefined): string {
  if (!user) return ''
  const m = user.user_metadata ?? {}
  return String(m.display_name || m.full_name || m.name || m.user_name || user.email?.split('@')[0] || 'Jugador').slice(0, 60)
}

export function fromRow(r: Row, set: number): Comp {
  return sanitize(
    {
      ...r.data,
      id: r.id,
      name: r.name,
      createdAt: Date.parse(r.created_at),
      updatedAt: Date.parse(r.updated_at),
      cloud: { owner: r.owner, author: r.author, isPublic: r.is_public, likes: r.likes ?? 0 },
    },
    r.set ?? set,
  )
}

function toRow(c: Comp, user: User) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { cloud, ...data } = c
  return {
    id: c.id,
    owner: user.id,
    author: displayName(user),
    name: c.name.slice(0, 120),
    set: c.set,
    tier: c.tier,
    playstyle: c.playstyle,
    is_public: cloud?.isPublic ?? false,
    data,
  }
}

/** Comps públicas de la comunidad, paginadas */
export async function fetchPublic(set: number, search = '', sort: CommunitySort = 'recent', offset = 0): Promise<Comp[]> {
  const db = supabase
  if (!db) return []
  const s = search.trim().replace(/[%_,()]/g, ' ')
  // cada llamada crea una consulta nueva (los builders de supabase se modifican al encadenar)
  const query = (byLikes: boolean) => {
    let q = db.from('comps').select(COLUMNS).eq('is_public', true).eq('set', set)
    if (s) q = q.or(`name.ilike.%${s}%,author.ilike.%${s}%`)
    if (byLikes) q = q.order('likes', { ascending: false })
    return q.order('updated_at', { ascending: false }).range(offset, offset + PAGE_SIZE - 1)
  }
  let { data, error } = await query(sort === 'popular')
  // base de datos sin la columna `likes` (schema.sql aún no actualizado): orden por fecha
  if (error && sort === 'popular') ({ data, error } = await query(false))
  if (error) throw error
  return (data as Row[]).map((r) => fromRow(r, set))
}

/** Una comp concreta (pública o propia) */
export async function fetchComp(id: string, set: number): Promise<Comp | null> {
  if (!supabase || !/^[0-9a-f-]{36}$/i.test(id)) return null
  const { data, error } = await supabase.from('comps').select(COLUMNS).eq('id', id).maybeSingle()
  if (error) throw error
  return data ? fromRow(data as Row, set) : null
}

/**
 * Sesión del usuario y sus comps en la nube.
 * Los cambios se aplican al momento en pantalla y se guardan con un pequeño retardo.
 */
export function useCloud(set: number, onError: (msg: string) => void) {
  const enabled = !!supabase
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(!enabled)
  const [comps, setComps] = useState<Comp[]>([])
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<SaveStatus>('idle')
  const [liked, setLiked] = useState<Set<string>>(new Set())
  const compsRef = useRef<Comp[]>([])
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const inFlight = useRef(0)
  const user = session?.user ?? null
  const userRef = useRef<User | null>(null)
  userRef.current = user
  const errRef = useRef(onError)
  errRef.current = onError

  const setAll = (next: Comp[]) => {
    compsRef.current = next
    setComps(next)
  }

  // Sesión
  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setReady(true)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      // limpia ?code=… que deja el inicio de sesión con OAuth
      if (s && location.search.includes('code=')) history.replaceState(null, '', location.pathname + location.hash)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  // Cargar mis comps al iniciar sesión
  const uid = user?.id
  useEffect(() => {
    if (!supabase || !uid) {
      setAll([])
      setLiked(new Set())
      return
    }
    let cancelled = false
    setLoading(true)
    supabase
      .from('comps')
      .select(COLUMNS)
      .eq('owner', uid)
      .order('updated_at', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return
        setLoading(false)
        if (error) errRef.current('No se pudieron cargar tus composiciones: ' + error.message)
        else setAll((data as Row[]).map((r) => fromRow(r, set)))
      })
    // mis «me gusta» (si la tabla aún no existe, se ignora)
    setLiked(new Set())
    supabase
      .from('comp_likes')
      .select('comp_id')
      .eq('user_id', uid)
      .then(({ data }) => !cancelled && data && setLiked(new Set(data.map((d) => d.comp_id as string))))
    return () => {
      cancelled = true
    }
  }, [uid, set])

  const save = useCallback(async (id: string) => {
    timers.current.delete(id)
    const c = compsRef.current.find((x) => x.id === id)
    const u = userRef.current
    if (!supabase || !c || !u) return
    inFlight.current++
    setStatus('saving')
    const { error } = await supabase.from('comps').upsert(toRow(c, u))
    inFlight.current--
    if (error) {
      setStatus('error')
      errRef.current('Error al guardar: ' + error.message)
    } else if (inFlight.current === 0 && timers.current.size === 0) setStatus('saved')
  }, [])

  const schedule = useCallback(
    (id: string, delay = SAVE_DELAY) => {
      const t = timers.current.get(id)
      if (t) clearTimeout(t)
      setStatus('saving')
      timers.current.set(
        id,
        setTimeout(() => save(id), delay),
      )
    },
    [save],
  )

  // Guarda lo pendiente si el usuario cambia de pestaña o cierra
  useEffect(() => {
    const flush = () => {
      if (document.visibilityState !== 'hidden') return
      for (const [id, t] of timers.current) {
        clearTimeout(t)
        save(id)
      }
    }
    document.addEventListener('visibilitychange', flush)
    return () => document.removeEventListener('visibilitychange', flush)
  }, [save])

  const update = useCallback(
    (id: string, fn: (c: Comp) => Comp) => {
      const cur = compsRef.current.find((c) => c.id === id)
      if (!cur) return
      const next = { ...fn(cur), updatedAt: Date.now() }
      setAll(compsRef.current.map((c) => (c.id === id ? next : c)))
      schedule(id)
    },
    [schedule],
  )

  /** Añade una comp a la nube (genera un id nuevo). Devuelve el id. */
  const add = useCallback(
    (c: Comp, isPublic = false): string => {
      const u = userRef.current
      const id = crypto.randomUUID()
      const next: Comp = {
        ...c,
        id,
        updatedAt: Date.now(),
        cloud: { owner: u?.id ?? '', author: displayName(u), isPublic },
      }
      setAll([next, ...compsRef.current])
      schedule(id, 0)
      return id
    },
    [schedule],
  )

  const remove = useCallback(async (id: string) => {
    const t = timers.current.get(id)
    if (t) clearTimeout(t)
    timers.current.delete(id)
    const prev = compsRef.current
    setAll(prev.filter((c) => c.id !== id))
    if (!supabase) return
    const { error } = await supabase.from('comps').delete().eq('id', id)
    if (error) {
      setAll(prev)
      errRef.current('No se pudo borrar: ' + error.message)
    }
  }, [])

  const renameAuthor = useCallback(async (name: string) => {
    if (!supabase || !userRef.current) return
    const clean = name.trim().slice(0, 60)
    const { data, error } = await supabase.auth.updateUser({ data: { display_name: clean } })
    if (error) return errRef.current(error.message)
    if (data.user) setSession((s) => (s ? { ...s, user: data.user } : s))
    await supabase.from('comps').update({ author: clean }).eq('owner', userRef.current.id)
    setAll(compsRef.current.map((c) => (c.cloud ? { ...c, cloud: { ...c.cloud, author: clean } } : c)))
  }, [])

  /** Da o quita «me gusta». Devuelve el nuevo estado o null si falló. */
  const likedRef = useRef(liked)
  likedRef.current = liked
  const toggleLike = useCallback(async (id: string): Promise<boolean | null> => {
    if (!supabase || !userRef.current) return null
    const was = likedRef.current.has(id)
    const flip = (on: boolean) =>
      setLiked((prev) => {
        const n = new Set(prev)
        if (on) n.add(id)
        else n.delete(id)
        return n
      })
    flip(!was)
    const { error } = was
      ? await supabase.from('comp_likes').delete().eq('comp_id', id).eq('user_id', userRef.current.id)
      : await supabase.from('comp_likes').insert({ comp_id: id, user_id: userRef.current.id })
    if (error) {
      flip(was)
      errRef.current('No se pudo guardar el «me gusta»')
      return null
    }
    return !was
  }, [])

  const signOut = useCallback(async () => {
    await supabase?.auth.signOut()
  }, [])

  return { enabled, ready, user, comps, loading, status, liked, toggleLike, update, add, remove, renameAuthor, signOut }
}

export type Cloud = ReturnType<typeof useCloud>

/** Acceso a la nube desde cualquier componente (botón de «me gusta», etc.) */
export const CloudContext = createContext<{ cloud: Cloud; requestLogin: () => void } | null>(null)
export const useCloudContext = () => useContext(CloudContext)
