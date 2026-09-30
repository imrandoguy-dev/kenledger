import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Account, Category, LedgerData, Settings, Transaction, TxType } from '../types/ledger'
import { clearLegacyLocal, emptyLedger, loadLegacyLocal } from '../services/storage'
import { coalesce, fetchLedger, loadConnection, replaceAllOp, saveConnection, sendOps, SheetError, toWire, type Conn, type Op, type RemoteMeta } from '../services/sheets'
import { demoLedger } from '../services/demo'
import { balances as calcBalances } from '../services/calculations'
import { uid } from '../utils/id'

/* ------------------------------------------------------------------ */
/* Ledger data — the Google Sheet is the source of truth.               */
/* Changes apply instantly on screen, then queue up and sync to the     */
/* sheet in small batches. Nothing from the ledger is kept in browser.  */
/* ------------------------------------------------------------------ */

export type Status = 'none' | 'loading' | 'ready' | 'error'
export interface SyncState {
  conn: Conn | null
  status: Status
  loadError?: string
  pending: number
  saving: boolean
  syncError?: string
  lastSynced?: number
  meta: RemoteMeta
  migrated?: number
}

interface LedgerApi {
  data: LedgerData
  balances: Record<string, number>
  total: number
  activeAccounts: Account[]
  sync: SyncState
  connect: (c: Conn) => Promise<void>
  disconnect: () => void
  refresh: () => Promise<void>
  retrySync: () => void
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
  const [data, setData] = useState<LedgerData>(() => emptyLedger())
  const ref = useRef(data)
  const [sync, setSync] = useState<SyncState>(() => {
    const conn = loadConnection()
    return { conn, status: conn ? 'loading' : 'none', pending: 0, saving: false, meta: {} }
  })
  const syncRef = useRef(sync)
  syncRef.current = sync
  const queue = useRef<Op[]>([])
  const busy = useRef(false)
  const timer = useRef<number | undefined>(undefined)
  const retryDelay = useRef(3000)

  const setLedger = (next: LedgerData) => { ref.current = next; setData(next) }

  /* ----- pushing changes ----- */
  const flush = useCallback(async () => {
    const conn = syncRef.current.conn
    if (!conn || conn.demo) { queue.current = []; setSync((s) => ({ ...s, pending: 0 })); return }
    if (busy.current || !queue.current.length) return
    busy.current = true
    const batch = coalesce(queue.current)
    const taken = queue.current.length
    setSync((s) => ({ ...s, saving: true }))
    try {
      await sendOps(conn, batch)
      queue.current = queue.current.slice(taken)
      retryDelay.current = 3000
      setSync((s) => ({ ...s, saving: false, syncError: undefined, pending: queue.current.length, lastSynced: Date.now() }))
    } catch (e) {
      const msg = e instanceof SheetError && e.message !== 'offline' ? e.message : 'Offline — changes will be saved when you reconnect.'
      setSync((s) => ({ ...s, saving: false, syncError: msg, pending: queue.current.length }))
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => { void flush() }, retryDelay.current)
      retryDelay.current = Math.min(retryDelay.current * 2, 60000)
      busy.current = false
      return
    }
    busy.current = false
    if (queue.current.length) void flush()
  }, [])

  const enqueue = useCallback((...ops: Op[]) => {
    queue.current.push(...ops)
    setSync((s) => ({ ...s, pending: queue.current.length }))
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => { void flush() }, 350)
  }, [flush])

  /* ----- loading ----- */
  const load = useCallback(async (conn: Conn, opts: { quiet?: boolean } = {}) => {
    if (conn.demo) {
      setLedger(demoLedger())
      setSync((s) => ({ ...s, conn, status: 'ready', loadError: undefined, meta: {} }))
      return
    }
    if (!opts.quiet) setSync((s) => ({ ...s, conn, status: 'loading', loadError: undefined }))
    try {
      const { data: remote, meta, empty } = await fetchLedger(conn)
      if (opts.quiet && (queue.current.length || busy.current)) return // don't clobber unsaved edits
      // First connection from a browser that used the old local-only version: move that data into the sheet.
      const legacy = empty ? loadLegacyLocal() : null
      if (legacy) {
        const moved = { ...legacy, settings: { ...legacy.settings, onboarded: true } }
        setLedger(moved)
        queue.current.push(replaceAllOp(moved))
        void flush()
        clearLegacyLocal()
        setSync((s) => ({ ...s, conn, status: 'ready', meta, lastSynced: Date.now(), migrated: legacy.transactions.length }))
        return
      }
      setLedger(remote)
      setSync((s) => ({ ...s, conn, status: 'ready', meta, lastSynced: Date.now(), syncError: undefined }))
    } catch (e) {
      if (opts.quiet) { setSync((s) => ({ ...s, syncError: 'Couldn’t check the sheet for updates.' })); return }
      setSync((s) => ({ ...s, conn, status: 'error', loadError: e instanceof Error ? e.message : 'Couldn’t load your sheet.' }))
    }
  }, [flush])

  useEffect(() => {
    if (sync.conn && sync.status === 'loading') void load(sync.conn)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Pick up changes made on other devices: on focus, and every minute while visible.
  useEffect(() => {
    const tick = () => {
      const s = syncRef.current
      if (s.status === 'ready' && s.conn && !s.conn.demo && document.visibilityState === 'visible') void load(s.conn, { quiet: true })
    }
    const onVis = () => { if (document.visibilityState === 'visible') tick() }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('online', () => void flush())
    const iv = window.setInterval(tick, 60000)
    return () => { document.removeEventListener('visibilitychange', onVis); window.clearInterval(iv) }
  }, [load, flush])

  // Warn before closing with unsaved changes.
  useEffect(() => {
    const onUnload = (e: BeforeUnloadEvent) => { if (queue.current.length) { e.preventDefault(); e.returnValue = '' } }
    window.addEventListener('beforeunload', onUnload)
    return () => window.removeEventListener('beforeunload', onUnload)
  }, [])

  const bal = useMemo(() => calcBalances(data.accounts, data.transactions), [data.accounts, data.transactions])
  const activeAccounts = useMemo(() => data.accounts.filter((a) => !a.archived), [data.accounts])
  const total = useMemo(() => activeAccounts.reduce((s, a) => s + (bal[a.id] ?? 0), 0), [activeAccounts, bal])

  const api: LedgerApi = useMemo(() => {
    const d = () => ref.current
    return {
      data,
      balances: bal,
      total,
      activeAccounts,
      sync,
      connect: async (c) => {
        if (!c.demo) {
          await fetchLedger(c) // throws a readable error if the link or secret is wrong
          saveConnection(c)
        }
        queue.current = []
        await load(c)
      },
      disconnect: () => {
        saveConnection(null)
        queue.current = []
        setLedger(emptyLedger())
        setSync({ conn: null, status: 'none', pending: 0, saving: false, meta: {} })
      },
      refresh: async () => { const c = syncRef.current.conn; if (c) { await flush(); await load(c, { quiet: true }) } },
      retrySync: () => { retryDelay.current = 3000; void flush() },
      addAccount: (a) => {
        const acc: Account = { ...a, id: uid(), createdAt: new Date().toISOString() }
        const cur = d()
        const settings = cur.settings.defaultAccountId ? cur.settings : { ...cur.settings, defaultAccountId: acc.id }
        setLedger({ ...cur, accounts: [...cur.accounts, acc], settings })
        enqueue({ op: 'upsertAccount', data: acc }, ...(settings !== cur.settings ? [{ op: 'settings', data: { defaultAccountId: acc.id } } as Op] : []))
        return acc
      },
      updateAccount: (id, patch) => {
        const cur = d()
        const accounts = cur.accounts.map((a) => (a.id === id ? { ...a, ...patch } : a))
        setLedger({ ...cur, accounts })
        const acc = accounts.find((a) => a.id === id)
        if (acc) enqueue({ op: 'upsertAccount', data: acc })
      },
      deleteAccount: (id) => {
        const cur = d()
        const fallback = cur.accounts.find((a) => a.id !== id)?.id
        const settings = cur.settings.defaultAccountId === id ? { ...cur.settings, defaultAccountId: fallback } : cur.settings
        setLedger({
          ...cur,
          accounts: cur.accounts.filter((a) => a.id !== id),
          transactions: cur.transactions.filter((t) => t.accountId !== id && t.toAccountId !== id),
          settings,
        })
        enqueue({ op: 'deleteAccount', id }, ...(settings !== cur.settings ? [{ op: 'settings', data: { defaultAccountId: fallback ?? null } } as unknown as Op] : []))
      },
      addTransaction: (t) => {
        const tx: Transaction = { ...t, id: uid(), createdAt: new Date().toISOString() }
        const next = { ...d(), transactions: [...d().transactions, tx] }
        setLedger(next)
        enqueue({ op: 'upsertTx', data: toWire(tx, next) })
        return tx
      },
      updateTransaction: (id, patch) => {
        const cur = d()
        const transactions = cur.transactions.map((t) => (t.id === id ? { ...t, ...patch } : t))
        const next = { ...cur, transactions }
        setLedger(next)
        const tx = transactions.find((t) => t.id === id)
        if (tx) enqueue({ op: 'upsertTx', data: toWire(tx, next) })
      },
      deleteTransaction: (id) => {
        const cur = d()
        const tx = cur.transactions.find((t) => t.id === id)
        setLedger({ ...cur, transactions: cur.transactions.filter((t) => t.id !== id) })
        enqueue({ op: 'deleteTx', id })
        return tx
      },
      restoreTransaction: (t) => {
        const cur = d()
        if (cur.transactions.some((x) => x.id === t.id)) return
        const next = { ...cur, transactions: [...cur.transactions, t] }
        setLedger(next)
        enqueue({ op: 'upsertTx', data: toWire(t, next) })
      },
      addCategory: (c) => {
        const cat: Category = { ...c, id: `custom.${uid().slice(0, 8)}`, custom: true }
        setLedger({ ...d(), categories: [...d().categories, cat] })
        enqueue({ op: 'upsertCategory', data: cat })
        return cat
      },
      deleteCategory: (id) => {
        const cur = d()
        setLedger({
          ...cur,
          categories: cur.categories.filter((c) => c.id !== id && c.parentId !== id),
          transactions: cur.transactions.map((t) => (t.categoryId === id || cur.categories.find((c) => c.id === t.categoryId)?.parentId === id ? { ...t, categoryId: undefined } : t)),
        })
        enqueue({ op: 'deleteCategory', id })
      },
      updateSettings: (patch) => {
        setLedger({ ...d(), settings: { ...d().settings, ...patch } })
        enqueue({ op: 'settings', data: patch })
      },
      replaceAll: (nd) => { setLedger(nd); enqueue(replaceAllOp(nd)) },
      clearAll: () => { const e = emptyLedger(); setLedger(e); enqueue(replaceAllOp(e)) },
      account: (id) => data.accounts.find((a) => a.id === id),
      category: (id) => data.categories.find((c) => c.id === id),
    }
  }, [data, bal, total, activeAccounts, sync, enqueue, flush, load])

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
