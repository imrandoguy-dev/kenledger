import { useState } from 'react'
import { ArrowRight, Sparkles } from 'lucide-react'
import { useLedger } from '../store/ledgerStore'
import { Logo } from '../components/Layout'
import { Button } from '../components/ui'
import { ACCOUNT_TYPES } from '../utils/constants'
import { currencyMeta, parseAmount, money } from '../utils/currency'
import { demoLedger } from '../services/demo'
import type { AccountType } from '../types/ledger'
import { requestPersistence } from '../services/storage'

export function Onboarding() {
  const { data, updateSettings, addAccount, replaceAll } = useLedger()
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [bal, setBal] = useState('')
  const [accName, setAccName] = useState('')
  const [type, setType] = useState<AccountType>('savings')
  const cur = data.settings.currency
  const amount = parseAmount(bal) || 0

  const finish = () => { requestPersistence(); updateSettings({ onboarded: true, name: name.trim() }) }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-10 flex items-center justify-center gap-1.5" aria-hidden>
          {[0, 1, 2, 3].map((i) => <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-primary' : 'w-1.5 bg-line'}`} />)}
        </div>

        {step === 0 && (
          <div className="anim-rise text-center">
            <div className="mx-auto mb-8 w-fit"><Logo size={72} /></div>
            <p className="eyebrow">Welcome to</p>
            <h1 className="mt-1 text-[40px] font-semibold tracking-tight">Kenledger</h1>
            <p className="mx-auto mt-3 max-w-[260px] text-[15px] text-muted">A simple place to keep track of your money. Private, and stored only on this device.</p>
            <div className="card mt-8 p-5 text-left">
              <label className="eyebrow" htmlFor="ob-name">What should we call you?</label>
              <input id="ob-name" autoFocus className="field text-[17px]" placeholder="Your name (optional)" value={name} onChange={(e) => setName(e.target.value)} maxLength={30}
                onKeyDown={(e) => e.key === 'Enter' && setStep(1)} />
            </div>
            <Button size="lg" className="mt-6 w-full" onClick={() => setStep(1)}>Get Started <ArrowRight size={18} /></Button>
            <button onClick={() => replaceAll(demoLedger(name.trim() || 'Julian'))} className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary">
              <Sparkles size={14} /> Or explore with demo data
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="anim-rise">
            <p className="eyebrow text-center">Step 1 of 2</p>
            <h1 className="mt-2 text-center text-[28px] font-semibold tracking-tight">What's your starting balance?</h1>
            <p className="mt-2 text-center text-[14px] text-muted">How much is in your main account right now?</p>
            <div className="card mt-8 p-6">
              <label className="eyebrow" htmlFor="ob-bal">Amount</label>
              <div className="flex items-baseline gap-2 border-b border-line focus-within:border-primary">
                <span className="text-2xl text-muted">{currencyMeta(cur).symbol}</span>
                <input id="ob-bal" autoFocus inputMode="decimal" className="tnum w-full bg-transparent py-2 text-[44px] font-medium outline-none placeholder:text-faint"
                  placeholder="50,000" value={bal} onChange={(e) => setBal(e.target.value.replace(/[^0-9.,]/g, ''))} onKeyDown={(e) => e.key === 'Enter' && setStep(2)} />
              </div>
              <label className="mt-5 flex items-center justify-between text-[14px]">
                <span className="text-muted">Currency</span>
                <select className="select" value={cur} onChange={(e) => updateSettings({ currency: e.target.value })}>
                  {['INR', 'USD', 'EUR', 'GBP', 'AED'].map((c) => <option key={c} value={c}>{c} {currencyMeta(c).symbol}</option>)}
                </select>
              </label>
            </div>
            <div className="mt-6 flex gap-3">
              <Button variant="soft" size="lg" onClick={() => setStep(0)}>Back</Button>
              <Button size="lg" className="flex-1" onClick={() => setStep(2)}>Continue</Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="anim-rise">
            <p className="eyebrow text-center">Step 2 of 2</p>
            <h1 className="mt-2 text-center text-[28px] font-semibold tracking-tight">Create your first account</h1>
            <div className="card mt-8 space-y-5 p-6">
              <div>
                <label className="eyebrow" htmlFor="ob-acc">Account name</label>
                <input id="ob-acc" autoFocus className="field text-[17px]" placeholder="HDFC Savings" value={accName} onChange={(e) => setAccName(e.target.value)} maxLength={40} />
              </div>
              <div>
                <p className="eyebrow mb-2">Type</p>
                <div className="grid grid-cols-3 gap-2">
                  {ACCOUNT_TYPES.map((t) => (
                    <button key={t.value} aria-pressed={type === t.value} onClick={() => setType(t.value)}
                      className={`flex flex-col items-center gap-0.5 rounded-2xl py-2.5 text-[12px] font-semibold ${type === t.value ? 'bg-primary text-primary-ink' : 'bg-card-2'}`}>
                      <span aria-hidden>{t.icon}</span>{t.label}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-[13px] text-muted">Starting with <b className="text-ink">{money(amount, cur)}</b></p>
            </div>
            <div className="mt-6 flex gap-3">
              <Button variant="soft" size="lg" onClick={() => setStep(1)}>Back</Button>
              <Button size="lg" className="flex-1" onClick={() => {
                const t = ACCOUNT_TYPES.find((x) => x.value === type)!
                addAccount({ name: accName.trim() || t.label, type, startingBalance: type === 'credit' ? -amount : amount, currency: cur, icon: t.icon, color: '#174C3B' })
                setStep(3)
              }}>Create Account</Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="anim-rise text-center">
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-pos-soft text-4xl">✓</div>
            <h1 className="mt-6 text-[32px] font-semibold tracking-tight">You're ready.</h1>
            <p className="mt-2 text-[15px] text-muted">Tap <b className="text-ink">+</b> any time to record an expense.</p>
            <Button size="lg" className="mt-10 w-full" onClick={finish}>Open Kenledger</Button>
          </div>
        )}
      </div>
    </div>
  )
}
