import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'

// ---------------- Imagen con respaldo ----------------
export function Img({
  src,
  alt,
  className,
  style,
}: {
  src: string | null | undefined
  alt: string
  className?: string
  style?: CSSProperties
}) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [src])
  if (!src || failed)
    return (
      <span className={`img-fallback ${className ?? ''}`} style={style} aria-label={alt}>
        {alt.slice(0, 2)}
      </span>
    )
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      loading="lazy"
      draggable={false}
      onError={() => setFailed(true)}
    />
  )
}

// ---------------- Tooltip global ----------------
type TipState = { content: ReactNode; x: number; y: number } | null
const TipCtx = createContext<(s: TipState) => void>(() => {})

export function TooltipProvider({ children }: { children: ReactNode }) {
  const [tip, setTip] = useState<TipState>(null)
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ left: 0, top: 0 })

  useLayoutEffect(() => {
    if (!tip || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    const pad = 12
    let left = tip.x + 16
    let top = tip.y + 16
    if (left + r.width > window.innerWidth - pad) left = tip.x - r.width - 16
    if (top + r.height > window.innerHeight - pad) top = Math.max(pad, window.innerHeight - r.height - pad)
    setPos({ left: Math.max(pad, left), top })
  }, [tip])

  useEffect(() => {
    const hide = () => setTip(null)
    window.addEventListener('scroll', hide, true)
    window.addEventListener('dragstart', hide, true)
    return () => {
      window.removeEventListener('scroll', hide, true)
      window.removeEventListener('dragstart', hide, true)
    }
  }, [])

  return (
    <TipCtx.Provider value={setTip}>
      {children}
      {tip &&
        createPortal(
          <div ref={ref} className="tooltip" style={pos}>
            {tip.content}
          </div>,
          document.body,
        )}
    </TipCtx.Provider>
  )
}

/** Envuelve un elemento y muestra `content` al pasar el ratón. */
export function Tip({
  content,
  children,
  className,
  style,
}: {
  content: () => ReactNode
  children: ReactNode
  className?: string
  style?: CSSProperties
}) {
  const set = useContext(TipCtx)
  const move = useCallback((e: React.MouseEvent) => set({ content: content(), x: e.clientX, y: e.clientY }), [content, set])
  return (
    <span
      className={`tip-anchor ${className ?? ''}`}
      style={style}
      onMouseEnter={move}
      onMouseMove={move}
      onMouseLeave={() => set(null)}
      onMouseDown={() => set(null)}
    >
      {children}
    </span>
  )
}

// ---------------- Modal ----------------
export function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: ReactNode
  onClose: () => void
  children: ReactNode
  wide?: boolean
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return createPortal(
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true">
        <header className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </header>
        <div className="modal-body">{children}</div>
      </div>
    </div>,
    document.body,
  )
}

// ---------------- Toasts ----------------
const ToastCtx = createContext<(msg: string) => void>(() => {})
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([])
  const push = useCallback((msg: string) => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, msg }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600)
  }, [])
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts">
        {toasts.map((t) => (
          <div key={t.id} className="toast">
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}
export const useToast = () => useContext(ToastCtx)

// ---------------- HTML de descripciones generado por el script de datos ----------------
export function Rich({ html, className }: { html: string; className?: string }) {
  return <div className={`rich ${className ?? ''}`} dangerouslySetInnerHTML={{ __html: html }} />
}

// ---------------- Área de texto que crece ----------------
export function AutoTextarea({
  value,
  onChange,
  placeholder,
  minRows = 3,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  minRows?: number
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 2 + 'px'
  }, [value])
  return (
    <textarea
      ref={ref}
      className="textarea"
      rows={minRows}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}
