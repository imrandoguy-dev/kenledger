import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { CalendarDays, ChevronRight, Tag, Wallet, StickyNote, ArrowDownUp, Plus } from 'lucide-react'
import type { TxType } from '../types/ledger'
import { useLedger, useUi } from '../store/ledgerStore'
import { Button, Segmented, Sheet, Bubble } from './ui'
import { currencyMeta, money, parseAmount } from '../utils/currency'
import { formatDate, relativeDay, today, yesterday } from '../utils/dates'

type Panel = 'date' | 'category' | 'account' | 'to' | null

export function TransactionForm() {
  const { txSheet, closeTx, notify, scope } = useUi()
  const { data, activeAccounts, addTransaction, updateTransaction, account, category, balances, addCategory } = useLedger()
  const editing = txSheet?.tx
  const cur = data.settings.currency

  const [type, setType] = useState<TxType>('expense')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [accountId, setAccountId] = useState('')
  const [toAccountId, setToAccountId] = useState('')
  const [categoryId, setCategoryId] = useState<string | undefined>()
  const [date, setDate] = useState(today())
  const [notes, setNotes] = useState('')
  const [panel, setPanel] = useState<Panel>(null)
  const [error, setError] = useState('')
  const [catGroup, setCatGroup] = useState<string | null>(null)
  const [newCat, setNewCat] = useState('')
  const amountRef = useRef<HTMLInputElement>(null)

  // Reset whenever the sheet opens.
  useEffect(() => {
    if (!txSheet) return
    const t = txSheet.tx
    const fallback = txSheet.accountId || scope || data.settings.defaultAccountId || activeAccounts[0]?.id || ''
    setType(t?.type ?? txSheet.type)
    setDescription(t?.description ?? '')
    setAmount(t ? String(t.amount) : '')
    setAccountId(t?.accountId ?? fallback)
    setToAccountId(t?.toAccountId ?? activeAccounts.find((a) => a.id !== fallback)?.id ?? '')
    setCategoryId(t?.categoryId)
    setDate(t?.date ?? txSheet.date ?? today()) // always the live device date, never hard-coded
    setNotes(t?.notes ?? '')
    setPanel(null)
    setError('')
    setCatGroup(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txSheet])

  const catsForType = useMemo(() => data.categories.filter((c) => c.type === (type === 'income' ? 'income' : 'expense')), [data.categories, type])
  const roots = catsForType.filter((c) => !c.parentId)
  const cat = category(categoryId)
  const catLabel = cat ? (cat.parentId ? `${category(cat.parentId)?.name} · ${cat.name}` : cat.name) : type === 'income' ? 'Choose' : 'General'

  // Switching type clears an incompatible category.
  useEffect(() => {
    if (categoryId && !catsForType.some((c) => c.id === categoryId)) setCategoryId(undefined)
  }, [type, catsForType, categoryId])

  const title = editing ? `Edit ${type}` : type === 'expense' ? 'Add Expense' : type === 'income' ? 'Add Income' : 'Transfer'

  function save() {
    const n = parseAmount(amount)
    if (!n || n <= 0) { setError('Enter an amount greater than zero.'); amountRef.current?.focus(); return }
    if (!accountId) { setError('Choose an account.'); setPanel('account'); return }
    if (type === 'transfer') {
      if (!toAccountId) { setError('Choose where the money goes.'); setPanel('to'); return }
      if (toAccountId === accountId) { setError('From and To must be different accounts.'); setPanel('to'); return }
    }
    const desc = description.trim() || (type === 'transfer' ? `Transfer to ${account(toAccountId)?.name ?? ''}` : cat?.name ?? (type === 'income' ? 'Income' : 'Expense'))
    const payload = {
      type, amount: n, accountId, date,
      description: desc,
      notes: notes.trim() || undefined,
      categoryId: type === 'transfer' ? undefined : categoryId,
      toAccountId: type === 'transfer' ? toAccountId : undefined,
    }
    if (editing) {
      updateTransaction(editing.id, payload)
      notify('Changes saved')
    } else {
      addTransaction(payload)
      notify(type === 'transfer' ? `Moved ${money(n, cur)}` : `${type === 'expense' ? 'Expense' : 'Income'} added · ${money(n, cur)}`)
    }
    closeTx()
  }

  if (!txSheet) return null

  if (!activeAccounts.length) {
    return (
      <Sheet open onClose={closeTx} title="Add an account first">
        <p className="py-2 text-sm text-muted">Kenledger needs at least one account to record money against.</p>
      </Sheet>
    )
  }

  const toggle = (p: Panel) => setPanel((cur) => (cur === p ? null : p))
  const accName = (id: string) => account(id)?.name ?? 'Choose'

  return (
    <Sheet
      open
      onClose={closeTx}
      title={title}
      footer={<Button size="lg" className="w-full" onClick={save}>{editing ? 'Save Changes' : title}</Button>}
    >
      <form onSubmit={(e) => { e.preventDefault(); save() }}>
        {!editing && (
          <Segmented<TxType>
            label="Transaction type"
            value={type}
            onChange={(v) => { setType(v); setError('') }}
            options={[{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }, { value: 'transfer', label: 'Transfer' }]}
            className="mb-4"
          />
        )}

        <div className="card p-5">
          <label className="eyebrow" htmlFor="tx-desc">{type === 'income' ? 'Source' : 'Description'}</label>
          <input
            id="tx-desc"
            className="field mb-4 text-[17px]"
            placeholder={type === 'transfer' ? 'e.g. ATM withdrawal' : type === 'income' ? 'e.g. Salary' : 'What was it for?'}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            autoComplete="off"
            maxLength={80}
          />
          <label className="eyebrow" htmlFor="tx-amt">Amount</label>
          <div className="flex items-baseline gap-2 border-b border-line py-1 focus-within:border-primary">
            <span className="text-2xl text-muted">{currencyMeta(cur).symbol}</span>
            <input
              id="tx-amt"
              ref={amountRef}
              data-autofocus
              inputMode="decimal"
              className="tnum w-full bg-transparent text-[44px] font-medium leading-tight tracking-tight outline-none placeholder:text-faint"
              placeholder="0"
              value={amount}
              onChange={(e) => { setAmount(e.target.value.replace(/[^0-9.,]/g, '')); setError('') }}
              aria-invalid={!!error && !parseAmount(amount)}
            />
          </div>
        </div>

        <div className="card mt-3 divide-y divide-line overflow-hidden">
          <Row icon={<CalendarDays size={18} />} label="Date" value={date === today() ? `Today, ${formatDate(date).replace(/, \d{4}$/, '')}` : relativeDay(date)} open={panel === 'date'} onClick={() => toggle('date')}>
            <div className="flex flex-wrap items-center gap-2">
              <Chip active={date === today()} onClick={() => { setDate(today()); setPanel(null) }}>Today</Chip>
              <Chip active={date === yesterday()} onClick={() => { setDate(yesterday()); setPanel(null) }}>Yesterday</Chip>
              <input type="date" aria-label="Custom date" value={date} max={today()} onChange={(e) => e.target.value && setDate(e.target.value)} className="select !bg-none !pr-3" />
            </div>
          </Row>

          <Row icon={<Wallet size={18} />} label={type === 'transfer' ? 'From' : 'Account'} value={accName(accountId)} open={panel === 'account'} onClick={() => toggle('account')}>
            <AccountChoices value={accountId} onPick={(id) => { setAccountId(id); setPanel(null) }} exclude={undefined} balances={balances} cur={cur} />
          </Row>

          {type === 'transfer' ? (
            <Row icon={<ArrowDownUp size={18} />} label="To" value={accName(toAccountId)} open={panel === 'to'} onClick={() => toggle('to')}>
              <AccountChoices value={toAccountId} onPick={(id) => { setToAccountId(id); setPanel(null) }} exclude={accountId} balances={balances} cur={cur} />
            </Row>
          ) : (
            <Row icon={<Tag size={18} />} label="Category" value={catLabel} open={panel === 'category'} onClick={() => toggle('category')}>
              {type === 'income' ? (
                <div className="flex flex-wrap gap-2">
                  {roots.map((c) => <Chip key={c.id} active={categoryId === c.id} onClick={() => { setCategoryId(c.id); setPanel(null) }}>{c.icon} {c.name}</Chip>)}
                </div>
              ) : (
                <div>
                  <div className="grid grid-cols-4 gap-2">
                    {roots.map((c) => (
                      <button type="button" key={c.id}
                        onClick={() => { setCatGroup(catGroup === c.id ? null : c.id); setCategoryId(c.id) }}
                        className={`flex flex-col items-center gap-1 rounded-2xl p-2 text-center text-[11px] font-medium transition-colors ${categoryId && (categoryId === c.id || category(categoryId)?.parentId === c.id) ? 'bg-primary text-primary-ink' : 'bg-card-2 hover:brightness-95'}`}>
                        <span className="text-xl" aria-hidden>{c.icon}</span>
                        <span className="w-full break-words text-[10.5px] leading-tight">{c.name}</span>
                      </button>
                    ))}
                  </div>
                  {catGroup && (
                    <div className="mt-3 flex flex-wrap gap-2 anim-rise">
                      {catsForType.filter((c) => c.parentId === catGroup).map((c) => (
                        <Chip key={c.id} active={categoryId === c.id} onClick={() => { setCategoryId(c.id); setPanel(null) }}>{c.icon} {c.name}</Chip>
                      ))}
                      <AddCat value={newCat} onChange={setNewCat} onAdd={() => {
                        if (!newCat.trim()) return
                        const parent = category(catGroup)
                        const c = addCategory({ name: newCat.trim(), icon: parent?.icon ?? '•', color: parent?.color ?? '#9A9A8E', type: 'expense', parentId: catGroup })
                        setCategoryId(c.id); setNewCat(''); setPanel(null)
                      }} />
                    </div>
                  )}
                </div>
              )}
            </Row>
          )}

          <div className="flex items-start gap-3 px-4 py-3.5">
            <span className="mt-2.5 text-muted"><StickyNote size={18} /></span>
            <label className="sr-only" htmlFor="tx-notes">Notes</label>
            <textarea id="tx-notes" rows={1} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)"
              className="field !border-0 resize-none text-[15px]" maxLength={300} />
          </div>
        </div>

        {error && <p role="alert" className="mt-3 rounded-2xl bg-neg-soft px-4 py-2.5 text-sm font-medium text-neg">{error}</p>}
        <button type="submit" className="sr-only">Save</button>
      </form>
    </Sheet>
  )
}

function Row({ icon, label, value, open, onClick, children }: { icon: ReactNode; label: string; value: string; open: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <div>
      <button type="button" onClick={onClick} aria-expanded={open} className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-card-2/50">
        <span className="text-muted">{icon}</span>
        <span className="flex-1 text-[15px] font-semibold">{label}</span>
        <span className="max-w-[55%] truncate text-[14px] text-muted">{value}</span>
        <ChevronRight size={16} className={`text-faint transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && <div className="px-4 pb-4 anim-rise">{children}</div>}
    </div>
  )
}

function Chip({ active, onClick, children }: { active?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={`h-9 rounded-full px-3.5 text-[13px] font-medium transition-colors ${active ? 'bg-primary text-primary-ink' : 'bg-card-2 hover:brightness-95'}`}>
      {children}
    </button>
  )
}

function AddCat({ value, onChange, onAdd }: { value: string; onChange: (s: string) => void; onAdd: () => void }) {
  return (
    <span className="inline-flex h-9 items-center rounded-full border border-dashed border-line pl-3 pr-1">
      <input value={value} onChange={(e) => onChange(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onAdd() } }}
        placeholder="New…" aria-label="New sub-category" className="w-20 bg-transparent text-[13px] outline-none" maxLength={30} />
      <button type="button" onClick={onAdd} aria-label="Add sub-category" className="grid h-7 w-7 place-items-center rounded-full text-primary hover:bg-card-2"><Plus size={14} /></button>
    </span>
  )
}

function AccountChoices({ value, onPick, exclude, balances, cur }: { value: string; onPick: (id: string) => void; exclude?: string; balances: Record<string, number>; cur: string }) {
  const { activeAccounts } = useLedger()
  const list = activeAccounts.filter((a) => a.id !== exclude)
  if (!list.length) return <p className="text-sm text-muted">Create another account to transfer money between them.</p>
  return (
    <div className="space-y-1.5">
      {list.map((a) => (
        <button type="button" key={a.id} onClick={() => onPick(a.id)} aria-pressed={value === a.id}
          className={`flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition-colors ${value === a.id ? 'bg-primary text-primary-ink' : 'bg-card-2 hover:brightness-95'}`}>
          <Bubble size={34} color={a.color}>{a.icon}</Bubble>
          <span className="flex-1 text-sm font-semibold">{a.name}</span>
          <span className="tnum text-[13px] opacity-75">{money(balances[a.id] ?? 0, cur)}</span>
        </button>
      ))}
    </div>
  )
}
