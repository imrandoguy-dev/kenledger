import { useState } from 'react'
import { Pencil, Printer, Trash2, Plus, Receipt, Download } from 'lucide-react'
import { useLedger, useUi } from '../store/ledgerStore'
import { PageHeader } from '../components/Layout'
import { TransactionList } from '../components/TransactionList'
import { Bubble, Button, Confirm, Empty, Money, SectionHead, useAnimatedNumber } from '../components/ui'
import { rangeFor, sortTransactions, txTouches, effectOn } from '../services/calculations'
import { today } from '../utils/dates'
import { ACCOUNT_TYPES } from '../utils/constants'
import { navigate } from '../router'
import { exportCSV } from '../services/export'
import { WorthToday } from '../components/Conversions'
import { currencyMeta } from '../utils/currency'

export function AccountDetails({ id }: { id: string }) {
  const { account, balances, data, deleteAccount } = useLedger()
  const { openTx, openAccount, openPrint, notify } = useUi()
  const [confirm, setConfirm] = useState(false)
  const acc = account(id)
  const bal = balances[id] ?? 0
  const animated = useAnimatedNumber(bal)
  if (!acc) {
    return <Empty icon={<Receipt />} title="Account not found" body="It may have been deleted." action={<Button onClick={() => navigate({ name: 'accounts' })}>Back to accounts</Button>} />
  }
  const cur = acc.currency || data.settings.currency
  const txs = sortTransactions(data.transactions.filter((t) => txTouches(t, id)), 'newest')
  const month = rangeFor('month', today(), data.settings.weekStart)
  const monthChange = txs.filter((t) => t.date >= month.from && t.date <= month.to).reduce((s, t) => s + effectOn(t, id), 0)
  const type = ACCOUNT_TYPES.find((t) => t.value === acc.type)?.label

  return (
    <>
      <PageHeader back="#/accounts" title={acc.name} eyebrow={`${type} · ${currencyMeta(cur).flag} ${cur}`}
        right={
          <>
            <button onClick={() => openAccount(acc)} aria-label="Edit account" className="grid h-10 w-10 place-items-center rounded-full bg-card-2 hover:brightness-95"><Pencil size={16} /></button>
            <button onClick={() => openPrint({ period: 'month', accountId: id })} aria-label="Print statement" className="grid h-10 w-10 place-items-center rounded-full bg-card-2 hover:brightness-95"><Printer size={16} /></button>
          </>
        } />

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
      <section className="card flex flex-col items-center px-6 py-8 text-center">
        <Bubble size={64} color={acc.color}>{acc.icon}</Bubble>
        <p className="eyebrow mt-5">Current balance</p>
        <Money value={animated} currency={cur} className={`mt-2 text-[48px] font-medium leading-none tracking-[-0.03em] sm:text-[56px] ${bal < 0 ? 'text-neg' : ''}`} fracClass="text-[.45em] text-muted font-normal" />
        <div className="mt-6 grid w-full max-w-sm grid-cols-2 divide-x divide-line rounded-2xl bg-card-2/60 py-3">
          <div><p className="eyebrow">Started with</p><Money value={acc.startingBalance} currency={cur} className="mt-1 block text-[16px] font-semibold" fracClass="text-[.7em] text-muted" /></div>
          <div><p className="eyebrow">This month</p><Money value={monthChange} sign currency={cur} className={`mt-1 block text-[16px] font-semibold ${monthChange < 0 ? 'text-neg' : monthChange > 0 ? 'text-pos' : ''}`} fracClass="text-[.7em] opacity-60" /></div>
        </div>
        <div className="mt-6 flex w-full max-w-sm gap-2">
          <Button className="flex-1" onClick={() => openTx({ type: 'expense', accountId: id })}><Plus size={16} /> Expense</Button>
          <Button variant="soft" className="flex-1" onClick={() => openTx({ type: 'income', accountId: id })}>Income</Button>
        </div>
      </section>
      <WorthToday key={`${id}-${cur}`} amount={bal} currency={cur} title="This balance today" />
      </div>

      <SectionHead title={`Transactions · ${txs.length}`} action={txs.length ? (
        <button onClick={() => exportCSV(data, txs)} className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[.12em] text-primary"><Download size={13} /> CSV</button>
      ) : undefined} />
      {txs.length ? <TransactionList txs={txs} scopeAccountId={id} /> :
        <Empty icon={<Receipt />} title="No transactions yet" body="Record your first expense for this account." action={<Button onClick={() => openTx({ type: 'expense', accountId: id })}>+ Add Expense</Button>} />}

      <div className="mt-10 text-center">
        <button onClick={() => setConfirm(true)} className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-neg hover:bg-neg-soft">
          <Trash2 size={15} /> Delete account
        </button>
      </div>
      <Confirm open={confirm} title={`Delete ${acc.name}?`}
        body={`This removes the account and its ${txs.length} ${txs.length === 1 ? 'transaction' : 'transactions'} (including transfers). This cannot be undone unless you have a backup.`}
        confirmLabel="Delete Account" onCancel={() => setConfirm(false)}
        onConfirm={() => { deleteAccount(id); setConfirm(false); notify(`${acc.name} deleted`); navigate({ name: 'accounts' }) }} />
    </>
  )
}
