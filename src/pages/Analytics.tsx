import { useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, Printer, PieChart as PieIcon } from 'lucide-react'
import { useLedger, useUi } from '../store/ledgerStore'
import { PageHeader, ScopeSelect } from '../components/Layout'
import { Empty, Money, Segmented, SectionHead } from '../components/ui'
import { SpendingDonut, CategoryBreakdown, TrendChart } from '../components/Charts'
import { categoryBreakdown, rangeFor, summarize, trend } from '../services/calculations'
import { addDays, fromISODate, shiftMonth, shortDate, today } from '../utils/dates'
import { money } from '../utils/currency'
import { useBaseTransactions, useFx } from '../store/fxStore'

type P = 'week' | 'month' | 'year'

export function Analytics() {
  const { data } = useLedger()
  const { scope, openPrint } = useUi()
  const [period, setPeriod] = useState<P>('month')
  const [anchor, setAnchor] = useState(today())
  const { curOf, base, mixed } = useFx()
  const { txs: baseTxs } = useBaseTransactions()
  const ws = data.settings.weekStart
  const range = rangeFor(period, anchor, ws)
  const acc = scope || undefined

  // One account → its own currency. All accounts → main currency (others converted at today's rate).
  const cur = acc ? curOf(acc) : base
  const source = acc ? data.transactions : baseTxs
  const sum = summarize(source, range, acc)
  const slices = categoryBreakdown(source, range, data.categories, acc)
  const points = trend(source, period, range, ws, acc)

  // Previous period for comparison
  const prevAnchor = step(period, anchor, -1)
  const prev = summarize(source, rangeFor(period, prevAnchor, ws), acc)
  const delta = prev.spent ? ((sum.spent - prev.spent) / prev.spent) * 100 : null

  const label = periodLabel(period, range.from, range.to)
  const isCurrent = today() >= range.from && today() <= range.to
  const top = slices[0]

  return (
    <>
      <PageHeader title="Analytics" eyebrow={label} right={<>
        <ScopeSelect />
        <button onClick={() => openPrint({ period: period === 'year' ? 'custom' : period, from: range.from, to: range.to, accountId: acc })} aria-label="Print report"
          className="grid h-10 w-10 place-items-center rounded-full bg-card-2 hover:brightness-95"><Printer size={16} /></button>
      </>} />

      <div className="flex items-center gap-2">
        <Segmented<P> label="Period" value={period} onChange={(p) => { setPeriod(p); setAnchor(today()) }} className="flex-1 sm:max-w-sm"
          options={[{ value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }, { value: 'year', label: 'Year' }]} />
        <div className="flex items-center gap-1">
          <button onClick={() => setAnchor(step(period, anchor, -1))} aria-label="Previous period" className="grid h-11 w-11 place-items-center rounded-full bg-card-2 hover:brightness-95"><ChevronLeft size={18} /></button>
          <button onClick={() => setAnchor(step(period, anchor, 1))} disabled={isCurrent} aria-label="Next period" className="grid h-11 w-11 place-items-center rounded-full bg-card-2 hover:brightness-95 disabled:opacity-30"><ChevronRight size={18} /></button>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="card p-6">
          <p className="eyebrow">Total spent{!acc && mixed ? ` · in ${base}` : ''}</p>
          <Money value={sum.spent} currency={cur} className="mt-2 block text-[40px] font-medium leading-none tracking-[-0.03em]" fracClass="text-[.5em] text-muted font-normal" />
          {delta != null && (
            <p className={`mt-2 text-[13px] font-medium ${delta > 0 ? 'text-neg' : 'text-pos'}`}>
              {delta > 0 ? '▲' : '▼'} {Math.abs(Math.round(delta))}% vs previous {period}
            </p>
          )}
          <div className="mt-6">
            <SpendingDonut slices={slices} total={sum.spent} currency={cur} />
          </div>
        </section>

        <section className="card p-4 sm:p-5">
          <p className="eyebrow px-2 pb-2 pt-1">Category breakdown</p>
          {slices.length ? <CategoryBreakdown slices={slices} currency={cur} /> :
            <p className="px-2 py-10 text-center text-sm text-muted">No spending in this {period}.</p>}
        </section>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Income" value={money(sum.income, cur)} tone="pos" />
        <Metric label="Net" value={money(sum.net, cur, { sign: true })} tone={sum.net < 0 ? 'neg' : 'pos'} />
        <Metric label="Average / day" value={money(sum.avgPerDay, cur)} />
        <Metric label="Transactions" value={String(sum.count)} />
      </div>

      <SectionHead title="Spending" />
      <section className="card p-4 sm:p-6">
        {sum.count ? <TrendChart points={points} currency={cur} showIncome /> :
          <Empty icon={<PieIcon />} title="No data yet" body="Transactions in this period will appear here." />}
      </section>

      {sum.expenseCount > 0 && (
        <>
          <SectionHead title="Your spending" />
          <section className="card divide-y divide-line">
            {top && <Insight>{top.name} accounts for <b>{Math.round(top.pct)}%</b> of your spending this {period}.</Insight>}
            <Insight>Your average daily spending {isCurrent ? 'so far ' : ''}is <b>{money(sum.avgPerDay, cur)}</b>.</Insight>
            {sum.largest && <Insight>Your largest expense was <b>{sum.largest.description} · {money(sum.largest.amount, cur)}</b> on {shortDate(sum.largest.date)}.</Insight>}
            {delta != null && Math.abs(delta) >= 1 && <Insight>You spent <b>{Math.abs(Math.round(delta))}% {delta > 0 ? 'more' : 'less'}</b> than the previous {period} ({money(prev.spent, cur)}).</Insight>}
          </section>
        </>
      )}
      {!acc && mixed && (
        <p className="mt-6 px-1 text-[12px] text-muted">Spending in other currencies is converted to {base} at today’s exchange rate.</p>
      )}
    </>
  )
}

function step(p: P, anchor: string, n: number) {
  if (p === 'week') return addDays(anchor, 7 * n)
  if (p === 'month') return shiftMonth(anchor, n)
  const d = fromISODate(anchor)
  return `${d.getFullYear() + n}-01-01`
}

function periodLabel(p: P, from: string, to: string) {
  const f = fromISODate(from)
  if (p === 'year') return String(f.getFullYear())
  if (p === 'month') return f.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  return `${shortDate(from)} – ${shortDate(to)}`
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: 'pos' | 'neg' }) {
  return (
    <div className="card p-4">
      <p className="eyebrow">{label}</p>
      <p className={`tnum mt-1.5 truncate text-[19px] font-semibold ${tone === 'pos' ? 'text-pos' : tone === 'neg' ? 'text-neg' : ''}`}>{value}</p>
    </div>
  )
}

function Insight({ children }: { children: ReactNode }) {
  return <p className="px-5 py-4 text-[15px] leading-relaxed text-muted [&_b]:font-semibold [&_b]:text-ink">{children}</p>
}
