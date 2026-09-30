import { CURRENCIES } from './constants'

export function currencyMeta(code: string) {
  return CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0]
}

/** ₹42,580.00 — split into whole + fraction so the UI can de-emphasise the paise. */
export function money(amount: number, code: string, opts: { sign?: boolean; decimals?: boolean } = {}) {
  const meta = currencyMeta(code)
  const abs = Math.abs(amount)
  const fmt = new Intl.NumberFormat(meta.locale, {
    minimumFractionDigits: opts.decimals === false ? 0 : 2,
    maximumFractionDigits: opts.decimals === false ? 0 : 2,
  }).format(abs)
  const sign = amount < 0 ? '−' : opts.sign && amount > 0 ? '+' : ''
  return `${sign}${meta.symbol}${fmt}`
}

export function moneyParts(amount: number, code: string) {
  const full = money(amount, code)
  const i = full.lastIndexOf('.')
  if (i === -1) return { whole: full, frac: '' }
  return { whole: full.slice(0, i), frac: full.slice(i) }
}

/** ₹2.8k — for chart centres and axes. */
export function compact(amount: number, code: string) {
  const meta = currencyMeta(code)
  const abs = Math.abs(amount)
  let s: string
  if (abs >= 1e7 && code === 'INR') s = (abs / 1e7).toFixed(1).replace(/\.0$/, '') + 'Cr'
  else if (abs >= 1e5 && code === 'INR') s = (abs / 1e5).toFixed(1).replace(/\.0$/, '') + 'L'
  else if (abs >= 1e6) s = (abs / 1e6).toFixed(1).replace(/\.0$/, '') + 'M'
  else if (abs >= 1e3) s = (abs / 1e3).toFixed(1).replace(/\.0$/, '') + 'k'
  else s = Math.round(abs).toString()
  return `${amount < 0 ? '−' : ''}${meta.symbol}${s}`
}

/** Parse user-typed amounts like "1,250.50". Returns NaN on garbage. */
export function parseAmount(input: string): number {
  const cleaned = input.replace(/[^0-9.]/g, '')
  if (!cleaned) return NaN
  const n = Number(cleaned)
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN
}
