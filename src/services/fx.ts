/**
 * Exchange rates. Free, no API key, updated daily.
 *  1. fawazahmed0/currency-api on jsDelivr (also has past dates)
 *  2. the same data on Cloudflare Pages
 *  3. open.er-api.com (latest only)
 * All rates are "1 USD = x CODE". Only public rates are cached in the browser — never your ledger.
 */

export interface RateTable {
  /** Calendar date the rates are for (YYYY-MM-DD). */
  date: string
  /** 1 USD = rates[CODE] */
  rates: Record<string, number>
  source: string
  fetchedAt: number
}

const CACHE_KEY = 'kenledger:fx'
const MAX_AGE = 3 * 60 * 60 * 1000 // refresh latest rates every 3 hours

function upperKeys(o: Record<string, number>) {
  const out: Record<string, number> = {}
  for (const k in o) if (typeof o[k] === 'number' && o[k] > 0) out[k.toUpperCase()] = o[k]
  out.USD = 1
  return out
}

async function getJson(url: string, ms = 9000) {
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), ms)
  try {
    const res = await fetch(url, { signal: ctl.signal, cache: 'no-store' })
    if (!res.ok) throw new Error(String(res.status))
    return await res.json()
  } finally {
    clearTimeout(t)
  }
}

/** date = 'latest' or YYYY-MM-DD */
async function fromFawaz(date: string): Promise<RateTable> {
  const urls = [
    `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${date}/v1/currencies/usd.min.json`,
    `https://${date}.currency-api.pages.dev/v1/currencies/usd.min.json`,
  ]
  let last: unknown
  for (const u of urls) {
    try {
      const j = await getJson(u)
      if (j?.usd && j?.date) return { date: j.date, rates: upperKeys(j.usd), source: 'currency-api', fetchedAt: Date.now() }
    } catch (e) { last = e }
  }
  throw last ?? new Error('No rates')
}

async function fromErApi(): Promise<RateTable> {
  const j = await getJson('https://open.er-api.com/v6/latest/USD')
  if (j?.result !== 'success' || !j.rates) throw new Error('No rates')
  const d = new Date((j.time_last_update_unix ?? Date.now() / 1000) * 1000)
  const date = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
  return { date, rates: upperKeys(j.rates), source: 'open.er-api.com', fetchedAt: Date.now() }
}

export function cachedLatest(): RateTable | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const t = JSON.parse(raw) as RateTable
    return t?.rates?.USD ? t : null
  } catch { return null }
}

export function isFresh(t: RateTable | null) {
  return !!t && Date.now() - t.fetchedAt < MAX_AGE
}

export async function fetchLatest(): Promise<RateTable> {
  let t: RateTable
  try { t = await fromFawaz('latest') } catch { t = await fromErApi() }
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(t)) } catch { /* noop */ }
  return t
}

const historyMemo = new Map<string, Promise<RateTable>>()
/** Rates for a past day (available from March 2024). */
export function fetchForDate(date: string): Promise<RateTable> {
  let p = historyMemo.get(date)
  if (!p) {
    p = fromFawaz(date)
    p.catch(() => historyMemo.delete(date))
    historyMemo.set(date, p)
  }
  return p
}

/** Converts using a USD-based table. Returns null when a rate is missing. */
export function convertWith(t: RateTable | null, amount: number, from: string, to: string): number | null {
  if (from === to) return amount
  if (!t) return null
  const f = t.rates[from.toUpperCase()], g = t.rates[to.toUpperCase()]
  if (!f || !g) return null
  return (amount / f) * g
}

export function rateOf(t: RateTable | null, from: string, to: string) {
  return convertWith(t, 1, from, to)
}

/** Pretty rate: enough significant digits for small numbers (1 INR = 0.0381 AED). */
export function formatRate(r: number) {
  if (r >= 100) return r.toLocaleString('en-US', { maximumFractionDigits: 2 })
  if (r >= 1) return r.toLocaleString('en-US', { maximumFractionDigits: 4 })
  return r.toLocaleString('en-US', { maximumSignificantDigits: 4 })
}
