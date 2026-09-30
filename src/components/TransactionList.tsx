import type { Transaction } from '../types/ledger'
import { groupByDate } from '../services/calculations'
import { relativeDay } from '../utils/dates'
import { TransactionItem } from './TransactionItem'
import { useLedger } from '../store/ledgerStore'
import { money } from '../utils/currency'

/** Date-grouped list. Each day shows its net spend on the right. */
export function TransactionList({ txs, scopeAccountId, limit }: { txs: Transaction[]; scopeAccountId?: string; limit?: number }) {
  const { data } = useLedger()
  const list = limit ? txs.slice(0, limit) : txs
  const groups = groupByDate(list)
  return (
    <div className="space-y-5">
      {groups.map(([date, items]) => {
        const spent = items.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
        return (
          <section key={date} className="anim-rise">
            <div className="mb-1 flex items-baseline justify-between px-3">
              <h3 className="text-[12px] font-semibold uppercase tracking-[.12em] text-muted">{relativeDay(date)}</h3>
              {spent > 0 && <span className="tnum text-[11px] font-medium text-faint">{money(-spent, data.settings.currency)}</span>}
            </div>
            <div className="card p-1.5">
              {items.map((t) => <TransactionItem key={t.id} tx={t} scopeAccountId={scopeAccountId} />)}
            </div>
          </section>
        )
      })}
    </div>
  )
}
