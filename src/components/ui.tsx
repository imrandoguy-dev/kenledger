import { useEffect, useId, useRef, useState, type ReactNode, type ButtonHTMLAttributes } from 'react'
import { X } from 'lucide-react'
import { moneyParts } from '../utils/currency'

/* ---------- Money: big whole number with muted fraction, like the reference ---------- */
export function Money({ value, currency, className = '', fracClass = 'text-[0.5em] text-muted font-medium', sign }: {
  value: number; currency: string; className?: string; fracClass?: string; sign?: boolean
}) {
  const { whole, frac } = moneyParts(value, currency)
  const prefix = sign && value > 0 ? '+' : ''
  return (
    <span className={`tnum whitespace-nowrap ${className}`}>
      {prefix}{whole}<span className={fracClass}>{frac}</span>
    </span>
  )
}

/* ---------- Smoothly counts to a new value when it changes ---------- */
export function useAnimatedNumber(target: number, ms = 600) {
  const [v, setV] = useState(target)
  const from = useRef(target)
  useEffect(() => {
    const start = performance.now()
    const a = from.current
    if (a === target) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setV(target); from.current = target; return }
    let raf = 0
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / ms)
      const e = 1 - Math.pow(1 - p, 3)
      setV(a + (target - a) * e)
      if (p < 1) raf = requestAnimationFrame(tick)
      else from.current = target
    }
    raf = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(raf); from.current = target }
  }, [target, ms])
  return v
}

/* ---------- Buttons ---------- */
type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'soft' | 'danger'; size?: 'md' | 'lg' | 'sm' }
export function Button({ variant = 'primary', size = 'md', className = '', ...rest }: BtnProps) {
  const v = {
    primary: 'bg-primary text-primary-ink hover:brightness-110 active:brightness-95',
    soft: 'bg-card-2 text-ink hover:brightness-[.97] active:brightness-95',
    ghost: 'text-ink hover:bg-card-2',
    danger: 'bg-neg text-white hover:brightness-110',
  }[variant]
  const s = { sm: 'h-9 px-3.5 text-[13px]', md: 'h-11 px-5 text-sm', lg: 'h-14 px-6 text-[15px]' }[size]
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-[filter,background,transform] active:scale-[.98] disabled:opacity-40 disabled:pointer-events-none ${v} ${s} ${className}`}
    />
  )
}

/* ---------- Segmented control (Week | Month | Year, Expense | Income | Transfer) ---------- */
export function Segmented<T extends string>({ value, onChange, options, className = '', label }: {
  value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; className?: string; label: string
}) {
  return (
    <div role="tablist" aria-label={label} className={`flex rounded-full bg-card-2 p-1 ${className}`}>
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={`flex-1 h-9 rounded-full px-3 text-[12px] font-semibold tracking-[.08em] uppercase transition-colors ${
            value === o.value ? 'bg-primary text-primary-ink shadow-sm' : 'text-muted hover:text-ink'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* ---------- Icon bubble ---------- */
export function Bubble({ children, color, size = 44, className = '' }: { children: ReactNode; color?: string; size?: number; className?: string }) {
  return (
    <span
      className={`inline-grid shrink-0 place-items-center rounded-full ${className}`}
      style={{ width: size, height: size, background: color ? `color-mix(in srgb, ${color} 14%, var(--card-2))` : 'var(--card-2)', fontSize: size * 0.42 }}
      aria-hidden
    >
      {children}
    </span>
  )
}

/* ---------- Accessible sheet / dialog (bottom sheet on mobile, modal on desktop) ---------- */
export function Sheet({ open, onClose, title, children, footer, wide }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; wide?: boolean
}) {
  const id = useId()
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    const el = ref.current
    const focusables = () => el ? [...el.querySelectorAll<HTMLElement>('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')].filter((n) => !n.hasAttribute('disabled')) : []
    requestAnimationFrame(() => {
      const first = el?.querySelector<HTMLElement>('[data-autofocus]') ?? focusables()[0]
      first?.focus()
    })
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose() }
      if (e.key === 'Tab') {
        const f = focusables()
        if (!f.length) return
        const first = f[0], last = f[f.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = overflow; prev?.focus?.() }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <div className="anim-fade absolute inset-0 bg-deep/40 backdrop-blur-[2px]" onClick={onClose} />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        className={`anim-sheet relative flex max-h-[92dvh] w-full flex-col rounded-t-[28px] bg-bg shadow-2xl sm:rounded-[28px] ${wide ? 'sm:max-w-2xl' : 'sm:max-w-md'}`}
      >
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-line sm:hidden" />
        <header className="flex items-center justify-between px-5 pb-2 pt-3 sm:pt-5">
          <h2 id={id} className="text-[17px] font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-card-2 hover:text-ink">
            <X size={18} />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 pb-4">{children}</div>
        {footer && <div className="pb-safe border-t border-line px-5 pt-3">{footer}</div>}
      </div>
    </div>
  )
}

/* ---------- Confirm ---------- */
export function Confirm({ open, title, body, confirmLabel, onConfirm, onCancel, danger = true }: {
  open: boolean; title: string; body: ReactNode; confirmLabel: string; onConfirm: () => void; onCancel: () => void; danger?: boolean
}) {
  return (
    <Sheet open={open} onClose={onCancel} title={title}
      footer={
        <div className="flex gap-3">
          <Button variant="soft" className="flex-1" onClick={onCancel} data-autofocus>Cancel</Button>
          <Button variant={danger ? 'danger' : 'primary'} className="flex-1" onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      }>
      <div className="py-2 text-[15px] text-muted">{body}</div>
    </Sheet>
  )
}

/* ---------- Empty state ---------- */
export function Empty({ icon, title, body, action }: { icon: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center px-6 py-12 text-center anim-rise">
      <div className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-card-2 text-primary">{icon}</div>
      <p className="eyebrow !text-ink">{title}</p>
      <p className="mt-2 max-w-[240px] text-sm text-muted">{body}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

/* ---------- Section heading ---------- */
export function SectionHead({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-3 mt-8 flex items-end justify-between px-1">
      <h2 className="eyebrow">{title}</h2>
      {action}
    </div>
  )
}

export function LinkBtn({ children, onClick, href }: { children: ReactNode; onClick?: () => void; href?: string }) {
  const cls = 'text-[11px] font-semibold uppercase tracking-[.12em] text-primary underline decoration-2 underline-offset-4 hover:opacity-80'
  return href ? <a href={href} className={cls}>{children}</a> : <button onClick={onClick} className={cls}>{children}</button>
}
