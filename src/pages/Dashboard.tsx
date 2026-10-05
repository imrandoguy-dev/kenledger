import type { ReactNode } from 'react'
import { Plus, ArrowLeftRight, ArrowRightLeft, TrendingUp, Printer, Receipt } from 'lucide-react'
import { useBaseTransactions, useFx } from '../store/fxStore'
import { useLedger, useUi } from '../store/ledgerStore'
import { PageHeader, ScopeSelect } from '../components/Layout'
import { AccountCard } from '../components/AccountCard'
import { TransactionList } from '../components/TransactionList'
import { Empty, LinkBtn, Money, SectionHead, useAnimatedNumber } from '../components/ui'
import { greeting, monthName, today } from '../utils/dates'
import { rangeFor, sortTransactions, summarize, txTouches } from '../services/calculations'
import { money } from '../utils/currency'

export function Dashboard() {
  const { data, balances, activeAccounts, account, sync } = useLedger()
  const { openTx, openAccount, openPrint, scope } = useUi()
  const { base, totalBase, mixed, unconverted, curOf, openConverter, rates } = useFx()
  const { txs: baseTxs } = useBaseTransactions()
  const scoped = scope ? account(scope) : undefined
  // One account: its own currency. All accounts: main currency, others converted at today's rate.
  const cur = scoped ? curOf(scoped.id) : base
  const headline = scoped ? balances[scoped.id] ?? 0 : totalBase
  const animated = useAnimatedNumber(headline)

  const month = rangeFor('month', today(), data.settings.weekStart)
  const sum = summarize(scoped ? data.transactions : baseTxs, month, scope || undefined)
  const needsScriptUpdate = !sync.conn?.demo && (sync.meta.scriptVersion ?? 1) < 2 && activeAccounts.some((a) => (a.currency || base) !== base)
  const recent = sortTransactions(scope ? data.transactions.filter((t) => txTouches(t, scope)) : data.transactions, 'newest')
  const name = data.settings.name.trim()
  const dateLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <>
      <PageHeader
        title={<>{greeting()}{name ? `, ${name}` : ''}</>}
        eyebrow={<>Overview · {dateLabel}</>}
        right={<ScopeSelect />}
      />

      {needsScriptUpdate && (
        <a href="#/settings" className="mb-5 flex items-center gap-3 rounded-[22px] bg-neg-soft px-4 py-3 text-[13px] text-ink">
          <span className="flex-1"><b>Update your Google Sheet script</b> so transfers between currencies save correctly. Takes a minute.</span>
          <span className="text-[12px] font-semibold uppercase tracking-[.08em] text-neg">How →</span>
        </a>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        {/* Balance */}
        <section aria-label="Total balance" className="card relative overflow-hidden px-6 pb-6 pt-7 text-center lg:text-left">
          <div className="flex items-center justify-center gap-2 lg:justify-between">
            <p className="eyebrow">{scoped ? scoped.name : 'Total balance'}{!scoped && mixed ? ' ≈' : ''}</p>
            <button onClick={() => openConverter({ from: cur, amount: Math.abs(headline) })}
              className="absolute right-4 top-4 inline-flex h-8 items-center gap-1.5 rounded-full bg-card-2 px-3 text-[11px] font-semibold uppercase tracking-[.08em] text-muted hover:text-ink lg:static">
              <ArrowRightLeft size={13} /> Rates
            </button>
          </div>
          <p className="mt-2" aria-live="polite">
            <Money value={animated} currency={cur}
              className={`text-[46px] font-medium leading-none tracking-[-0.03em] sm:text-[60px] ${headline < 0 ? 'text-neg' : ''}`}
              fracClass="text-[.46em] text-muted font-normal tracking-normal" />
          </p>
          <p className="mt-3 text-[13px] text-muted">
            {scoped ? `Started with ${money(scoped.startingBalance, cur)}` : `Across ${activeAccounts.length} ${activeAccounts.length === 1 ? 'account' : 'accounts'}`}
            {!scoped && mixed && (rates ? ' · other currencies at today’s rate' : ' · waiting for exchange rates')}
          </p>
          {!scoped && unconverted.length > 0 && (
            <p className="mt-1 text-[12px] text-neg">{unconverted.length} account{unconverted.length > 1 ? 's' : ''} not included until rates load.</p>
          )}
          <div className="mt-6 grid grid-cols-3 gap-2">
            <Quick onClick={() => openTx({ type: 'expense' })} icon={<Plus size={18} />} label="Expense" primary />
            <Quick onClick={() => openTx({ type: 'income' })} icon={<TrendingUp size={18} />} label="Income" />
            <Quick onClick={() => openTx({ type: 'transfer' })} icon={<ArrowLeftRight size={18} />} label="Transfer" disabled={activeAccounts.length < 2} />
          </div>
        </section>

        {/* Month summary */}
        <section aria-label="This month" className="card p-6">
          <div className="flex items-center justify-between">
            <p className="eyebrow">{monthName(today())}{!scoped && mixed ? ` · in ${base}` : ''}</p>
            <button onClick={() => openPrint({ period: 'month', accountId: scope || undefined })} aria-label="Print this month"
              className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-card-2 hover:text-ink"><Printer size={16} /></button>
          </div>
          <dl className="mt-4 space-y-4">
            <Stat label="Income" value={sum.income} cur={cur} tone="pos" />
            <Stat label="Spent" value={-sum.spent} cur={cur} />
            <div className="h-px bg-line" />
            <Stat label="Remaining" value={sum.net} cur={cur} big />
          </dl>
          {sum.income > 0 && (
            <div className="mt-5">
              <div className="h-2 overflow-hidden rounded-full bg-card-2" aria-hidden>
                <div className="h-full rounded-full bg-primary transition-[width] duration-700" style={{ width: `${Math.min(100, (sum.spent / sum.income) * 100)}%` }} />
              </div>
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-[.12em] text-muted">{Math.round((sum.spent / sum.income) * 100)}% of income spent</p>
            </div>
          )}
        </section>
      </div>

      <SectionHead title="My accounts" action={<LinkBtn onClick={() => openAccount()}>+ Add</LinkBtn>} />
      {activeAccounts.length ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {activeAccounts.map((a) => <AccountCard key={a.id} account={a} />)}
        </div>
      ) : (
        <Empty icon={<Plus />} title="Create your first account" body="Add a bank account, cash wallet, or anything else you use." action={<button onClick={() => openAccount()} className="h-11 rounded-full bg-primary px-5 text-sm font-semibold text-primary-ink">+ Add Account</button>} />
      )}

      <SectionHead title="Recent activity" action={recent.length > 6 ? <LinkBtn href="#/activity">View all</LinkBtn> : undefined} />
      {recent.length ? (
        <TransactionList txs={recent} limit={8} scopeAccountId={scope || undefined} />
      ) : (
        <Empty icon={<Receipt />} title="No transactions yet" body="Start tracking your spending." action={activeAccounts.length ? <button onClick={() => openTx({ type: 'expense' })} className="h-11 rounded-full bg-primary px-5 text-sm font-semibold text-primary-ink">+ Add Expense</button> : undefined} />
      )}
    </>
  )
}

function Quick({ icon, label, onClick, primary, disabled }: { icon: ReactNode; label: string; onClick: () => void; primary?: boolean; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} title={disabled ? 'Add a second account to transfer' : undefined}
      className={`flex h-[52px] items-center justify-center gap-1.5 rounded-full text-[13px] font-semibold transition active:scale-[.98] disabled:opacity-40 ${primary ? 'bg-primary text-primary-ink hover:brightness-110' : 'bg-card-2 hover:brightness-95'}`}>
      {icon}{label}
    </button>
  )
}

function Stat({ label, value, cur, tone, big }: { label: string; value: number; cur: string; tone?: 'pos'; big?: boolean }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className={`${big ? 'font-semibold' : 'text-muted'} text-[14px]`}>{label}</dt>
      <dd>
        <Money value={value} currency={cur} sign={tone === 'pos' || (big && value > 0)}
          className={`${big ? 'text-[24px]' : 'text-[17px]'} font-semibold ${tone === 'pos' ? 'text-pos' : value < 0 && big ? 'text-neg' : ''}`}
          fracClass="text-[.65em] text-muted font-medium" />
      </dd>
    </div>
  )
}
