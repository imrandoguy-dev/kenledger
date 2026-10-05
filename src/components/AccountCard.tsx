import type { Account } from '../types/ledger'
import { useLedger } from '../store/ledgerStore'
import { useFx } from '../store/fxStore'
import { money } from '../utils/currency'
import { ACCOUNT_TYPES } from '../utils/constants'
import { Bubble, Money } from './ui'
import { href } from '../router'
import { ChevronRight } from 'lucide-react'

export function AccountCard({ account, compact }: { account: Account; compact?: boolean }) {
  const { balances, data } = useLedger()
  const { base, toBase } = useFx()
  const bal = balances[account.id] ?? 0
  const cur = account.currency || base
  const inBase = cur !== base ? toBase(bal, cur) : bal
  const type = ACCOUNT_TYPES.find((t) => t.value === account.type)?.label
  const count = data.transactions.filter((t) => t.accountId === account.id || t.toAccountId === account.id).length
  const start = account.startingBalance
  // For a visual "remaining" bar: current vs starting (credit cards read inversely, so skip).
  const pct = account.type !== 'credit' && start > 0 ? Math.max(0, Math.min(100, (bal / start) * 100)) : null

  return (
    <a href={href({ name: 'account', id: account.id })} className="card group block p-4 transition-transform hover:-translate-y-0.5 anim-rise">
      <div className="flex items-center gap-3">
        <Bubble color={account.color}>{account.icon}</Bubble>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold">{account.name}</p>
          <p className="text-[11px] font-medium uppercase tracking-[.12em] text-muted">
            {cur !== base && <span className="mr-1 rounded-full bg-card-2 px-1.5 py-px text-[10px] text-ink">{cur}</span>}{type}{!compact && ` · ${count} ${count === 1 ? 'entry' : 'entries'}`}
          </p>
        </div>
        <div className="text-right">
          <Money value={bal} currency={cur} className={`text-[18px] font-semibold ${bal < 0 ? 'text-neg' : ''}`} fracClass="text-[.7em] text-muted font-medium" />
          {cur !== base && (
            <span className="tnum block text-[11px] font-medium text-muted">
              {inBase == null ? cur : `≈ ${money(inBase, base)}`}
            </span>
          )}
        </div>
        {!compact && <ChevronRight size={16} className="text-faint transition-transform group-hover:translate-x-0.5" />}
      </div>
      {pct != null && !compact && (
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-card-2" aria-hidden>
          <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${pct}%`, background: account.color }} />
        </div>
      )}
    </a>
  )
}
