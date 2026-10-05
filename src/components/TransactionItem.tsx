import { ArrowLeftRight } from 'lucide-react'
import type { Transaction } from '../types/ledger'
import { useLedger, useUi } from '../store/ledgerStore'
import { useFx } from '../store/fxStore'
import { Bubble, Money } from './ui'
import { effectOn } from '../services/calculations'

export function TransactionItem({ tx, scopeAccountId, showDate }: { tx: Transaction; scopeAccountId?: string; showDate?: string }) {
  const { account, category } = useLedger()
  const { openViewTx } = useUi()
  const { curOf } = useFx()
  // Amounts are shown in the account's own currency (the receiving side for incoming transfers).
  const incoming = tx.type === 'transfer' && scopeAccountId && tx.toAccountId === scopeAccountId && tx.accountId !== scopeAccountId
  const cur = curOf(incoming ? tx.toAccountId : tx.accountId)
  const cat = category(tx.categoryId)
  const acc = account(tx.accountId)
  const to = account(tx.toAccountId)

  let signed: number
  if (tx.type === 'transfer') signed = scopeAccountId ? effectOn(tx, scopeAccountId) : 0
  else signed = tx.type === 'expense' ? -tx.amount : tx.amount

  const sub = tx.type === 'transfer'
    ? `${acc?.name ?? '—'} → ${to?.name ?? '—'}`
    : [cat?.name ?? 'Uncategorized', acc?.name].filter(Boolean).join(' · ')

  const color = tx.type === 'transfer' && !scopeAccountId ? 'text-muted' : signed < 0 ? 'text-ink' : 'text-pos'

  return (
    <button
      onClick={() => openViewTx(tx)}
      className="group flex w-full items-center gap-3.5 rounded-[18px] px-3 py-3 text-left transition-colors hover:bg-card-2/70 focus-visible:bg-card-2/70"
    >
      <Bubble color={tx.type === 'transfer' ? undefined : cat?.color}>
        {tx.type === 'transfer' ? <ArrowLeftRight size={18} className="text-muted" /> : cat?.icon ?? '•'}
      </Bubble>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold">{tx.description || cat?.name || 'Untitled'}</span>
        <span className="block truncate text-[11px] font-medium uppercase tracking-[.1em] text-muted">{sub}</span>
      </span>
      <span className="text-right">
        <Money
          value={tx.type === 'transfer' && !scopeAccountId ? tx.amount : signed}
          currency={cur}
          sign={tx.type === 'income' || (tx.type === 'transfer' && !!scopeAccountId)}
          className={`block text-[16px] font-semibold ${color}`}
          fracClass="text-[.72em] font-medium opacity-60"
        />
        {showDate && <span className="block text-[10px] font-semibold uppercase tracking-[.12em] text-faint">{showDate}</span>}
      </span>
    </button>
  )
}
