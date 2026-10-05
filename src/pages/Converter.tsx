import { useEffect, useState } from 'react'
import { ArrowDownUp, Loader2, RefreshCw } from 'lucide-react'
import { useLedger } from '../store/ledgerStore'
import { useFx } from '../store/fxStore'
import { PageHeader } from '../components/Layout'
import { Bubble, SectionHead } from '../components/ui'
import { CURRENCIES } from '../utils/constants'
import { currencyMeta, money, parseAmount } from '../utils/currency'
import { convertWith, fetchForDate, formatRate, type RateTable } from '../services/fx'
import { longDate, today } from '../utils/dates'
import { defaultTargets } from '../components/Conversions'

const OLDEST = '2024-03-02' // earliest day the free rate history covers

export function Converter() {
  const { activeAccounts, balances } = useLedger()
  const { rates: latest, status, error, refresh, base, preset } = useFx()

  const [amount, setAmount] = useState(() => (preset?.amount != null ? String(Math.round(preset.amount * 100) / 100) : '1'))
  const fromInit = preset?.from ?? (base === 'USD' ? 'AED' : 'USD')
  const [from, setFrom] = useState(fromInit)
  const [to, setTo] = useState(() => preset?.to ?? (fromInit !== base ? base : base === 'INR' ? 'AED' : 'INR'))
  const [date, setDate] = useState(today())
  const [past, setPast] = useState<RateTable | null>(null)
  const [pastState, setPastState] = useState<'idle' | 'loading' | 'error'>('idle')
  const [spinning, setSpinning] = useState(false)

  const isToday = date === today()

  // Opening the converter again from another screen (e.g. an account) applies its amount and currency.
  useEffect(() => {
    if (!preset) return
    if (preset.amount != null) setAmount(String(Math.round(preset.amount * 100) / 100))
    if (preset.from) setFrom(preset.from)
    if (preset.to) setTo(preset.to)
  }, [preset])

  useEffect(() => {
    if (isToday) { setPast(null); setPastState('idle'); return }
    let alive = true
    setPastState('loading')
    fetchForDate(date)
      .then((t) => { if (alive) { setPast(t); setPastState('idle') } })
      .catch(() => { if (alive) { setPast(null); setPastState('error') } })
    return () => { alive = false }
  }, [date, isToday])

  const table = isToday ? latest : past
  const n = parseAmount(amount)
  const value = Number.isFinite(n) ? convertWith(table, n, from, to) : null
  const rate = convertWith(table, 1, from, to)
  const inverse = convertWith(table, 1, to, from)
  const others = defaultTargets(from, base, 6).filter((c) => c !== to).slice(0, 5)

  const loading = (isToday && status === 'loading' && !latest) || pastState === 'loading'
  const unavailable = isToday ? !latest : pastState === 'error'

  // Account balances in the chosen "to" currency.
  const accountRows = activeAccounts.map((a) => {
    const cur = a.currency || base
    const bal = balances[a.id] ?? 0
    return { a, cur, bal, conv: convertWith(table, bal, cur, to) }
  })
  const accountsTotal = accountRows.reduce((s, r) => s + (r.conv ?? 0), 0)
  const anyMissing = accountRows.some((r) => r.conv == null)

  return (
    <>
      <PageHeader title="Currency" eyebrow={table ? `Rates for ${longDate(table.date)}` : 'Exchange rates'}
        right={
          <button onClick={async () => { setSpinning(true); await refresh(); setSpinning(false) }} aria-label="Refresh rates"
            className="grid h-10 w-10 place-items-center rounded-full bg-card-2 hover:brightness-95">
            <RefreshCw size={16} className={spinning ? 'animate-spin' : ''} />
          </button>
        } />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <section className="card min-w-0 p-5 sm:p-6" aria-label="Converter">
          <label className="eyebrow" htmlFor="fx-amount">Amount</label>
          <div className="mt-1 flex items-center gap-3 border-b border-line pb-2 focus-within:border-primary">
            <span className="text-2xl text-muted">{currencyMeta(from).symbol.trim()}</span>
            <input id="fx-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.,]/g, ''))}
              className="tnum min-w-0 flex-1 bg-transparent text-[40px] font-medium tracking-tight outline-none placeholder:text-faint" placeholder="0" />
          </div>

          <div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2">
            <CurrencySelect id="fx-from" label="From" value={from} onChange={setFrom} />
            <button onClick={() => { setFrom(to); setTo(from) }} aria-label="Swap currencies"
              className="mb-0.5 grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-ink transition-transform hover:rotate-180">
              <ArrowDownUp size={17} />
            </button>
            <CurrencySelect id="fx-to" label="To" value={to} onChange={setTo} />
          </div>

          <div className="mt-6 rounded-[20px] bg-card-2/70 p-5">
            {loading ? (
              <p className="flex items-center gap-2 text-sm text-muted"><Loader2 size={16} className="animate-spin" /> Getting rates…</p>
            ) : unavailable ? (
              <p className="text-sm text-neg">{isToday ? (error ?? 'Rates aren’t available right now.') : 'No rates found for that day. Try another date.'}</p>
            ) : (
              <>
                <p className="text-[13px] text-muted">{Number.isFinite(n) ? money(n, from) : '—'} =</p>
                <p className="tnum mt-1 break-words text-[36px] font-semibold leading-tight tracking-tight text-primary sm:text-[42px]">
                  {value == null ? '—' : money(value, to)}
                </p>
                {rate != null && inverse != null && (
                  <p className="tnum mt-2 text-[13px] text-muted">1 {from} = {formatRate(rate)} {to} · 1 {to} = {formatRate(inverse)} {from}</p>
                )}
              </>
            )}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="eyebrow mr-1">Rate date</span>
            <button onClick={() => setDate(today())} aria-pressed={isToday}
              className={`h-9 rounded-full px-3.5 text-[13px] font-medium ${isToday ? 'bg-primary text-primary-ink' : 'bg-card-2'}`}>Today</button>
            <label className="sr-only" htmlFor="fx-date">Pick a past date</label>
            <input id="fx-date" type="date" min={OLDEST} max={today()} value={date} onChange={(e) => e.target.value && setDate(e.target.value)}
              className={`select !bg-none !pr-3 ${!isToday ? 'ring-2 ring-primary' : ''}`} />
          </div>
          <p className="mt-3 text-[11px] text-faint">Mid-market rates, updated daily. Your bank or exchange may charge a little more.</p>
        </section>

        <section className="card min-w-0 p-4 sm:p-5" aria-label="Same amount in other currencies">
          <p className="eyebrow px-1 pb-1 pt-1">{Number.isFinite(n) ? money(n, from) : 'This amount'} in</p>
          <ul className="divide-y divide-line">
            {others.map((c) => {
              const v = Number.isFinite(n) ? convertWith(table, n, from, c) : null
              const r = convertWith(table, 1, from, c)
              return (
                <li key={c}>
                  <button onClick={() => setTo(c)} className="flex w-full items-center gap-3 rounded-2xl px-1 py-3 text-left hover:bg-card-2/60">
                    <span className="text-xl" aria-hidden>{currencyMeta(c).flag}</span>
                    <span className="min-w-0 flex-1">
                      <span className="tnum block truncate text-[16px] font-semibold">{v == null ? '—' : money(v, c)}</span>
                      <span className="tnum text-[12px] text-muted">{r == null ? currencyMeta(c).label : `1 ${from} = ${formatRate(r)} ${c}`}</span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      </div>

      {activeAccounts.length > 0 && (
        <>
          <SectionHead title={`Your accounts in ${to}`} />
          <section className="card p-1.5">
            {accountRows.map(({ a, cur, bal, conv }) => (
              <button key={a.id} onClick={() => { setFrom(cur); setAmount(String(Math.abs(bal))) }}
                className="flex w-full items-center gap-3.5 rounded-[18px] px-3 py-3 text-left hover:bg-card-2/70">
                <Bubble color={a.color}>{a.icon}</Bubble>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold">{a.name}</span>
                  <span className="tnum block truncate text-[12px] text-muted">{money(bal, cur)}</span>
                </span>
                <span className="tnum text-right text-[16px] font-semibold">{conv == null ? '—' : `${cur !== to ? '≈ ' : ''}${money(conv, to)}`}</span>
              </button>
            ))}
            {accountRows.length > 1 && (
              <div className="mt-1 flex items-center justify-between border-t border-line px-3 py-3.5">
                <span className="text-[13px] font-semibold uppercase tracking-[.1em] text-muted">Total{anyMissing ? ' (some missing)' : ''}</span>
                <span className="tnum text-[18px] font-semibold">≈ {money(accountsTotal, to)}</span>
              </div>
            )}
          </section>
          <p className="mt-2 px-1 text-[12px] text-muted">Tap an account to convert its balance above.</p>
        </>
      )}
    </>
  )
}

function CurrencySelect({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  const known = CURRENCIES.some((c) => c.code === value)
  return (
    <label htmlFor={id} className="block min-w-0">
      <span className="eyebrow mb-1.5 block">{label}</span>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="select w-full min-w-0 truncate !py-2.5 text-[15px] font-semibold">
        {!known && <option value={value}>{value}</option>}
        {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.flag} {c.code} · {c.label}</option>)}
      </select>
    </label>
  )
}
