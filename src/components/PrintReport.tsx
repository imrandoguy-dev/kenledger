import { useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Printer } from 'lucide-react'
import { useLedger, useUi, type PrintPreset } from '../store/ledgerStore'
import { Button, Sheet } from './ui'
import { categoryBreakdown, filterTransactions, rangeFor, sortTransactions, summarize, type Range, type Period } from '../services/calculations'
import { formatDate, startOfMonth, today } from '../utils/dates'
import { money } from '../utils/currency'
import type { LedgerData } from '../types/ledger'

type RP = 'day' | 'week' | 'month' | 'custom'

interface Opts {
  period: RP
  range: Range
  accountId: string
  categoryId: string
  tx: boolean
  summary: boolean
  breakdown: boolean
  charts: boolean
}

function initial(p: PrintPreset, weekStart: 0 | 1): Opts {
  const period: RP = p.period ?? 'month'
  const range = p.from && p.to ? { from: p.from, to: p.to } : rangeFor(period as Period, today(), weekStart)
  return { period, range, accountId: p.accountId ?? '', categoryId: '', tx: true, summary: true, breakdown: true, charts: false }
}

export function PrintDialog() {
  const { print, closePrint } = useUi()
  if (!print) return null
  return <PrintDialogInner preset={print} onClose={closePrint} />
}

function PrintDialogInner({ preset, onClose }: { preset: PrintPreset; onClose: () => void }) {
  const { data, activeAccounts } = useLedger()
  const [o, setO] = useState<Opts>(() => initial(preset, data.settings.weekStart))
  const [printing, setPrinting] = useState(false)
  const set = (patch: Partial<Opts>) => setO((x) => ({ ...x, ...patch }))
  const setPeriod = (p: RP) => set({ period: p, range: p === 'custom' ? o.range : rangeFor(p, today(), data.settings.weekStart) })
  const roots = data.categories.filter((c) => !c.parentId && c.type === 'expense')

  const go = () => {
    setPrinting(true)
    // Let the portal render, then open the native dialog.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const done = () => { setPrinting(false); window.removeEventListener('afterprint', done) }
      window.addEventListener('afterprint', done)
      window.print()
    }))
  }

  return (
    <>
      <Sheet open onClose={onClose} title="Print Report"
        footer={<Button size="lg" className="w-full" onClick={go}><Printer size={18} /> Print</Button>}>
        <div className="space-y-3">
          <fieldset className="card p-4">
            <legend className="eyebrow mb-2 px-1 pt-1">Date range</legend>
            <div className="grid grid-cols-2 gap-2">
              {([['day', 'Current day'], ['week', 'This week'], ['month', 'This month'], ['custom', 'Custom']] as [RP, string][]).map(([v, l]) => (
                <label key={v} className={`flex cursor-pointer items-center gap-2.5 rounded-2xl px-3 py-2.5 text-[14px] font-medium ${o.period === v ? 'bg-primary text-primary-ink' : 'bg-card-2'}`}>
                  <input type="radio" name="period" className="sr-only" checked={o.period === v} onChange={() => setPeriod(v)} />
                  <span className={`h-3.5 w-3.5 rounded-full border-2 ${o.period === v ? 'border-primary-ink bg-primary-ink/40' : 'border-faint'}`} aria-hidden />{l}
                </label>
              ))}
            </div>
            {o.period === 'custom' && (
              <div className="mt-3 flex gap-2">
                <label className="flex-1"><span className="eyebrow mb-1 block">From</span><input type="date" className="select w-full !bg-none !pr-3" value={o.range.from} onChange={(e) => set({ range: { ...o.range, from: e.target.value } })} /></label>
                <label className="flex-1"><span className="eyebrow mb-1 block">To</span><input type="date" className="select w-full !bg-none !pr-3" value={o.range.to} onChange={(e) => set({ range: { ...o.range, to: e.target.value } })} /></label>
              </div>
            )}
            <p className="mt-3 px-1 text-[12px] text-muted">{formatDate(o.range.from)} – {formatDate(o.range.to)}</p>
          </fieldset>

          <div className="card grid grid-cols-2 gap-3 p-4">
            <label><span className="eyebrow mb-1.5 block">Account</span>
              <select className="select w-full" value={o.accountId} onChange={(e) => set({ accountId: e.target.value })}>
                <option value="">All accounts</option>
                {activeAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </label>
            <label><span className="eyebrow mb-1.5 block">Categories</span>
              <select className="select w-full" value={o.categoryId} onChange={(e) => set({ categoryId: e.target.value })}>
                <option value="">All categories</option>
                {roots.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
          </div>

          <fieldset className="card p-4">
            <legend className="eyebrow mb-2 px-1 pt-1">Include</legend>
            {([['tx', 'Transactions'], ['summary', 'Summary'], ['breakdown', 'Category breakdown'], ['charts', 'Charts']] as [keyof Opts, string][]).map(([k, l]) => (
              <label key={k} className="flex cursor-pointer items-center justify-between px-1 py-2 text-[15px]">
                {l}
                <input type="checkbox" checked={o[k] as boolean} onChange={(e) => set({ [k]: e.target.checked } as Partial<Opts>)} className="h-5 w-5 accent-[var(--primary)]" />
              </label>
            ))}
          </fieldset>
          <p className="px-1 text-[12px] text-muted">Tip: choose “Save as PDF” in the print dialog to keep a copy.</p>
        </div>
      </Sheet>
      {printing && createPortal(<PrintDocument data={data} o={o} />, document.getElementById('print-root')!)}
    </>
  )
}

/* ---------------- The printed document ---------------- */

function PrintDocument({ data, o }: { data: LedgerData; o: Opts }) {
  const cur = data.settings.currency
  const fmt = data.settings.dateFormat
  const acc = data.accounts.find((a) => a.id === o.accountId)
  const txs = sortTransactions(filterTransactions(data.transactions, { accountId: o.accountId || undefined, categoryId: o.categoryId || undefined, range: o.range }, data.categories, data.accounts), 'oldest')
  const sum = summarize(txs, o.range, o.accountId || undefined)
  const slices = categoryBreakdown(txs, o.range, data.categories, o.accountId || undefined)
  const catName = (id?: string) => {
    const c = data.categories.find((x) => x.id === id)
    return c ? c.name : ''
  }
  const accName = (id?: string) => data.accounts.find((a) => a.id === id)?.name ?? ''
  const title = o.period === 'day' ? formatDate(o.range.from, 'short')
    : o.range.from === startOfMonth(o.range.from) && o.period === 'month' ? new Date(o.range.from + 'T00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : `${formatDate(o.range.from, fmt)} – ${formatDate(o.range.to, fmt)}`
  const catLabel = o.categoryId ? data.categories.find((c) => c.id === o.categoryId)?.name : 'All categories'
  const max = Math.max(1, ...slices.map((s) => s.amount))

  const S = { font: 'Inter, system-ui, sans-serif', ink: '#17211D', muted: '#6B716B', line: '#DAD6CA', green: '#174C3B' }

  return (
    <div style={{ fontFamily: S.font, color: S.ink, fontSize: 11.5, lineHeight: 1.45 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: `2px solid ${S.green}`, paddingBottom: 12 }}>
        <div>
          <div style={{ letterSpacing: '.28em', fontWeight: 700, fontSize: 11, color: S.green }}>KENLEDGER</div>
          <div style={{ fontSize: 22, fontWeight: 600, marginTop: 6 }}>{o.tx && !o.summary ? 'Transaction Report' : 'Expense Report'}</div>
          <div style={{ fontSize: 14, color: S.muted }}>{title}</div>
        </div>
        <div style={{ textAlign: 'right', fontSize: 10.5, color: S.muted }}>
          <div><b style={{ color: S.ink }}>Account:</b> {acc?.name ?? 'All accounts'}</div>
          <div><b style={{ color: S.ink }}>Category:</b> {catLabel}</div>
          {data.settings.name && <div><b style={{ color: S.ink }}>Prepared for:</b> {data.settings.name}</div>}
          <div>Generated {formatDate(today(), fmt)}</div>
        </div>
      </div>

      {o.summary && (
        <table className="print-avoid" style={{ width: '100%', marginTop: 18, borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              {([['Total spent', money(sum.spent, cur)], ['Income', money(sum.income, cur)], ['Net', money(sum.net, cur, { sign: true })], ['Average / day', money(sum.avgPerDay, cur)], ['Transactions', String(sum.count)]] as [string, string][]).map(([k, v]) => (
                <td key={k} style={{ border: `1px solid ${S.line}`, padding: '10px 12px', width: '20%' }}>
                  <div style={{ fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', color: S.muted, fontWeight: 600 }}>{k}</div>
                  <div style={{ fontSize: 15, fontWeight: 600, marginTop: 2 }}>{v}</div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      )}

      {(o.breakdown || o.charts) && slices.length > 0 && (
        <div className="print-avoid" style={{ marginTop: 22 }}>
          <H>Category breakdown</H>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {slices.map((s) => (
                <tr key={s.id} style={{ borderBottom: `1px solid ${S.line}` }}>
                  <td style={{ padding: '6px 0', width: '30%' }}>{s.name}</td>
                  {o.charts && (
                    <td style={{ padding: '6px 12px' }}>
                      <div style={{ height: 8, background: '#EFEBDF', borderRadius: 4 }}>
                        <div style={{ height: 8, width: `${(s.amount / max) * 100}%`, background: s.color, borderRadius: 4, printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' } as CSSProperties} />
                      </div>
                    </td>
                  )}
                  <td style={{ padding: '6px 0', textAlign: 'right', width: 60, color: S.muted }}>{Math.round(s.pct)}%</td>
                  <td style={{ padding: '6px 0', textAlign: 'right', width: 110, fontWeight: 600 }}>{money(s.amount, cur)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {o.tx && (
        <div style={{ marginTop: 22 }}>
          <H>Transactions</H>
          {txs.length === 0 ? <p style={{ color: S.muted }}>No transactions in this range.</p> : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1.5px solid ${S.ink}`, textAlign: 'left', fontSize: 9, letterSpacing: '.12em', textTransform: 'uppercase', color: S.muted }}>
                  <th style={{ padding: '6px 0', width: 82 }}>Date</th>
                  <th style={{ padding: '6px 8px' }}>Description</th>
                  <th style={{ padding: '6px 8px' }}>Category</th>
                  {!o.accountId && <th style={{ padding: '6px 8px' }}>Account</th>}
                  <th style={{ padding: '6px 0', textAlign: 'right', width: 110 }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {txs.map((t) => {
                  const signed = t.type === 'expense' ? -t.amount : t.type === 'income' ? t.amount
                    : o.accountId ? (t.accountId === o.accountId ? -t.amount : t.amount) : t.amount
                  return (
                    <tr key={t.id} style={{ borderBottom: `1px solid ${S.line}` }}>
                      <td style={{ padding: '6px 0', color: S.muted }}>{formatDate(t.date, fmt === 'short' ? 'short' : fmt).replace(/, \d{4}$/, '')}</td>
                      <td style={{ padding: '6px 8px' }}>{t.description}{t.notes && <div style={{ fontSize: 9.5, color: S.muted }}>{t.notes}</div>}</td>
                      <td style={{ padding: '6px 8px', color: S.muted }}>{t.type === 'transfer' ? `Transfer → ${accName(t.toAccountId)}` : catName(t.categoryId)}</td>
                      {!o.accountId && <td style={{ padding: '6px 8px', color: S.muted }}>{accName(t.accountId)}</td>}
                      <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: t.type === 'income' ? S.green : S.ink }}>
                        {money(signed, cur, { sign: t.type === 'income' })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: `1.5px solid ${S.ink}` }}>
                  <td colSpan={o.accountId ? 3 : 4} style={{ padding: '10px 0', fontWeight: 700, letterSpacing: '.12em', fontSize: 10 }}>TOTAL SPENT</td>
                  <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: 700, fontSize: 13 }}>{money(sum.spent, cur)}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      )}
      <p style={{ marginTop: 28, fontSize: 9, color: S.muted, textAlign: 'center' }}>Generated by Kenledger · Transfers are excluded from spending and income totals.</p>
    </div>
  )
}

function H({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: 9.5, letterSpacing: '.16em', textTransform: 'uppercase', fontWeight: 700, color: '#6B716B', marginBottom: 6 }}>{children}</div>
}
