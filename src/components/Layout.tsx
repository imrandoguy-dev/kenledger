import type { ReactNode } from 'react'
import { BookOpen, Wallet, Plus, History, PieChart, CalendarDays, Settings as Cog, ArrowRightLeft } from 'lucide-react'
import { href, type Route } from '../router'
import { useLedger, useUi } from '../store/ledgerStore'
import { SyncBadge } from './SyncBadge'

const items = [
  { r: { name: 'home' } as Route, label: 'Overview', short: 'Home', icon: BookOpen },
  { r: { name: 'accounts' } as Route, label: 'Accounts', short: 'Accounts', icon: Wallet },
  { r: { name: 'activity' } as Route, label: 'Transactions', short: 'Activity', icon: History },
  { r: { name: 'analytics' } as Route, label: 'Analytics', short: 'Analytics', icon: PieChart },
  { r: { name: 'calendar' } as Route, label: 'Calendar', short: 'Calendar', icon: CalendarDays },
  { r: { name: 'convert' } as Route, label: 'Currency', short: 'Currency', icon: ArrowRightLeft },
]

const isActive = (route: Route, target: Route) =>
  route.name === target.name || (target.name === 'accounts' && route.name === 'account')

export function Layout({ route, children }: { route: Route; children: ReactNode }) {
  const { openTx } = useUi()
  const add = () => openTx({ type: 'expense' })

  return (
    <div className="min-h-dvh lg:flex">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line px-5 py-7 lg:flex">
        <a href="#/" className="mb-10 flex items-center gap-2.5 px-2">
          <Logo />
          <span className="text-[13px] font-bold uppercase tracking-[.22em]">Kenledger</span>
        </a>
        <nav aria-label="Main" className="space-y-1">
          {items.map(({ r, label, icon: I }) => (
            <a key={label} href={href(r)} aria-current={isActive(route, r) ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-[14px] font-medium transition-colors ${isActive(route, r) ? 'bg-primary text-primary-ink' : 'text-muted hover:bg-card-2 hover:text-ink'}`}>
              <I size={18} strokeWidth={1.8} /> {label}
            </a>
          ))}
        </nav>
        <div className="my-5 h-px bg-line" />
        <a href="#/settings" aria-current={route.name === 'settings' ? 'page' : undefined}
          className={`flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-[14px] font-medium ${route.name === 'settings' ? 'bg-primary text-primary-ink' : 'text-muted hover:bg-card-2 hover:text-ink'}`}>
          <Cog size={18} strokeWidth={1.8} /> Settings
        </a>
        <button onClick={add} className="mt-auto flex h-12 items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-primary-ink shadow-soft hover:brightness-110">
          <Plus size={18} /> Add Expense
        </button>
        <div className="mt-4 flex justify-center"><SyncBadge /></div>
      </aside>

      <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-5 pb-36 pt-6 sm:px-8 lg:px-12 lg:pb-16 lg:pt-10">
        {children}
      </main>

      {/* Mobile bottom bar — dark pill like the reference */}
      <nav aria-label="Main" className="pb-safe fixed inset-x-0 bottom-0 z-40 px-4 lg:hidden">
        <div className="mx-auto flex h-[64px] max-w-md items-center justify-between rounded-full bg-deep px-2.5 shadow-2xl">
          {[items[0], items[1]].map((it) => <BarItem key={it.label} route={route} {...it} />)}
          <button onClick={add} aria-label="Add expense"
            className="grid h-12 w-12 place-items-center rounded-full bg-[#F5F2E9] text-[#102F27] shadow-md transition-transform active:scale-95">
            <Plus size={24} strokeWidth={2.2} />
          </button>
          {[items[2], items[3]].map((it) => <BarItem key={it.label} route={route} {...it} />)}
        </div>
      </nav>
    </div>
  )
}

function BarItem({ r, short, icon: I, route }: { r: Route; short: string; icon: typeof BookOpen; route: Route }) {
  const active = isActive(route, r) || (r.name === 'activity' && (route.name === 'calendar' || route.name === 'convert'))
  return (
    <a href={href(r)} aria-label={short} aria-current={active ? 'page' : undefined}
      className={`grid h-11 w-11 place-items-center rounded-full transition-colors ${active ? 'bg-white/12 text-[#F5F2E9]' : 'text-[#F5F2E9]/55 hover:text-[#F5F2E9]'}`}>
      <I size={20} strokeWidth={1.8} />
    </a>
  )
}

export function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <rect width="64" height="64" rx="18" fill="var(--primary)" />
      <path d="M22 17v30M22 32l15-15M27 28l13 19" stroke="var(--primary-ink)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  )
}

/** Page header with optional right-side slot; shows avatar → settings on mobile. */
export function PageHeader({ title, eyebrow, right, back }: { title: ReactNode; eyebrow?: ReactNode; right?: ReactNode; back?: string }) {
  const { data } = useLedger()
  const initial = (data.settings.name || 'K').trim()[0]?.toUpperCase()
  return (
    <header className="mb-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {back && (
            <a href={back} aria-label="Back" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-card-2 text-ink hover:brightness-95">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
            </a>
          )}
          <div className="min-w-0">
            <h1 className="text-[22px] font-semibold leading-tight tracking-tight sm:text-[28px]">{title}</h1>
            {eyebrow && <p className="eyebrow mt-1">{eyebrow}</p>}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="hidden items-center gap-2 sm:flex"><SyncBadge className="lg:hidden" />{right}</div>
          <a href="#/settings" aria-label="Settings" className="grid h-10 w-10 place-items-center rounded-full bg-primary text-[15px] font-semibold text-primary-ink lg:hidden">
            {initial}
          </a>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 sm:hidden"><SyncBadge className="-ml-3" /><div className="flex items-center gap-2">{right}</div></div>
    </header>
  )
}

/** Global "All accounts ▾" scope switcher. */
export function ScopeSelect() {
  const { activeAccounts } = useLedger()
  const { scope, setScope } = useUi()
  if (activeAccounts.length < 2) return null
  return (
    <label className="relative">
      <span className="sr-only">Account filter</span>
      <select value={scope} onChange={(e) => setScope(e.target.value)} className="select max-w-[170px] truncate !rounded-full !py-2 text-[12px] font-semibold uppercase tracking-[.08em]">
        <option value="">All accounts</option>
        {activeAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
      </select>
    </label>
  )
}
