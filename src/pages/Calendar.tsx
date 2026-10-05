import { useState } from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useLedger, useUi } from '../store/ledgerStore'
import { ViewTabs } from '../components/ViewTabs'
import { PageHeader, ScopeSelect } from '../components/Layout'
import { Button, Money } from '../components/ui'
import { dailySpend, rangeFor, sortTransactions, txTouches } from '../services/calculations'
import { addDays, fromISODate, longDate, shiftMonth, startOfWeek, today } from '../utils/dates'
import { compact } from '../utils/currency'
import { useBaseTransactions, useFx } from '../store/fxStore'
import { TransactionItem } from '../components/TransactionItem'

export function Calendar() {
  const { data } = useLedger()
  const { scope, openTx } = useUi()
  const [month, setMonth] = useState(today().slice(0, 8) + '01')
  const [sel, setSel] = useState(today())
  const { curOf, base } = useFx()
  const { txs: baseTxs } = useBaseTransactions()
  const cur = scope ? curOf(scope) : base
  const source = scope ? data.transactions : baseTxs
  const ws = data.settings.weekStart
  const range = rangeFor('month', month, ws)
  const spend = dailySpend(source, range, scope || undefined)
  const max = Math.max(1, ...Object.values(spend))
  const monthTotal = Object.values(spend).reduce((s, v) => s + v, 0)

  // Build grid
  const first = startOfWeek(range.from, ws)
  const cells: string[] = []
  for (let d = first; d <= range.to || cells.length % 7; d = addDays(d, 1)) cells.push(d)
  const dow = Array.from({ length: 7 }, (_, i) => fromISODate(addDays(first, i)).toLocaleDateString('en-US', { weekday: 'short' }))

  const dayTx = sortTransactions(data.transactions.filter((t) => t.date === sel && (!scope || txTouches(t, scope))), 'newest')
  const daySpent = source.filter((t) => t.date === sel && t.type === 'expense' && (!scope || t.accountId === scope)).reduce((s, t) => s + t.amount, 0)
  const t0 = today()

  return (
    <>
      <PageHeader title="Calendar" eyebrow={fromISODate(month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} right={<ScopeSelect />} />

      <ViewTabs active="calendar" />

      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <section className="card p-4 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <button onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month" className="grid h-10 w-10 place-items-center rounded-full hover:bg-card-2"><ChevronLeft size={18} /></button>
            <div className="text-center">
              <p className="text-[16px] font-semibold">{fromISODate(month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
              <p className="text-[12px] text-muted">Spent <Money value={monthTotal} currency={cur} className="font-semibold text-ink" fracClass="" /></p>
            </div>
            <button onClick={() => setMonth(shiftMonth(month, 1))} disabled={shiftMonth(month, 1) > t0} aria-label="Next month" className="grid h-10 w-10 place-items-center rounded-full hover:bg-card-2 disabled:opacity-30"><ChevronRight size={18} /></button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center" role="grid" aria-label="Month">
            {dow.map((d) => <div key={d} className="pb-2 text-[10px] font-semibold uppercase tracking-[.12em] text-faint" role="columnheader">{d}</div>)}
            {cells.map((d) => {
              const inMonth = d >= range.from && d <= range.to
              const v = spend[d] ?? 0
              const isSel = d === sel
              const isToday = d === t0
              const intensity = v ? 0.12 + 0.5 * (v / max) : 0
              return (
                <button key={d} role="gridcell" aria-selected={isSel} aria-label={`${longDate(d)}${v ? `, spent ${compact(v, cur)}` : ''}`}
                  onClick={() => setSel(d)} disabled={!inMonth}
                  className={`relative flex aspect-square flex-col items-center justify-center rounded-2xl text-[14px] transition-colors disabled:invisible
                    ${isSel ? 'bg-primary text-primary-ink' : 'hover:bg-card-2'} ${isToday && !isSel ? 'ring-1 ring-primary' : ''}`}
                  style={!isSel && v ? { background: `color-mix(in srgb, var(--primary) ${Math.round(intensity * 100)}%, transparent)` } : undefined}>
                  <span className={`font-semibold ${!isSel && intensity > 0.4 ? 'text-primary-ink' : ''}`}>{fromISODate(d).getDate()}</span>
                  {v > 0 && <span className={`tnum hidden text-[9px] sm:block ${isSel || intensity > 0.4 ? 'opacity-80' : 'text-muted'}`}>{compact(v, cur)}</span>}
                  {v > 0 && <span className={`mt-0.5 h-1 w-1 rounded-full sm:hidden ${isSel ? 'bg-primary-ink' : 'bg-primary'}`} />}
                </button>
              )
            })}
          </div>
        </section>

        <section>
          <div className="card p-5">
            <p className="eyebrow">{longDate(sel)}</p>
            <div className="mt-2 flex items-end justify-between">
              <div>
                <p className="text-[12px] text-muted">Spent</p>
                <Money value={daySpent} currency={cur} className="text-[32px] font-medium tracking-tight" fracClass="text-[.5em] text-muted" />
              </div>
              <Button size="sm" variant="soft" onClick={() => openTx({ type: 'expense', date: sel })}><Plus size={14} /> Add</Button>
            </div>
          </div>
          <div className="card mt-3 p-1.5">
            {dayTx.length ? dayTx.map((t) => <TransactionItem key={t.id} tx={t} scopeAccountId={scope || undefined} />) :
              <p className="px-4 py-8 text-center text-sm text-muted">No transactions on this day.</p>}
          </div>
        </section>
      </div>
    </>
  )
}
