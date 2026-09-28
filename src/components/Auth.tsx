import { useState } from 'react'
import { displayName, type Cloud } from '../lib/cloud'
import { oauthProviders, supabase } from '../lib/supabase'
import { Modal, useToast } from './common'

const PROVIDER_LABEL: Record<string, string> = {
  discord: 'Discord',
  google: 'Google',
  github: 'GitHub',
  twitch: 'Twitch',
  twitter: 'X / Twitter',
}

export function AuthButton({ cloud }: { cloud: Cloud }) {
  const [open, setOpen] = useState(false)
  if (!cloud.enabled || !cloud.ready) return null
  return (
    <>
      {cloud.user ? (
        <button className="btn sm user-btn" onClick={() => setOpen(true)} title="Tu cuenta">
          <span className="avatar">{displayName(cloud.user).slice(0, 1).toUpperCase()}</span>
          <span className="user-name">{displayName(cloud.user)}</span>
        </button>
      ) : (
        <button className="btn sm primary" onClick={() => setOpen(true)}>
          Iniciar sesión
        </button>
      )}
      {open && (cloud.user ? <AccountModal cloud={cloud} onClose={() => setOpen(false)} /> : <LoginModal onClose={() => setOpen(false)} />)}
    </>
  )
}

export function LoginModal({ onClose }: { onClose: () => void }) {
  const toast = useToast()
  const [mode, setMode] = useState<'in' | 'up' | 'reset'>('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const redirectTo = location.origin + location.pathname

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setBusy(true)
    setMsg(null)
    try {
      if (mode === 'in') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        toast('Sesión iniciada')
        onClose()
      } else if (mode === 'up') {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo } })
        if (error) throw error
        if (data.session) {
          toast('Cuenta creada')
          onClose()
        } else setMsg({ kind: 'ok', text: 'Te hemos enviado un correo para confirmar la cuenta. Ábrelo y vuelve aquí.' })
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
        if (error) throw error
        setMsg({ kind: 'ok', text: 'Si el correo existe, recibirás un enlace para entrar y cambiar la contraseña.' })
      }
    } catch (err) {
      setMsg({ kind: 'err', text: translate((err as Error).message) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title={mode === 'up' ? 'Crear cuenta' : mode === 'reset' ? 'Recuperar contraseña' : 'Iniciar sesión'} onClose={onClose}>
      <div className="auth">
        <p className="small muted">Guarda tus composiciones en la nube y publícalas para la comunidad.</p>
        {oauthProviders.length > 0 && mode !== 'reset' && (
          <>
            <div className="oauth">
              {oauthProviders.map((p) => (
                <button
                  key={p}
                  className={`btn block oauth-${p}`}
                  onClick={() => supabase?.auth.signInWithOAuth({ provider: p, options: { redirectTo } })}
                >
                  Continuar con {PROVIDER_LABEL[p] ?? p}
                </button>
              ))}
            </div>
            <div className="auth-sep">
              <span>o con tu email</span>
            </div>
          </>
        )}
        <form onSubmit={submit} className="auth-form">
          <input
            className="input"
            type="email"
            required
            autoComplete="email"
            placeholder="tu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {mode !== 'reset' && (
            <input
              className="input"
              type="password"
              required
              minLength={6}
              autoComplete={mode === 'up' ? 'new-password' : 'current-password'}
              placeholder="Contraseña (mín. 6 caracteres)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
          {msg && <p className={`auth-msg ${msg.kind}`}>{msg.text}</p>}
          <button className="btn primary block" disabled={busy}>
            {busy ? '…' : mode === 'in' ? 'Entrar' : mode === 'up' ? 'Crear cuenta' : 'Enviar enlace'}
          </button>
        </form>
        <div className="auth-links small">
          {mode !== 'in' && (
            <button className="link" onClick={() => (setMode('in'), setMsg(null))}>
              Ya tengo cuenta
            </button>
          )}
          {mode !== 'up' && (
            <button className="link" onClick={() => (setMode('up'), setMsg(null))}>
              Crear una cuenta
            </button>
          )}
          {mode === 'in' && (
            <button className="link" onClick={() => (setMode('reset'), setMsg(null))}>
              He olvidado mi contraseña
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}

function AccountModal({ cloud, onClose }: { cloud: Cloud; onClose: () => void }) {
  const toast = useToast()
  const [name, setName] = useState(displayName(cloud.user))
  const [password, setPassword] = useState('')
  const pub = cloud.comps.filter((c) => c.cloud?.isPublic).length
  return (
    <Modal title="Tu cuenta" onClose={onClose}>
      <div className="auth">
        <p className="small muted">
          {cloud.user?.email} · {cloud.comps.length} composiciones ({pub} públicas)
        </p>
        <label className="lbl">Nombre visible en la comunidad</label>
        <div className="row">
          <input className="input grow" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
          <button
            className="btn"
            disabled={!name.trim() || name === displayName(cloud.user)}
            onClick={async () => {
              await cloud.renameAuthor(name)
              toast('Nombre actualizado')
            }}
          >
            Guardar
          </button>
        </div>
        <label className="lbl">Nueva contraseña</label>
        <div className="row">
          <input
            className="input grow"
            type="password"
            minLength={6}
            autoComplete="new-password"
            placeholder="Déjalo vacío para no cambiarla"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            className="btn"
            disabled={password.length < 6}
            onClick={async () => {
              const { error } = await supabase!.auth.updateUser({ password })
              toast(error ? translate(error.message) : 'Contraseña cambiada')
              if (!error) setPassword('')
            }}
          >
            Cambiar
          </button>
        </div>
        <button
          className="btn danger block"
          onClick={async () => {
            await cloud.signOut()
            toast('Sesión cerrada')
            onClose()
          }}
        >
          Cerrar sesión
        </button>
      </div>
    </Modal>
  )
}

function translate(m: string) {
  if (/invalid login credentials/i.test(m)) return 'Email o contraseña incorrectos.'
  if (/email not confirmed/i.test(m)) return 'Confirma tu email antes de entrar (revisa tu correo).'
  if (/already registered/i.test(m)) return 'Ese email ya tiene cuenta. Inicia sesión.'
  if (/rate limit/i.test(m)) return 'Demasiados intentos. Espera unos minutos.'
  if (/password should be/i.test(m)) return 'La contraseña es demasiado corta.'
  return m
}
