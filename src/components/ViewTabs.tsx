import { CalendarDays, List, ArrowRightLeft } from 'lucide-react'

type View = 'list' | 'calendar' | 'currency'

const TABS: { id: View; href: string; label: string; icon: typeof List }[] = [
  { id: 'list', href: '#/activity', label: 'List', icon: List },
  { id: 'calendar', href: '#/calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'currency', href: '#/convert', label: 'Currency', icon: ArrowRightLeft },
]

/** Phone-only switcher between the Activity views. Desktop uses the sidebar. */
export function ViewTabs({ active }: { active: View }) {
  return (
    <div className="mb-4 flex rounded-full bg-card-2 p-1 lg:hidden" role="tablist" aria-label="View">
      {TABS.map(({ id, href, label, icon: I }) => (
        <a key={id} role="tab" aria-selected={active === id} href={href}
          className={`flex h-9 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full text-[12px] font-semibold uppercase tracking-[.08em] ${active === id ? 'bg-primary text-primary-ink' : 'text-muted'}`}>
          <I size={14} className="shrink-0" /> <span className="truncate">{label}</span>
        </a>
      ))}
    </div>
  )
}
