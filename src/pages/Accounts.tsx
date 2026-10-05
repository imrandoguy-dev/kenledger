import { ArrowRightLeft, Plus, Wallet } from 'lucide-react'
import { useFx } from '../store/fxStore'
import { useLedger, useUi } from '../store/ledgerStore'
import { PageHeader } from '../components/Layout'
import { AccountCard } from '../components/AccountCard'
import { Button, Empty, Money } from '../components/ui'

export function Accounts() {
  const { activeAccounts, balances } = useLedger()
  const { openAccount } = useUi()
  const { base: cur, toBase, totalBase: total, mixed, openConverter } = useFx()
  // Everything in the main currency at today's rate.
  const inBase = activeAccounts.map((a) => toBase(balances[a.id] ?? 0, a.currency || cur) ?? 0)
  const assets = inBase.filter((v) => v >= 0).reduce((s, v) => s + v, 0)
  const owed = inBase.filter((v) => v < 0).reduce((s, v) => s + v, 0)

  return (
    <>
      <PageHeader title="Accounts" eyebrow={`${activeAccounts.length} ${activeAccounts.length === 1 ? 'account' : 'accounts'}`}
        right={<>
          <Button size="sm" variant="soft" onClick={() => openConverter()}><ArrowRightLeft size={15} /> Convert</Button>
          <Button size="sm" onClick={() => openAccount()} className="hidden sm:inline-flex"><Plus size={16} /> Add Account</Button>
        </>} />

      {activeAccounts.length > 0 && (
        <section className="card mb-5 grid grid-cols-3 divide-x divide-line p-5 text-center">
          <div><p className="eyebrow">Net worth{mixed ? ' ≈' : ''}</p><Money value={total} currency={cur} className="mt-1 block text-[18px] font-semibold sm:text-[22px]" fracClass="text-[.6em] text-muted" /></div>
          <div><p className="eyebrow">Have</p><Money value={assets} currency={cur} className="mt-1 block text-[18px] font-semibold text-pos sm:text-[22px]" fracClass="text-[.6em] opacity-60" /></div>
          <div><p className="eyebrow">Owe</p><Money value={owed} currency={cur} className="mt-1 block text-[18px] font-semibold text-neg sm:text-[22px]" fracClass="text-[.6em] opacity-60" /></div>
        </section>
      )}

      {mixed && activeAccounts.length > 0 && (
        <p className="-mt-2 mb-5 px-1 text-[12px] text-muted">Totals are in {cur}, converting other currencies at today’s rate.</p>
      )}

      {activeAccounts.length ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {activeAccounts.map((a) => <AccountCard key={a.id} account={a} />)}
          <button onClick={() => openAccount()} className="flex min-h-[88px] items-center justify-center gap-2 rounded-[22px] border-2 border-dashed border-line text-sm font-semibold text-muted hover:border-primary hover:text-primary">
            <Plus size={18} /> Add Account
          </button>
        </div>
      ) : (
        <Empty icon={<Wallet />} title="Create your first account" body="Add a bank account, cash wallet, or anything else you use."
          action={<Button onClick={() => openAccount()}><Plus size={16} /> Add Account</Button>} />
      )}
    </>
  )
}
