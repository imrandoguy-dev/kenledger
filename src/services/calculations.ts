import type { Account, Category, LedgerData, Transaction } from '../types/ledger'
import {
  addDays, daysBetween, endOfMonth, endOfYear, fromISODate, startOfMonth, startOfWeek, startOfYear, today,
} from '../utils/dates'

/* ---------------- Balances (derived, never stored) ---------------- */

/** Effect of a transaction on a given account's balance. */
export function effectOn(tx: Transaction, accountId: string): number {
  if (tx.type === 'expense') return tx.accountId === accountId ? -tx.amount : 0
  if (tx.type === 'income') return tx.accountId === accountId ? tx.amount : 0
  // transfer
  let e = 0
  if (tx.accountId === accountId) e -= tx.amount
  if (tx.toAccountId === accountId) e += tx.amount
  return e
}

export function accountBalance(account: Account, txs: Transaction[]): number {
  let bal = account.startingBalance
  for (const t of txs) bal += effectOn(t, account.id)
  return round(bal)
}

export function balances(accounts: Account[], txs: Transaction[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const a of accounts) out[a.id] = a.startingBalance
  for (const t of txs) {
    if (t.type === 'expense' && t.accountId in out) out[t.accountId] -= t.amount
    else if (t.type === 'income' && t.accountId in out) out[t.accountId] += t.amount
    else if (t.type === 'transfer') {
      if (t.accountId in out) out[t.accountId] -= t.amount
      if (t.toAccountId && t.toAccountId in out) out[t.toAccountId] += t.amount
    }
  }
  for (const k in out) out[k] = round(out[k])
  return out
}

export const round = (n: number) => Math.round(n * 100) / 100

export function txTouches(tx: Transaction, accountId: string) {
  return tx.accountId === accountId || tx.toAccountId === accountId
}

/* ---------------- Ranges ---------------- */

export type Period = 'day' | 'week' | 'month' | 'year' | 'custom'
export interface Range { from: string; to: string }

export function rangeFor(period: Period, anchor: string, weekStart: 0 | 1, custom?: Range): Range {
  switch (period) {
    case 'day': return { from: anchor, to: anchor }
    case 'week': { const s = startOfWeek(anchor, weekStart); return { from: s, to: addDays(s, 6) } }
    case 'month': return { from: startOfMonth(anchor), to: endOfMonth(anchor) }
    case 'year': return { from: startOfYear(anchor), to: endOfYear(anchor) }
    case 'custom': return custom ?? { from: startOfMonth(anchor), to: endOfMonth(anchor) }
  }
}

export const inRange = (d: string, r: Range) => d >= r.from && d <= r.to

/* ---------------- Filtering ---------------- */

export interface TxFilter {
  search?: string
  accountId?: string
  categoryId?: string // top-level or sub id
  type?: Transaction['type']
  range?: Range
  min?: number
  max?: number
}
export type SortKey = 'newest' | 'oldest' | 'highest' | 'lowest'

export function rootCategoryId(id: string | undefined, cats: Category[]): string | undefined {
  if (!id) return undefined
  const c = cats.find((x) => x.id === id)
  return c?.parentId ?? c?.id ?? id
}

export function filterTransactions(txs: Transaction[], f: TxFilter, cats: Category[], accounts: Account[]) {
  const q = f.search?.trim().toLowerCase()
  return txs.filter((t) => {
    if (f.accountId && !txTouches(t, f.accountId)) return false
    if (f.type && t.type !== f.type) return false
    if (f.range && !inRange(t.date, f.range)) return false
    if (f.min != null && t.amount < f.min) return false
    if (f.max != null && t.amount > f.max) return false
    if (f.categoryId) {
      if (t.categoryId !== f.categoryId && rootCategoryId(t.categoryId, cats) !== f.categoryId) return false
    }
    if (q) {
      const cat = cats.find((c) => c.id === t.categoryId)?.name ?? ''
      const acc = accounts.find((a) => a.id === t.accountId)?.name ?? ''
      const hay = `${t.description} ${t.notes ?? ''} ${cat} ${acc} ${t.amount}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })
}

export function sortTransactions(txs: Transaction[], key: SortKey = 'newest') {
  const s = [...txs]
  switch (key) {
    case 'newest': return s.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
    case 'oldest': return s.sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt))
    case 'highest': return s.sort((a, b) => b.amount - a.amount)
    case 'lowest': return s.sort((a, b) => a.amount - b.amount)
  }
}

export function groupByDate(txs: Transaction[]): [string, Transaction[]][] {
  const m = new Map<string, Transaction[]>()
  for (const t of txs) {
    const g = m.get(t.date)
    if (g) g.push(t)
    else m.set(t.date, [t])
  }
  return [...m.entries()]
}

/* ---------------- Analytics ---------------- */

export interface Summary {
  spent: number
  income: number
  net: number
  count: number
  expenseCount: number
  avgPerDay: number
  largest?: Transaction
}

/** Transfers are excluded from both spending and income. */
export function summarize(txs: Transaction[], range: Range, accountId?: string): Summary {
  let spent = 0, income = 0, count = 0, expenseCount = 0
  let largest: Transaction | undefined
  for (const t of txs) {
    if (!inRange(t.date, range)) continue
    if (accountId && t.accountId !== accountId) continue
    if (t.type === 'transfer') continue
    count++
    if (t.type === 'expense') {
      spent += t.amount
      expenseCount++
      if (!largest || t.amount > largest.amount) largest = t
    } else income += t.amount
  }
  // Average over elapsed days only (don't dilute with future days in the current period).
  const end = range.to < today() ? range.to : today()
  const days = Math.max(1, daysBetween(range.from, end) + 1)
  return { spent: round(spent), income: round(income), net: round(income - spent), count, expenseCount, avgPerDay: round(spent / days), largest }
}

export interface CategorySlice { id: string; name: string; icon: string; color: string; amount: number; pct: number; count: number }

export function categoryBreakdown(txs: Transaction[], range: Range, cats: Category[], accountId?: string): CategorySlice[] {
  const map = new Map<string, { amount: number; count: number }>()
  let total = 0
  for (const t of txs) {
    if (t.type !== 'expense' || !inRange(t.date, range)) continue
    if (accountId && t.accountId !== accountId) continue
    const root = rootCategoryId(t.categoryId, cats) ?? 'uncategorized'
    const e = map.get(root) ?? { amount: 0, count: 0 }
    e.amount += t.amount
    e.count++
    map.set(root, e)
    total += t.amount
  }
  return [...map.entries()]
    .map(([id, v]) => {
      const c = cats.find((x) => x.id === id)
      return {
        id, name: c?.name ?? 'Uncategorized', icon: c?.icon ?? '•', color: c?.color ?? '#9A9A8E',
        amount: round(v.amount), count: v.count, pct: total ? (v.amount / total) * 100 : 0,
      }
    })
    .sort((a, b) => b.amount - a.amount)
}

export interface TrendPoint { label: string; spent: number; income: number; key: string }

export function trend(txs: Transaction[], period: Period, range: Range, weekStart: 0 | 1, accountId?: string): TrendPoint[] {
  const buckets: TrendPoint[] = []
  const keyOf: (d: string) => string = (() => {
    if (period === 'year') {
      for (let m = 0; m < 12; m++) {
        const key = `${range.from.slice(0, 4)}-${String(m + 1).padStart(2, '0')}`
        buckets.push({ key, label: new Date(2000, m, 1).toLocaleDateString('en-US', { month: 'short' }), spent: 0, income: 0 })
      }
      return (d: string) => d.slice(0, 7)
    }
    if (period === 'month' || (period === 'custom' && daysBetween(range.from, range.to) > 31)) {
      // Weeks of the range
      let s = startOfWeek(range.from, weekStart)
      let i = 1
      while (s <= range.to) {
        buckets.push({ key: s, label: `W${i++}`, spent: 0, income: 0 })
        s = addDays(s, 7)
      }
      return (d: string) => startOfWeek(d, weekStart)
    }
    // Daily buckets
    let s = range.from
    while (s <= range.to) {
      const d = fromISODate(s)
      const label = period === 'week'
        ? d.toLocaleDateString('en-US', { weekday: 'short' })
        : String(d.getDate())
      buckets.push({ key: s, label, spent: 0, income: 0 })
      s = addDays(s, 1)
    }
    return (d: string) => d
  })()

  const idx = new Map(buckets.map((b, i) => [b.key, i]))
  for (const t of txs) {
    if (t.type === 'transfer' || !inRange(t.date, range)) continue
    if (accountId && t.accountId !== accountId) continue
    const i = idx.get(keyOf(t.date))
    if (i == null) continue
    if (t.type === 'expense') buckets[i].spent += t.amount
    else buckets[i].income += t.amount
  }
  return buckets.map((b) => ({ ...b, spent: round(b.spent), income: round(b.income) }))
}

export function dailySpend(txs: Transaction[], range: Range, accountId?: string): Record<string, number> {
  const out: Record<string, number> = {}
  for (const t of txs) {
    if (t.type !== 'expense' || !inRange(t.date, range)) continue
    if (accountId && t.accountId !== accountId) continue
    out[t.date] = round((out[t.date] ?? 0) + t.amount)
  }
  return out
}

export function txCountFor(accountId: string, data: LedgerData) {
  return data.transactions.filter((t) => txTouches(t, accountId)).length
}
