import { useMemo, useState, type ReactNode } from 'react'
import { Search, SlidersHorizontal, Printer, Download, X, Receipt } from 'lucide-react'
import { useLedger, useUi } from '../store/ledgerStore'
import { ViewTabs } from '../components/ViewTabs'
import { PageHeader } from '../components/Layout'
import { TransactionList } from '../components/TransactionList'
import { Button, Empty, Money } from '../components/ui'
import { filterTransactions, rangeFor, sortTransactions, type Range, type SortKey, type TxFilter } from '../services/calculations'
import { today, startOfMonth, shortDate } from '../utils/dates'
import { TransactionItem } from '../components/TransactionItem'
import { useFx } from '../store/fxStore'
import { exportCSV } from '../services/export'
import { parseAmount } from '../utils/currency'
import type { TxType } from '../types/ledger'

type When = 'all' | 'week' | 'month' | 'year' | 'custom'

export function Transactions() {
  const { data, activeAccounts } = useLedger()
  const { scope, setScope, openPrint, openTx } = useUi()
  const { curOf, toBase, base } = useFx()
  // Totals: in the filtered account's currency, or the main currency (converted at today's rate).
  const cur = scope ? curOf(scope) : base
  const [q, setQ] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [type, setType] = useState<TxType | ''>('')
  const [cat, setCat] = useState('')
  const [when, setWhen] = useState<When>('all')
  const [custom, setCustom] = useState<Range>({ from: startOfMonth(today()), to: today() })
  const [min, setMin] = useState('')
  const [max, setMax] = useState('')
  const [sort, setSort] = useState<SortKey>('newest')

  const range = when === 'all' ? undefined : rangeFor(when, today(), data.settings.weekStart, custom)
  const filter: TxFilter = {
    search: q, accountId: scope || undefined, type: type || undefined, categoryId: cat || undefined, range,
    min: min ? parseAmount(min) : undefined, max: max ? parseAmount(max) : undefined,
  }
  const txs = useMemo(
    () => sortTransactions(filterTransactions(data.transactions, filter, data.categories, data.accounts), sort),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, q, scope, type, cat, when, custom.from, custom.to, min, max, sort],
  )
  const inCur = (t: { amount: number; accountId: string }) => { const c = curOf(t.accountId); return c === cur ? t.amount : toBase(t.amount, c) ?? 0 }
  const spent = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + inCur(t), 0)
  const income = txs.filter((t) => t.type === 'income').reduce((s, t) => s + inCur(t), 0)
  const active = [scope, type, cat, when !== 'all', min, max].filter(Boolean).length
  const roots = data.categories.filter((c) => !c.parentId)
  const grouped = sort === 'newest' || sort === 'oldest'

  const reset = () => { setType(''); setCat(''); setWhen('all'); setMin(''); setMax(''); setScope('') }

  return (
    <>
      <PageHeader title="Activity" eyebrow={`${txs.length} ${txs.length === 1 ? 'transaction' : 'transactions'}`}
        right={
          <>
            <button onClick={() => exportCSV(data, txs)} aria-label="Export filtered as CSV" className="grid h-10 w-10 place-items-center rounded-full bg-card-2 hover:brightness-95"><Download size={16} /></button>
            <button onClick={() => openPrint({ accountId: scope || undefined, period: when === 'week' || when === 'month' ? when : range ? 'custom' : 'month', from: range?.from, to: range?.to })}
              aria-label="Print" className="grid h-10 w-10 place-items-center rounded-full bg-card-2 hover:brightness-95"><Printer size={16} /></button>
          </>
        } />

      <ViewTabs active="list" />

      <div className="flex gap-2">
        <label className="card flex h-12 flex-1 items-center gap-2.5 px-4">
          <Search size={17} className="text-muted" />
          <span className="sr-only">Search transactions</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search transactions…" className="w-full bg-transparent text-[15px] outline-none placeholder:text-faint" />
          {q && <button onClick={() => setQ('')} aria-label="Clear search" className="text-muted"><X size={16} /></button>}
        </label>
        <button onClick={() => setShowFilters((s) => !s)} aria-expanded={showFilters} aria-label="Filters"
          className={`relative grid h-12 w-12 place-items-center rounded-[22px] ${showFilters || active ? 'bg-primary text-primary-ink' : 'card'}`}>
          <SlidersHorizontal size={18} />
          {active > 0 && <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-neg text-[10px] font-bold text-white">{active}</span>}
        </button>
      </div>

      {showFilters && (
        <div className="card mt-3 grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 anim-rise">
          <F label="Account">
            <select className="select w-full" value={scope} onChange={(e) => setScope(e.target.value)}>
              <option value="">All accounts</option>
              {activeAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </F>
          <F label="Type">
            <select className="select w-full" value={type} onChange={(e) => setType(e.target.value as TxType | '')}>
              <option value="">All types</option><option value="expense">Expense</option><option value="income">Income</option><option value="transfer">Transfer</option>
            </select>
          </F>
          <F label="Category">
            <select className="select w-full" value={cat} onChange={(e) => setCat(e.target.value)}>
              <option value="">All categories</option>
              <optgroup label="Expense">{roots.filter((c) => c.type === 'expense').map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}</optgroup>
              <optgroup label="Income">{roots.filter((c) => c.type === 'income').map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}</optgroup>
            </select>
          </F>
          <F label="Date">
            <select className="select w-full" value={when} onChange={(e) => setWhen(e.target.value as When)}>
              <option value="all">All time</option><option value="week">This week</option><option value="month">This month</option><option value="year">This year</option><option value="custom">Custom…</option>
            </select>
          </F>
          <F label="Sort">
            <select className="select w-full" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
              <option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="highest">Highest amount</option><option value="lowest">Lowest amount</option>
            </select>
          </F>
          <F label="Amount">
            <div className="flex gap-1.5">
              <input inputMode="decimal" placeholder="Min" aria-label="Minimum amount" value={min} onChange={(e) => setMin(e.target.value)} className="select w-full !bg-none !pr-3" />
              <input inputMode="decimal" placeholder="Max" aria-label="Maximum amount" value={max} onChange={(e) => setMax(e.target.value)} className="select w-full !bg-none !pr-3" />
            </div>
          </F>
          {when === 'custom' && (
            <div className="col-span-2 flex gap-2 sm:col-span-3">
              <F label="From"><input type="date" className="select w-full !bg-none !pr-3" value={custom.from} onChange={(e) => setCustom({ ...custom, from: e.target.value })} /></F>
              <F label="To"><input type="date" className="select w-full !bg-none !pr-3" value={custom.to} onChange={(e) => setCustom({ ...custom, to: e.target.value })} /></F>
            </div>
          )}
          {active > 0 && <button onClick={reset} className="col-span-2 text-left text-[12px] font-semibold uppercase tracking-[.1em] text-primary sm:col-span-3">Clear filters</button>}
        </div>
      )}

      {txs.length > 0 && (
        <div className="mt-4 flex gap-5 px-1 text-[13px] text-muted">
          <span>Spent <Money value={spent} currency={cur} className="font-semibold text-ink" fracClass="text-[.85em] text-muted" /></span>
          <span>Income <Money value={income} currency={cur} className="font-semibold text-pos" fracClass="text-[.85em] opacity-60" /></span>
        </div>
      )}

      <div className="mt-4">
        {txs.length ? (
          grouped ? <TransactionList txs={txs} scopeAccountId={scope || undefined} /> : (
            <div className="card p-1.5">{txs.map((t) => <TransactionItem key={t.id} tx={t} scopeAccountId={scope || undefined} showDate={shortDate(t.date)} />)}</div>
          )
        ) : data.transactions.length ? (
          <Empty icon={<Search />} title="Nothing matches" body="Try a different search or clear your filters." action={<Button variant="soft" onClick={() => { reset(); setQ('') }}>Clear all</Button>} />
        ) : (
          <Empty icon={<Receipt />} title="No transactions yet" body="Start tracking your spending." action={<Button onClick={() => openTx({ type: 'expense' })}>+ Add Expense</Button>} />
        )}
      </div>
    </>
  )
}

function F({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block min-w-0 flex-1"><span className="eyebrow mb-1.5 block">{label}</span>{children}</label>
}
