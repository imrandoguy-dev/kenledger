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

/** Data saved by the earlier browser-only version, if any. Used once to move it into the sheet. */
export function loadLegacyLocal(): LedgerData | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const d = normalize(JSON.parse(raw))
    return d.accounts.length || d.transactions.length ? d : null
  } catch { return null }
}
export function clearLegacyLocal() {
  try { localStorage.removeItem(KEY) } catch { /* noop */ }
}

/** Validates + fills defaults. Throws on clearly invalid input. */
export function normalize(input: unknown): LedgerData {
  if (!input || typeof input !== 'object') throw new Error('Not a Kenledger backup')
  const d = input as Partial<LedgerData>
  if (!Array.isArray(d.accounts) || !Array.isArray(d.transactions)) throw new Error('Backup is missing accounts or transactions')
  const base = emptyLedger()
  const custom = (Array.isArray(d.categories) ? d.categories : [])
    .filter((c) => c && (c.custom || String(c.id).startsWith('custom.')))
    .map((c) => ({ ...c, custom: true }))
  const cats = [...base.categories, ...custom]
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

