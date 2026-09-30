import { useState } from 'react'
import { Pencil, Trash2, ArrowLeftRight } from 'lucide-react'
import { useLedger, useUi } from '../store/ledgerStore'
import { Bubble, Button, Confirm, Money, Sheet } from './ui'
import { longDate } from '../utils/dates'
import { money } from '../utils/currency'

export function TransactionDetail() {
  const { viewTx, closeViewTx, openTx, notify } = useUi()
  const { account, category, deleteTransaction, restoreTransaction, data } = useLedger()
  const [confirm, setConfirm] = useState(false)
  if (!viewTx) return null
  // Use the live copy in case it was edited.
  const tx = data.transactions.find((t) => t.id === viewTx.id) ?? viewTx
  const cat = category(tx.categoryId)
  const parent = cat?.parentId ? category(cat.parentId) : undefined
  const cur = data.settings.currency

  const rows: [string, string][] = [
    ['Date', longDate(tx.date)],
    tx.type === 'transfer'
      ? ['From', account(tx.accountId)?.name ?? '—']
      : ['Account', account(tx.accountId)?.name ?? '—'],
    tx.type === 'transfer'
      ? ['To', account(tx.toAccountId)?.name ?? '—']
      : ['Category', cat ? (parent ? `${parent.name} · ${cat.name}` : cat.name) : 'Uncategorized'],
  ]
  if (tx.notes) rows.push(['Notes', tx.notes])

  return (
    <>
      <Sheet open={!confirm} onClose={closeViewTx} title={tx.type[0].toUpperCase() + tx.type.slice(1)}
        footer={
          <div className="flex gap-3">
            <Button variant="soft" className="flex-1" onClick={() => setConfirm(true)}><Trash2 size={16} /> Delete</Button>
            <Button className="flex-1" onClick={() => { closeViewTx(); openTx({ type: tx.type, tx }) }}><Pencil size={16} /> Edit</Button>
          </div>
        }>
        <div className="flex flex-col items-center py-4 text-center">
          <Bubble size={64} color={cat?.color}>{tx.type === 'transfer' ? <ArrowLeftRight className="text-muted" /> : cat?.icon ?? '•'}</Bubble>
          <p className="mt-4 text-[17px] font-semibold">{tx.description}</p>
          <Money value={tx.type === 'expense' ? -tx.amount : tx.amount} sign={tx.type === 'income'} currency={cur}
            className={`mt-1 text-[40px] font-medium tracking-tight ${tx.type === 'income' ? 'text-pos' : ''}`} />
        </div>
        <dl className="card divide-y divide-line">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 px-4 py-3.5 text-[15px]">
              <dt className="font-semibold">{k}</dt>
              <dd className="text-right text-muted">{v}</dd>
            </div>
          ))}
        </dl>
      </Sheet>
      <Confirm
        open={confirm}
        title={`Delete ${tx.type}?`}
        body={<><span className="block font-semibold text-ink">{tx.description}</span>{money(tx.amount, cur)} · {longDate(tx.date)}</>}
        confirmLabel="Delete"
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          const removed = deleteTransaction(tx.id)
          setConfirm(false)
          closeViewTx()
          if (removed) notify(`${tx.type[0].toUpperCase() + tx.type.slice(1)} deleted`, { label: 'Undo', run: () => restoreTransaction(removed) })
        }}
      />
    </>
  )
}
