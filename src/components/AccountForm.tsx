import { useEffect, useState } from 'react'
import type { AccountType } from '../types/ledger'
import { useLedger, useUi } from '../store/ledgerStore'
import { Button, Sheet } from './ui'
import { ACCOUNT_COLORS, ACCOUNT_ICONS, ACCOUNT_TYPES, CURRENCIES } from '../utils/constants'
import { currencyMeta, parseAmount } from '../utils/currency'
import { navigate } from '../router'

export function AccountForm() {
  const { accountSheet, closeAccount, notify } = useUi()
  const { addAccount, updateAccount, data } = useLedger()
  const editing = accountSheet?.account
  const [name, setName] = useState('')
  const [type, setType] = useState<AccountType>('savings')
  const [start, setStart] = useState('')
  const [icon, setIcon] = useState('🏦')
  const [color, setColor] = useState(ACCOUNT_COLORS[0])
  const [error, setError] = useState('')
  const [cur, setCur] = useState(data.settings.currency)

  useEffect(() => {
    if (!accountSheet) return
    const a = accountSheet.account
    setName(a?.name ?? '')
    setType(a?.type ?? 'savings')
    setStart(a ? String(Math.abs(a.startingBalance)) : '')
    setIcon(a?.icon ?? '🏦')
    setColor(a?.color ?? ACCOUNT_COLORS[data.accounts.length % ACCOUNT_COLORS.length])
    setError('')
    setCur(a?.currency || data.settings.currency)
  }, [accountSheet, data.accounts.length, data.settings.currency])

  if (!accountSheet) return null
  const hasTx = !!editing && data.transactions.some((t) => t.accountId === editing.id || t.toAccountId === editing.id)

  function save() {
    if (!name.trim()) { setError('Give the account a name.'); return }
    const sb = start.trim() === '' ? 0 : parseAmount(start)
    if (Number.isNaN(sb)) { setError('Starting balance must be a number.'); return }
    const signed = type === 'credit' ? -Math.abs(sb) : sb // credit: stored as amount owed (negative)
    if (editing) {
      updateAccount(editing.id, { name: name.trim(), type, startingBalance: signed, currency: cur, icon, color })
      notify('Account updated')
      closeAccount()
    } else {
      const a = addAccount({ name: name.trim(), type, startingBalance: signed, currency: cur, icon, color })
      notify(`${a.name} created`)
      closeAccount()
      navigate({ name: 'account', id: a.id })
    }
  }

  return (
    <Sheet open onClose={closeAccount} title={editing ? 'Edit Account' : 'Add Account'}
      footer={<Button size="lg" className="w-full" onClick={save}>{editing ? 'Save Changes' : 'Create Account'}</Button>}>
      <form onSubmit={(e) => { e.preventDefault(); save() }} className="space-y-3">
        <div className="card space-y-4 p-5">
          <div>
            <label className="eyebrow" htmlFor="acc-name">Account name</label>
            <input id="acc-name" data-autofocus className="field text-[17px]" placeholder="HDFC Savings" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
          </div>
          <div>
            <label className="eyebrow" htmlFor="acc-cur">Currency</label>
            <select id="acc-cur" className="select mt-1.5 w-full" value={cur} onChange={(e) => setCur(e.target.value)}>
              {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.flag} {c.code} · {c.label}</option>)}
            </select>
            {hasTx && editing?.currency !== cur && (
              <p className="mt-2 text-[12px] text-neg">Existing amounts in this account won’t be converted, only relabelled as {cur}.</p>
            )}
          </div>
          <div>
            <label className="eyebrow" htmlFor="acc-start">{type === 'credit' ? 'Amount currently owed' : 'Starting balance'}</label>
            <div className="flex items-baseline gap-2 border-b border-line focus-within:border-primary">
              <span className="text-xl text-muted">{currencyMeta(cur).symbol}</span>
              <input id="acc-start" inputMode="decimal" className="tnum w-full bg-transparent py-2 text-[28px] font-medium outline-none placeholder:text-faint" placeholder="0"
                value={start} onChange={(e) => setStart(e.target.value.replace(/[^0-9.,]/g, ''))} />
            </div>
          </div>
        </div>

        <fieldset className="card p-5">
          <legend className="sr-only">Account type</legend>
          <p className="eyebrow mb-3">Type</p>
          <div className="grid grid-cols-3 gap-2">
            {ACCOUNT_TYPES.map((t) => (
              <button type="button" key={t.value} aria-pressed={type === t.value}
                onClick={() => { setType(t.value); if (!editing) setIcon(t.icon) }}
                className={`flex flex-col items-center gap-1 rounded-2xl py-3 text-[12px] font-semibold ${type === t.value ? 'bg-primary text-primary-ink' : 'bg-card-2'}`}>
                <span className="text-lg" aria-hidden>{t.icon}</span>{t.label}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="card p-5">
          <p className="eyebrow mb-3">Icon</p>
          <div className="flex flex-wrap gap-2">
            {ACCOUNT_ICONS.map((i) => (
              <button type="button" key={i} aria-label={`Icon ${i}`} aria-pressed={icon === i} onClick={() => setIcon(i)}
                className={`grid h-10 w-10 place-items-center rounded-full text-lg ${icon === i ? 'ring-2 ring-primary bg-card-2' : 'bg-card-2'}`}>{i}</button>
            ))}
          </div>
          <p className="eyebrow mb-3 mt-5">Colour</p>
          <div className="flex flex-wrap gap-2.5">
            {ACCOUNT_COLORS.map((c) => (
              <button type="button" key={c} aria-label={`Colour ${c}`} aria-pressed={color === c} onClick={() => setColor(c)}
                className={`h-8 w-8 rounded-full ring-offset-2 ring-offset-card ${color === c ? 'ring-2 ring-ink' : ''}`} style={{ background: c }} />
            ))}
          </div>
        </div>
        {error && <p role="alert" className="rounded-2xl bg-neg-soft px-4 py-2.5 text-sm font-medium text-neg">{error}</p>}
        <button type="submit" className="sr-only">Save</button>
      </form>
    </Sheet>
  )
}
