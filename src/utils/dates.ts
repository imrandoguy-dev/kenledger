// All dates are handled as local-calendar strings (YYYY-MM-DD) to avoid UTC drift.

const pad = (n: number) => String(n).padStart(2, '0')

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function fromISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const today = () => toISODate(new Date())

export function addDays(iso: string, n: number): string {
  const d = fromISODate(iso)
  d.setDate(d.getDate() + n)
  return toISODate(d)
}

export function yesterday() {
  return addDays(today(), -1)
}

export function startOfWeek(iso: string, weekStart: 0 | 1): string {
  const d = fromISODate(iso)
  const diff = (d.getDay() - weekStart + 7) % 7
  d.setDate(d.getDate() - diff)
  return toISODate(d)
}

export function startOfMonth(iso: string) {
  return iso.slice(0, 8) + '01'
}
export function endOfMonth(iso: string) {
  const d = fromISODate(iso)
  return toISODate(new Date(d.getFullYear(), d.getMonth() + 1, 0))
}
export function startOfYear(iso: string) {
  return iso.slice(0, 4) + '-01-01'
}
export function endOfYear(iso: string) {
  return iso.slice(0, 4) + '-12-31'
}

export function daysBetween(a: string, b: string) {
  return Math.round((fromISODate(b).getTime() - fromISODate(a).getTime()) / 86400000)
}

export function shiftMonth(iso: string, n: number) {
  const d = fromISODate(iso)
  return toISODate(new Date(d.getFullYear(), d.getMonth() + n, 1))
}

export function monthName(iso: string, style: 'long' | 'short' = 'long') {
  return fromISODate(iso).toLocaleDateString('en-US', { month: style })
}

export function greeting(d = new Date()) {
  const h = d.getHours()
  if (h < 5) return 'Good night'
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

/** "Today", "Yesterday", or "Mon, Sep 28" */
export function relativeDay(iso: string): string {
  if (iso === today()) return 'Today'
  if (iso === yesterday()) return 'Yesterday'
  const d = fromISODate(iso)
  const sameYear = d.getFullYear() === new Date().getFullYear()
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }) })
}

export function formatDate(iso: string, fmt: 'short' | 'iso' | 'dmy' = 'short'): string {
  if (fmt === 'iso') return iso
  const d = fromISODate(iso)
  if (fmt === 'dmy') return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function shortDate(iso: string) {
  return fromISODate(iso).toLocaleDateString('en-US', { month: 'short', day: '2-digit' })
}

export function longDate(iso: string) {
  return fromISODate(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}
