import type { LedgerData } from '../types/ledger'
import { defaultCategories } from '../utils/constants'

const KEY = 'kenledger:v1'

export function emptyLedger(): LedgerData {
  return {
    version: 1,
    accounts: [],
    transactions: [],
    categories: defaultCategories(),
    settings: { name: '', currency: 'INR', theme: 'light', weekStart: 1, dateFormat: 'short', onboarded: false },
  }
}

export function loadLedger(): LedgerData {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptyLedger()
    return normalize(JSON.parse(raw))
  } catch {
    return emptyLedger()
  }
}

let lastError: string | null = null
export function saveLedger(data: LedgerData): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
    lastError = null
    return true
  } catch (e) {
    lastError = e instanceof Error ? e.message : 'Storage unavailable'
    return false
  }
}
export const storageError = () => lastError

/** Validates + fills defaults. Throws on clearly invalid input. */
export function normalize(input: unknown): LedgerData {
  if (!input || typeof input !== 'object') throw new Error('Not a Kenledger backup')
  const d = input as Partial<LedgerData>
  if (!Array.isArray(d.accounts) || !Array.isArray(d.transactions)) throw new Error('Backup is missing accounts or transactions')
  const base = emptyLedger()
  const cats = Array.isArray(d.categories) && d.categories.length ? d.categories : base.categories
  return {
    version: 1,
    accounts: d.accounts.map((a) => ({ ...a, startingBalance: Number(a.startingBalance) || 0 })),
    transactions: d.transactions
      .filter((t) => t && t.id && t.accountId && t.date)
      .map((t) => ({ ...t, amount: Math.abs(Number(t.amount)) || 0 })),
    categories: cats,
    settings: { ...base.settings, ...(d.settings ?? {}) },
  }
}

// Ask the browser to keep our storage (helps on mobile Safari/Chrome).
export function requestPersistence() {
  try { navigator.storage?.persist?.() } catch { /* noop */ }
}
