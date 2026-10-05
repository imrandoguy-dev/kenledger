import { useState } from 'react'
import { ArrowRightLeft, Plus, RefreshCw, X } from 'lucide-react'
import { useFx } from '../store/fxStore'
import { CURRENCIES } from '../utils/constants'
import { currencyMeta, money } from '../utils/currency'
import { formatRate } from '../services/fx'
import { longDate } from '../utils/dates'

const POPULAR = ['INR', 'AED', 'USD', 'EUR', 'GBP', 'SAR']

/** Default targets: main currency first, then the most common ones, excluding the source. */
export function defaultTargets(from: string, base: string, n = 3) {
  return [base, ...POPULAR].filter((c, i, a) => c !== from && a.indexOf(c) === i).slice(0, n)
}

/** "This balance is worth…" card for one amount in one currency. */
export function WorthToday({ amount, currency, title = 'Worth today' }: { amount: number; currency: string; title?: string }) {
  const { convert, base, rates, status, refresh, openConverter } = useFx()
  const [targets, setTargets] = useState(() => defaultTargets(currency, base))
  const [adding, setAdding] = useState(false)
  const [spinning, setSpinning] = useState(false)

  return (
    <section className="card p-5" aria-label={title}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">{title}</p>
          <p className="mt-1 text-[12px] text-muted">
            {rates ? `Rates for ${longDate(rates.date)}` : status === 'loading' ? 'Getting today’s rates…' : 'Rates unavailable offline'}
          </p>
        </div>
        <div className="flex gap-1.5">
          <button onClick={async () => { setSpinning(true); await refresh(); setSpinning(false) }} aria-label="Refresh rates"
            className="grid h-9 w-9 place-items-center rounded-full bg-card-2 text-muted hover:text-ink"><RefreshCw size={15} className={spinning ? 'animate-spin' : ''} /></button>
          <button onClick={() => openConverter({ amount: Math.abs(amount), from: currency, to: targets[0] })} aria-label="Open converter"
            className="grid h-9 w-9 place-items-center rounded-full bg-card-2 text-muted hover:text-ink"><ArrowRightLeft size={15} /></button>
        </div>
      </div>

      <ul className="mt-3 divide-y divide-line">
        {targets.map((to) => {
          const v = convert(amount, currency, to)
          const r = convert(1, currency, to)
          return (
            <li key={to} className="flex items-center gap-3 py-3">
              <span className="text-xl" aria-hidden>{currencyMeta(to).flag}</span>
              <div className="min-w-0 flex-1">
                <p className="tnum truncate text-[17px] font-semibold">{v == null ? '—' : money(v, to)}</p>
                <p className="tnum text-[12px] text-muted">{r == null ? to : `1 ${currency} = ${formatRate(r)} ${to}`}</p>
              </div>
              {targets.length > 1 && (
                <button onClick={() => setTargets(targets.filter((t) => t !== to))} aria-label={`Remove ${to}`}
                  className="grid h-8 w-8 place-items-center rounded-full text-faint hover:bg-card-2 hover:text-ink"><X size={14} /></button>
              )}
            </li>
          )
        })}
      </ul>

      {adding ? (
        <select autoFocus aria-label="Add a currency" className="select mt-2 w-full" defaultValue=""
          onChange={(e) => { if (e.target.value) setTargets([...targets, e.target.value]); setAdding(false) }} onBlur={() => setAdding(false)}>
          <option value="" disabled>Choose a currency…</option>
          {CURRENCIES.filter((c) => c.code !== currency && !targets.includes(c.code)).map((c) => (
            <option key={c.code} value={c.code}>{c.flag} {c.code} · {c.label}</option>
          ))}
        </select>
      ) : (
        <button onClick={() => setAdding(true)} className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[.1em] text-primary">
          <Plus size={14} /> Add currency
        </button>
      )}
    </section>
  )
}
