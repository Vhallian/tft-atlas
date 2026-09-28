import { useCallback, useEffect, useState } from 'react'
import { AuthButton, LoginModal } from './components/Auth'
import { ToastProvider, TooltipProvider, useToast } from './components/common'
import { Editor } from './components/Editor'
import { GuideView } from './components/GuideView'
import { Community, Library } from './components/Library'
import { fetchComp, useCloud, type SaveStatus } from './lib/cloud'
import { GameDataProvider, useGame } from './lib/data'
import { seedComps } from './lib/seed'
import { decodeComp, encodeComp } from './lib/share'
import { newComp, sanitize, useComps } from './lib/store'
import { downloadJSON, slug, uid } from './lib/util'
import type { Comp } from './types'

type Route =
  | { view: 'library' }
  | { view: 'community' }
  | { view: 'edit'; id: string }
  | { view: 'guide'; id: string }
  | { view: 'share'; code: string }

function parseHash(): Route {
  const [, view, arg] = location.hash.replace(/^#/, '').split('/')
  if (view === 'community') return { view: 'community' }
  if (view === 'edit' && arg) return { view: 'edit', id: arg }
  if (view === 'guide' && arg) return { view: 'guide', id: arg }
  if (view === 'share' && arg) return { view: 'share', code: arg }
  return { view: 'library' }
}
const go = (hash: string) => {
  location.hash = hash
}
/** Copia sin datos de la nube ni id, lista para guardarse de nuevo */
const detach = (c: Comp, name = c.name): Comp => {
  const copy = structuredClone(c)
  delete copy.cloud
  return { ...copy, id: uid(), name, createdAt: Date.now(), updatedAt: Date.now() }
}

export default function App() {
  return (
    <GameDataProvider>
      <TooltipProvider>
        <ToastProvider>
          <Main />
        </ToastProvider>
      </TooltipProvider>
    </GameDataProvider>
  )
}

function Main() {
  const game = useGame()
  const toast = useToast()
  const [route, setRoute] = useState<Route>(parseHash)
  const local = useComps(game.set, () => seedComps(game))
  const cloud = useCloud(game.set, toast)
  const signedIn = !!cloud.user
  const [loginOpen, setLoginOpen] = useState(false)
  const [shared, setShared] = useState<Comp | null>(null)
  const [remote, setRemote] = useState<{ id: string; comp: Comp | null; done: boolean } | null>(null)

  useEffect(() => {
    const on = () => {
      setRoute(parseHash())
      window.scrollTo({ top: 0 })
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])

  // ---------- acceso unificado a comps (nube + navegador) ----------
  const isCloud = (id: string) => cloud.comps.some((c) => c.id === id)
  const findComp = (id: string) => cloud.comps.find((c) => c.id === id) ?? local.comps.find((c) => c.id === id)
  const addComp = (c: Comp): string => (signedIn ? cloud.add(c) : local.add(detach(c, c.name)))
  const updateComp = (id: string, fn: (c: Comp) => Comp) => (isCloud(id) ? cloud.update(id, fn) : local.update(id, fn))
  const removeComp = (id: string) => (isCloud(id) ? cloud.remove(id) : local.remove(id))
  const duplicateComp = (id: string) => {
    const src = findComp(id)
    if (!src) return null
    const copy = detach(src, src.name + ' (copia)')
    return src.cloud ? cloud.add(copy) : local.add(copy)
  }
  const upload = (ids: string[]) => {
    let n = 0
    for (const id of ids) {
      const c = local.comps.find((x) => x.id === id)
      if (!c) continue
      cloud.add(c)
      local.remove(id)
      n++
    }
    toast(`${n} composición(es) subida(s) a tu cuenta`)
  }

  // comp de otra persona (o aún no cargada) → pedirla a la base de datos
  const routeId = route.view === 'edit' || route.view === 'guide' ? route.id : null
  const found = routeId ? findComp(routeId) : undefined
  const needRemote = !!routeId && !found && cloud.enabled && cloud.ready && !cloud.loading
  useEffect(() => {
    if (!needRemote || !routeId || remote?.id === routeId) return
    setRemote({ id: routeId, comp: null, done: false })
    fetchComp(routeId, game.set)
      .then((c) => setRemote({ id: routeId, comp: c, done: true }))
      .catch(() => setRemote({ id: routeId, comp: null, done: true }))
  }, [needRemote, routeId, remote?.id, game.set])

  const shareCode = route.view === 'share' ? route.code : null
  useEffect(() => {
    if (!shareCode) return
    setShared(null)
    decodeComp(shareCode)
      .then((c) => setShared(sanitize({ ...c, cloud: undefined }, game.set)))
      .catch(() => toast('El enlace compartido no es válido'))
  }, [shareCode, game.set, toast])

  const share = useCallback(
    async (c: Comp) => {
      let url: string
      if (c.cloud?.isPublic) url = `${location.origin}${location.pathname}#/guide/${c.id}`
      else url = `${location.origin}${location.pathname}#/share/${await encodeComp({ ...c, cloud: undefined })}`
      try {
        await navigator.clipboard.writeText(url)
        toast(c.cloud?.isPublic ? 'Enlace copiado' : 'Enlace copiado (incluye una copia de la comp)')
      } catch {
        prompt('Copia este enlace:', url)
      }
    },
    [toast],
  )

  const confirmDelete = (c: Comp) => {
    if (confirm(`¿Eliminar «${c.name}»? No se puede deshacer.`)) {
      removeComp(c.id)
      go('/')
      toast('Composición eliminada')
    }
  }

  const copyToMine = (c: Comp) => {
    const id = addComp(detach(c))
    toast(signedIn ? 'Copiada a tu cuenta' : 'Copiada a este navegador')
    go(`/edit/${id}`)
  }

  async function importFile(file: File) {
    try {
      const data = JSON.parse(await file.text())
      const list: Partial<Comp>[] = Array.isArray(data) ? data : Array.isArray(data.comps) ? data.comps : [data]
      let n = 0
      for (const raw of list) {
        if (!raw || typeof raw !== 'object' || !raw.levels) continue
        addComp(detach(sanitize(raw, game.set)))
        n++
      }
      toast(n ? `${n} composición(es) importada(s)` : 'El archivo no contiene composiciones')
    } catch {
      toast('No se pudo leer el archivo')
    }
  }

  const copyAction = (c: Comp) => (
    <button className="btn primary" onClick={() => copyToMine(c)}>
      ⧉ Copiar a mis comps
    </button>
  )

  // ---------- vistas ----------
  const comp = found
  let body: React.ReactNode
  if (route.view === 'library') {
    body = (
      <Library
        local={local.comps}
        cloud={cloud.enabled ? cloud.comps : null}
        cloudLoading={cloud.loading}
        signedIn={signedIn}
        onOpen={(id) => go(`/edit/${id}`)}
        onGuide={(id) => go(`/guide/${id}`)}
        onNew={() => go(`/edit/${addComp(newComp(game.set))}`)}
        onImport={importFile}
        onExportAll={() =>
          downloadJSON(`tft-atlas-set${game.set}.json`, {
            comps: [...cloud.comps, ...local.comps].map((c) => ({ ...c, cloud: undefined })),
          })
        }
        onDuplicate={(id) => {
          duplicateComp(id)
          toast('Composición duplicada')
        }}
        onDelete={(id) => {
          const c = findComp(id)
          if (c) confirmDelete(c)
        }}
        onUpload={upload}
        onLogin={() => setLoginOpen(true)}
      />
    )
  } else if (route.view === 'community') {
    body = cloud.enabled ? (
      <Community onGuide={(id) => go(`/guide/${id}`)} onCopy={copyToMine} />
    ) : (
      <div className="empty-state panel">
        <h3>La comunidad no está activada</h3>
        <p className="muted">Configura Supabase (ver README) para compartir composiciones entre usuarios.</p>
      </div>
    )
  } else if (route.view === 'share') {
    body = shared ? <GuideView comp={shared} actions={copyAction(shared)} /> : <Spinner />
  } else if (!comp) {
    const r = remote?.id === routeId ? remote : null
    if (r?.comp) body = <GuideView comp={r.comp} actions={copyAction(r.comp)} />
    else if (cloud.enabled && (!cloud.ready || cloud.loading || (needRemote && !r?.done))) body = <Spinner />
    else
      body = (
        <div className="empty-state panel">
          <h3>Composición no encontrada</h3>
          <p className="muted">Puede que sea privada o que se haya borrado.</p>
          <button className="btn" onClick={() => go('/')}>
            Volver a la biblioteca
          </button>
        </div>
      )
  } else if (route.view === 'guide') {
    body = (
      <GuideView
        comp={comp}
        actions={
          <>
            <button className="btn primary" onClick={() => go(`/edit/${comp.id}`)}>
              ✎ Editar
            </button>
            <button className="btn" onClick={() => share(comp)}>
              🔗 Compartir
            </button>
            <button className="btn ghost" onClick={() => window.print()}>
              🖨 Imprimir
            </button>
          </>
        }
      />
    )
  } else {
    const inCloud = !!comp.cloud
    body = (
      <Editor
        comp={comp}
        update={(fn) => updateComp(comp.id, fn)}
        onGuide={() => go(`/guide/${comp.id}`)}
        onShare={() => share(comp)}
        onExport={() => downloadJSON(`${slug(comp.name)}.json`, { ...comp, cloud: undefined })}
        onDuplicate={() => {
          const id = duplicateComp(comp.id)
          if (id) go(`/edit/${id}`)
          toast('Composición duplicada')
        }}
        onDelete={() => confirmDelete(comp)}
        cloudControls={
          inCloud ? (
            <>
              <button
                className={`btn vis-toggle ${comp.cloud!.isPublic ? 'pub' : ''}`}
                title={comp.cloud!.isPublic ? 'Visible en la comunidad. Clic para hacerla privada.' : 'Solo tú la ves. Clic para publicarla.'}
                onClick={() => {
                  const pub = !comp.cloud!.isPublic
                  updateComp(comp.id, (c) => ({ ...c, cloud: { ...c.cloud!, isPublic: pub } }))
                  toast(pub ? 'Publicada en la comunidad' : 'Ahora es privada')
                }}
              >
                {comp.cloud!.isPublic ? '🌐 Pública' : '🔒 Privada'}
              </button>
              <SaveIndicator status={cloud.status} />
            </>
          ) : signedIn ? (
            <button className="btn" onClick={() => (upload([comp.id]), go('/'))} title="Mover esta comp a tu cuenta">
              ☁ Subir a mi cuenta
            </button>
          ) : cloud.enabled ? (
            <span className="save-ind muted" title="Inicia sesión para guardarla en la nube">
              💻 Solo en este navegador
            </span>
          ) : null
        }
      />
    )
  }

  return (
    <div className="app">
      <header className="topbar">
        <a className="brand" href="#/">
          <span className="brand-hex">⬢</span>
          <span>
            TFT <b>Atlas</b>
          </span>
        </a>
        <nav className="topnav">
          <a href="#/" className={route.view === 'library' ? 'on' : ''}>
            Mis comps
          </a>
          {cloud.enabled && (
            <a href="#/community" className={route.view === 'community' ? 'on' : ''}>
              Comunidad
            </a>
          )}
          {comp && (
            <>
              <span className="muted">/</span>
              <a href={`#/guide/${comp.id}`} className={route.view === 'guide' ? 'on' : ''}>
                Guía
              </a>
              <a href={`#/edit/${comp.id}`} className={route.view === 'edit' ? 'on' : ''}>
                Editor
              </a>
            </>
          )}
        </nav>
        <div className="grow" />
        <span className="set-badge" title={`Datos: CommunityDragon ${game.version ?? ''}`}>
          Set {game.set} · {game.setName}
        </span>
        <AuthButton cloud={cloud} />
      </header>
      <main className="main">{body}</main>
      <footer className="footer small muted">
        Datos del juego: CommunityDragon ({game.version?.split('+')[0] ?? '—'}). TFT Atlas no está afiliado a Riot Games.
      </footer>
      {loginOpen && <LoginModal onClose={() => setLoginOpen(false)} />}
    </div>
  )
}

function Spinner() {
  return (
    <div className="splash">
      <div className="spinner" />
    </div>
  )
}

function SaveIndicator({ status }: { status: SaveStatus }) {
  const map: Record<SaveStatus, string> = {
    idle: '☁ En la nube',
    saving: '⟳ Guardando…',
    saved: '✓ Guardado',
    error: '⚠ Error al guardar',
  }
  return <span className={`save-ind ${status}`}>{map[status]}</span>
}
