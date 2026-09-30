import type { Account, Category, LedgerData, Settings, Transaction } from '../types/ledger'
import { defaultCategories } from '../utils/constants'
import { emptyLedger } from './storage'

/** Where this device's ledger lives. Only this is kept in the browser — never ledger data. */
export interface Connection { url: string; token: string; demo?: false }
export interface DemoConnection { demo: true }
export type Conn = Connection | DemoConnection

const CONN_KEY = 'kenledger:sheet'

export function loadConnection(): Connection | null {
  try {
    const raw = localStorage.getItem(CONN_KEY)
    if (!raw) return null
    const c = JSON.parse(raw)
    return c?.url && c?.token ? { url: c.url, token: c.token } : null
  } catch { return null }
}
export function saveConnection(c: Connection | null) {
  try {
    if (c) localStorage.setItem(CONN_KEY, JSON.stringify({ url: c.url, token: c.token }))
    else localStorage.removeItem(CONN_KEY)
  } catch { /* noop */ }
}

/* ---------------- Operations sent to the sheet ---------------- */

export type TxWire = Transaction & { accountName?: string; toAccountName?: string; categoryName?: string }
export type Op =
  | { op: 'upsertAccount'; data: Account }
  | { op: 'deleteAccount'; id: string }
  | { op: 'upsertTx'; data: TxWire }
  | { op: 'deleteTx'; id: string }
  | { op: 'upsertCategory'; data: Category }
  | { op: 'deleteCategory'; id: string }
  | { op: 'settings'; data: Partial<Settings> }
  | { op: 'replaceAll'; data: { accounts: Account[]; transactions: TxWire[]; categories: Category[]; settings: Settings } }

export interface RemoteMeta { spreadsheetUrl?: string; spreadsheetName?: string }

export class SheetError extends Error {}

function cleanUrl(url: string) {
  return url.trim()
}

async function parse(res: Response) {
  const text = await res.text()
  let json: { ok?: boolean; error?: string } & Record<string, unknown>
  try { json = JSON.parse(text) } catch {
    if (/<html/i.test(text)) throw new SheetError('The link didn’t return Kenledger data. Make sure you copied the Web app URL (ending in /exec) and set access to “Anyone”.')
    throw new SheetError('Unexpected response from the sheet.')
  }
  if (!json.ok) throw new SheetError(json.error || 'The sheet refused the request.')
  return json
}

export async function fetchLedger(c: Connection): Promise<{ data: LedgerData; meta: RemoteMeta; empty: boolean }> {
  const u = new URL(cleanUrl(c.url))
  u.searchParams.set('token', c.token)
  u.searchParams.set('t', String(Date.now()))
  let res: Response
  try { res = await fetch(u.toString(), { method: 'GET', redirect: 'follow' }) }
  catch { throw new SheetError('Couldn’t reach Google. Check your internet connection.') }
  const j = await parse(res) as unknown as {
    accounts: Account[]; transactions: Transaction[]; categories: Category[]; settings: Partial<Settings>
  } & RemoteMeta
  const base = emptyLedger()
  const custom = (j.categories ?? []).map((cat) => ({ ...cat, custom: true }))
  const empty = !j.accounts?.length && !j.transactions?.length && !Object.keys(j.settings ?? {}).length
  return {
    empty,
    meta: { spreadsheetUrl: j.spreadsheetUrl, spreadsheetName: j.spreadsheetName },
    data: {
      version: 1,
      accounts: (j.accounts ?? []).map((a) => ({ ...a, startingBalance: Number(a.startingBalance) || 0, archived: a.archived || undefined })),
      transactions: (j.transactions ?? []).map((t) => ({
        ...t, amount: Math.abs(Number(t.amount)) || 0,
        notes: t.notes || undefined, toAccountId: t.toAccountId || undefined, categoryId: t.categoryId || undefined,
      })),
      categories: [...defaultCategories(), ...custom],
      settings: { ...base.settings, ...(j.settings ?? {}) },
    },
  }
}

export async function sendOps(c: Connection, ops: Op[]) {
  let res: Response
  try {
    // text/plain keeps this a "simple" request, so Apps Script doesn't need CORS preflight.
    res = await fetch(cleanUrl(c.url), { method: 'POST', redirect: 'follow', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ token: c.token, ops }) })
  } catch { throw new SheetError('offline') }
  await parse(res)
}

/** Adds readable names so the Transactions tab makes sense to a human. */
export function toWire(t: Transaction, d: LedgerData): TxWire {
  const acc = (id?: string) => d.accounts.find((a) => a.id === id)?.name
  const cat = d.categories.find((c) => c.id === t.categoryId)
  const parent = cat?.parentId ? d.categories.find((c) => c.id === cat.parentId) : undefined
  return { ...t, accountName: acc(t.accountId), toAccountName: acc(t.toAccountId), categoryName: cat ? (parent ? `${parent.name} / ${cat.name}` : cat.name) : '' }
}

export function replaceAllOp(d: LedgerData): Op {
  return { op: 'replaceAll', data: { accounts: d.accounts, transactions: d.transactions.map((t) => toWire(t, d)), categories: d.categories.filter((c) => c.custom), settings: d.settings } }
}

/** Merge queued ops: consecutive settings patches become one. */
export function coalesce(ops: Op[]): Op[] {
  const out: Op[] = []
  for (const o of ops) {
    const last = out[out.length - 1]
    if (o.op === 'settings' && last?.op === 'settings') out[out.length - 1] = { op: 'settings', data: { ...last.data, ...o.data } }
    else if (o.op === 'replaceAll') { out.length = 0; out.push(o) }
    else out.push(o)
  }
  return out
}
