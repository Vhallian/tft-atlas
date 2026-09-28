import { createClient, type Provider, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY) as
  | string
  | undefined

/** null si no hay Supabase configurado: la app funciona solo en local. */
export const supabase: SupabaseClient | null =
  url && key
    ? createClient(url, key, {
        auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true, autoRefreshToken: true },
      })
    : null

/** Proveedores OAuth activados en Supabase, p. ej. VITE_SUPABASE_OAUTH="discord,google" */
export const oauthProviders: Provider[] = ((import.meta.env.VITE_SUPABASE_OAUTH as string | undefined) ?? '')
  .split(',')
  .map((p) => p.trim().toLowerCase())
  .filter(Boolean) as Provider[]
