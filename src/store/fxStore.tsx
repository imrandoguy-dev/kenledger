import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Transaction } from '../types/ledger'
import { cachedLatest, convertWith, fetchLatest, isFresh, type RateTable } from '../services/fx'
import { useLedger } from './ledgerStore'
import { navigate } from '../router'
import { round } from '../services/calculations'

export interface ConverterPreset { amount?: number; from?: string; to?: string }

interface FxApi {
  rates: RateTable | null
  status: 'loading' | 'ready' | 'error'
  error?: string
  refresh: () => Promise<void>
  /** Convert at the latest rate. null if a rate is unavailable. */
  convert: (amount: number, from: string, to: string) => number | null
  /** Main currency of the ledger. */
  base: string
  toBase: (amount: number, from: string) => number | null
  /** Currency of an account (falls back to main currency). */
  curOf: (accountId?: string) => string
  /** Sum of all active account balances in the main currency. */
  totalBase: number
  /** True when accounts use more than one currency. */
  mixed: boolean
  /** Accounts whose balance couldn't be converted (no rate yet). */
  unconverted: string[]
  preset: ConverterPreset | null
  openConverter: (p?: ConverterPreset) => void
}

const FxCtx = createContext<FxApi | null>(null)

export function FxProvider({ children }: { children: ReactNode }) {
  const { data, activeAccounts, balances } = useLedger()
  const [rates, setRates] = useState<RateTable | null>(() => cachedLatest())
  const [status, setStatus] = useState<FxApi['status']>(() => (cachedLatest() ? 'ready' : 'loading'))
  const [error, setError] = useState<string>()
  const [preset, setPreset] = useState<ConverterPreset | null>(null)
  const base = data.settings.currency

  const refresh = useCallback(async () => {
    try {
      const t = await fetchLatest()
      setRates(t)
      setStatus('ready')
      setError(undefined)
    } catch {
      setError('Couldn’t get today’s exchange rates. Check your connection.')
      setStatus((s) => (s === 'loading' && !cachedLatest() ? 'error' : s === 'loading' ? 'ready' : s))
    }
  }, [])

  useEffect(() => {
    if (!isFresh(cachedLatest())) void refresh()
    const onVis = () => { if (document.visibilityState === 'visible' && !isFresh(cachedLatest())) void refresh() }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('online', onVis)
    return () => { document.removeEventListener('visibilitychange', onVis); window.removeEventListener('online', onVis) }
  }, [refresh])

  const api = useMemo<FxApi>(() => {
    const convert = (amount: number, from: string, to: string) => convertWith(rates, amount, from, to)
    const curById = new Map(data.accounts.map((a) => [a.id, a.currency || base]))
    const curOf = (id?: string) => (id && curById.get(id)) || base
    const unconverted: string[] = []
    let totalBase = 0
    for (const a of activeAccounts) {
      const v = convert(balances[a.id] ?? 0, a.currency || base, base)
      if (v == null) unconverted.push(a.id)
      else totalBase += v
    }
    const mixed = new Set(activeAccounts.map((a) => a.currency || base)).size > 1 || activeAccounts.some((a) => (a.currency || base) !== base)
    return {
      rates, status, error, refresh, convert, base,
      toBase: (amount, from) => convert(amount, from, base),
      curOf,
      totalBase: round(totalBase),
      mixed,
      unconverted,
      preset,
      openConverter: (p) => { setPreset(p ?? null); navigate({ name: 'convert' }) },
    }
  }, [rates, status, error, refresh, base, data.accounts, activeAccounts, balances, preset])

  return <FxCtx.Provider value={api}>{children}</FxCtx.Provider>
}

export function useFx() {
  const c = useContext(FxCtx)
  if (!c) throw new Error('useFx outside provider')
  return c
}

/**
 * Transactions with amounts converted into the main currency (at today's rate),
 * for totals, analytics, calendar and reports. Transfers are passed through unchanged
 * because they never count as spending or income.
 */
export function useBaseTransactions(): { txs: Transaction[]; skipped: number } {
  const { data } = useLedger()
  const { curOf, toBase, rates, base } = useFx()
  return useMemo(() => {
    let skipped = 0
    const txs: Transaction[] = []
    for (const t of data.transactions) {
      const cur = curOf(t.accountId)
      if (t.type === 'transfer' || cur === base) { txs.push(t); continue }
      const v = toBase(t.amount, cur)
      if (v == null) { skipped++; continue }
      txs.push({ ...t, amount: round(v) })
    }
    return { txs, skipped }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.transactions, data.accounts, rates, base])
}
