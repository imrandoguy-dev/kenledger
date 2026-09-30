import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Account, Category, LedgerData, Settings, Transaction, TxType } from '../types/ledger'
import { emptyLedger, loadLedger, saveLedger } from '../services/storage'
import { balances as calcBalances } from '../services/calculations'
import { uid } from '../utils/id'

/* ------------------------------------------------------------------ */
/* Ledger data                                                          */
/* ------------------------------------------------------------------ */

interface LedgerApi {
  data: LedgerData
  balances: Record<string, number>
  total: number
  activeAccounts: Account[]
  addAccount: (a: Omit<Account, 'id' | 'createdAt'>) => Account
  updateAccount: (id: string, patch: Partial<Account>) => void
  deleteAccount: (id: string) => void
  addTransaction: (t: Omit<Transaction, 'id' | 'createdAt'>) => Transaction
  updateTransaction: (id: string, patch: Partial<Transaction>) => void
  deleteTransaction: (id: string) => Transaction | undefined
  restoreTransaction: (t: Transaction) => void
  addCategory: (c: Omit<Category, 'id' | 'custom'>) => Category
  deleteCategory: (id: string) => void
  updateSettings: (patch: Partial<Settings>) => void
  replaceAll: (d: LedgerData) => void
  clearAll: () => void
  account: (id?: string) => Account | undefined
  category: (id?: string) => Category | undefined
}

const LedgerCtx = createContext<LedgerApi | null>(null)

export function LedgerProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<LedgerData>(() => loadLedger())

  useEffect(() => { saveLedger(data) }, [data])

  // Keep multiple tabs in sync.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => { if (e.key === 'kenledger:v1') setData(loadLedger()) }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const bal = useMemo(() => calcBalances(data.accounts, data.transactions), [data.accounts, data.transactions])
  const activeAccounts = useMemo(() => data.accounts.filter((a) => !a.archived), [data.accounts])
  const total = useMemo(() => activeAccounts.reduce((s, a) => s + (bal[a.id] ?? 0), 0), [activeAccounts, bal])

  const api: LedgerApi = useMemo(() => ({
    data,
    balances: bal,
    total,
    activeAccounts,
    addAccount: (a) => {
      const acc: Account = { ...a, id: uid(), createdAt: new Date().toISOString() }
      setData((d) => ({ ...d, accounts: [...d.accounts, acc], settings: d.settings.defaultAccountId ? d.settings : { ...d.settings, defaultAccountId: acc.id } }))
      return acc
    },
    updateAccount: (id, patch) => setData((d) => ({ ...d, accounts: d.accounts.map((a) => (a.id === id ? { ...a, ...patch } : a)) })),
    deleteAccount: (id) => setData((d) => ({
      ...d,
      accounts: d.accounts.filter((a) => a.id !== id),
      transactions: d.transactions.filter((t) => t.accountId !== id && t.toAccountId !== id),
      settings: d.settings.defaultAccountId === id ? { ...d.settings, defaultAccountId: d.accounts.find((a) => a.id !== id)?.id } : d.settings,
    })),
    addTransaction: (t) => {
      const tx: Transaction = { ...t, id: uid(), createdAt: new Date().toISOString() }
      setData((d) => ({ ...d, transactions: [...d.transactions, tx] }))
      return tx
    },
    updateTransaction: (id, patch) => setData((d) => ({ ...d, transactions: d.transactions.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
    deleteTransaction: (id) => {
      const tx = data.transactions.find((t) => t.id === id)
      setData((d) => ({ ...d, transactions: d.transactions.filter((t) => t.id !== id) }))
      return tx
    },
    restoreTransaction: (t) => setData((d) => (d.transactions.some((x) => x.id === t.id) ? d : { ...d, transactions: [...d.transactions, t] })),
    addCategory: (c) => {
      const cat: Category = { ...c, id: `custom.${uid().slice(0, 8)}`, custom: true }
      setData((d) => ({ ...d, categories: [...d.categories, cat] }))
      return cat
    },
    deleteCategory: (id) => setData((d) => ({
      ...d,
      categories: d.categories.filter((c) => c.id !== id && c.parentId !== id),
      transactions: d.transactions.map((t) => (t.categoryId === id ? { ...t, categoryId: undefined } : t)),
    })),
    updateSettings: (patch) => setData((d) => ({ ...d, settings: { ...d.settings, ...patch } })),
    replaceAll: (nd) => setData(nd),
    clearAll: () => setData(emptyLedger()),
    account: (id) => data.accounts.find((a) => a.id === id),
    category: (id) => data.categories.find((c) => c.id === id),
  }), [data, bal, total, activeAccounts])

  return <LedgerCtx.Provider value={api}>{children}</LedgerCtx.Provider>
}

export function useLedger() {
  const c = useContext(LedgerCtx)
  if (!c) throw new Error('useLedger outside provider')
  return c
}

/* ------------------------------------------------------------------ */
/* UI state: sheets, toasts, global account filter, print               */
/* ------------------------------------------------------------------ */

export interface TxSheetState { type: TxType; tx?: Transaction; accountId?: string; date?: string }
export interface Toast { id: number; message: string; action?: { label: string; run: () => void } }
export interface PrintPreset { period?: 'day' | 'week' | 'month' | 'custom'; accountId?: string; from?: string; to?: string }

interface UiApi {
  txSheet: TxSheetState | null
  openTx: (s: TxSheetState) => void
  closeTx: () => void
  accountSheet: { account?: Account } | null
  openAccount: (account?: Account) => void
  closeAccount: () => void
  viewTx: Transaction | null
  openViewTx: (t: Transaction) => void
  closeViewTx: () => void
  print: PrintPreset | null
  openPrint: (p?: PrintPreset) => void
  closePrint: () => void
  toast: Toast | null
  notify: (message: string, action?: Toast['action']) => void
  dismissToast: () => void
  scope: string // '' = all accounts
  setScope: (id: string) => void
}

const UiCtx = createContext<UiApi | null>(null)

export function UiProvider({ children }: { children: ReactNode }) {
  const [txSheet, setTxSheet] = useState<TxSheetState | null>(null)
  const [accountSheet, setAccountSheet] = useState<{ account?: Account } | null>(null)
  const [viewTx, setViewTx] = useState<Transaction | null>(null)
  const [print, setPrint] = useState<PrintPreset | null>(null)
  const [toast, setToast] = useState<Toast | null>(null)
  const [scope, setScope] = useState('')
  const timer = useRef<number | undefined>(undefined)

  const notify = useCallback((message: string, action?: Toast['action']) => {
    window.clearTimeout(timer.current)
    setToast({ id: Date.now(), message, action })
    timer.current = window.setTimeout(() => setToast(null), action ? 6000 : 3000)
  }, [])

  const api: UiApi = {
    txSheet, openTx: setTxSheet, closeTx: () => setTxSheet(null),
    accountSheet, openAccount: (account) => setAccountSheet({ account }), closeAccount: () => setAccountSheet(null),
    viewTx, openViewTx: setViewTx, closeViewTx: () => setViewTx(null),
    print, openPrint: (p) => setPrint(p ?? {}), closePrint: () => setPrint(null),
    toast, notify, dismissToast: () => setToast(null),
    scope, setScope,
  }
  return <UiCtx.Provider value={api}>{children}</UiCtx.Provider>
}

export function useUi() {
  const c = useContext(UiCtx)
  if (!c) throw new Error('useUi outside provider')
  return c
}
