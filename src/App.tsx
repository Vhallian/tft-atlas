import { useCallback, useEffect, useState } from 'react'
import { ToastProvider, TooltipProvider, useToast } from './components/common'
import { Editor } from './components/Editor'
import { GuideView } from './components/GuideView'
import { Library } from './components/Library'
import { GameDataProvider, useGame } from './lib/data'
import { seedComps } from './lib/seed'
import { decodeComp, encodeComp } from './lib/share'
import { newComp, sanitize, useComps } from './lib/store'
import { downloadJSON, slug, uid } from './lib/util'
import type { Comp } from './types'

type Route =
  | { view: 'library' }
  | { view: 'edit'; id: string }
  | { view: 'guide'; id: string }
  | { view: 'share'; code: string }

function parseHash(): Route {
  const [, view, arg] = location.hash.replace(/^#/, '').split('/')
  if (view === 'edit' && arg) return { view: 'edit', id: arg }
  if (view === 'guide' && arg) return { view: 'guide', id: arg }
  if (view === 'share' && arg) return { view: 'share', code: arg }
  return { view: 'library' }
}
const go = (hash: string) => {
  location.hash = hash
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
  const { comps, update, add, remove, duplicate } = useComps(game.set, () => seedComps(game))
  const [shared, setShared] = useState<Comp | null>(null)

  useEffect(() => {
    const on = () => {
      setRoute(parseHash())
      window.scrollTo({ top: 0 })
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])

  const shareCode = route.view === 'share' ? route.code : null
  useEffect(() => {
    if (!shareCode) return
    setShared(null)
    decodeComp(shareCode)
      .then((c) => setShared(sanitize(c, game.set)))
      .catch(() => toast('El enlace compartido no es válido'))
  }, [shareCode, game.set, toast])

  const comp = route.view === 'edit' || route.view === 'guide' ? comps.find((c) => c.id === route.id) : undefined

  const share = useCallback(
    async (c: Comp) => {
      const code = await encodeComp(c)
      const url = `${location.origin}${location.pathname}#/share/${code}`
      try {
        await navigator.clipboard.writeText(url)
        toast('Enlace copiado al portapapeles')
      } catch {
        prompt('Copia este enlace:', url)
      }
    },
    [toast],
  )

  const confirmDelete = (c: Comp) => {
    if (confirm(`¿Eliminar «${c.name}»? No se puede deshacer.`)) {
      remove(c.id)
      go('/')
      toast('Composición eliminada')
    }
  }

  async function importFile(file: File) {
    try {
      const data = JSON.parse(await file.text())
      const list: Partial<Comp>[] = Array.isArray(data) ? data : Array.isArray(data.comps) ? data.comps : [data]
      const ids = new Set(comps.map((c) => c.id))
      let n = 0
      for (const raw of list) {
        if (!raw || typeof raw !== 'object' || !raw.levels) continue
        const c = sanitize(raw, game.set)
        if (ids.has(c.id)) c.id = uid()
        add(c)
        n++
      }
      toast(n ? `${n} composición(es) importada(s)` : 'El archivo no contiene composiciones')
    } catch {
      toast('No se pudo leer el archivo')
    }
  }

  let body: React.ReactNode
  if (route.view === 'library') {
    body = (
      <Library
        comps={comps}
        onOpen={(id) => go(`/edit/${id}`)}
        onGuide={(id) => go(`/guide/${id}`)}
        onNew={() => go(`/edit/${add(newComp(game.set))}`)}
        onImport={importFile}
        onExportAll={() => downloadJSON(`tft-atlas-set${game.set}.json`, { comps })}
        onDuplicate={(id) => {
          duplicate(id)
          toast('Composición duplicada')
        }}
        onDelete={(id) => {
          const c = comps.find((x) => x.id === id)
          if (c) confirmDelete(c)
        }}
      />
    )
  } else if (route.view === 'share') {
    body = shared ? (
      <GuideView
        comp={shared}
        actions={
          <button
            className="btn primary"
            onClick={() => {
              const id = add({ ...shared, id: uid(), updatedAt: Date.now() })
              toast('Guardada en tu biblioteca')
              go(`/edit/${id}`)
            }}
          >
            ⇩ Guardar en mi biblioteca
          </button>
        }
      />
    ) : (
      <div className="splash">
        <div className="spinner" />
      </div>
    )
  } else if (!comp) {
    body = (
      <div className="empty-state panel">
        <h3>Composición no encontrada</h3>
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
    body = (
      <Editor
        comp={comp}
        update={(fn) => update(comp.id, fn)}
        onGuide={() => go(`/guide/${comp.id}`)}
        onShare={() => share(comp)}
        onExport={() => downloadJSON(`${slug(comp.name)}.json`, comp)}
        onDuplicate={() => {
          const id = duplicate(comp.id)
          if (id) go(`/edit/${id}`)
          toast('Composición duplicada')
        }}
        onDelete={() => confirmDelete(comp)}
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
            Biblioteca
          </a>
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
      </header>
      <main className="main">{body}</main>
      <footer className="footer small muted">
        Datos del juego: CommunityDragon ({game.version?.split('+')[0] ?? '—'}). TFT Atlas no está afiliado a Riot Games.
        Tus composiciones se guardan en este navegador.
      </footer>
    </div>
  )
}
