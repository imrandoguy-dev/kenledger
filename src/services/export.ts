import type { LedgerData, Transaction } from '../types/ledger'
import { today } from '../utils/dates'

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function exportBackup(data: LedgerData) {
  const payload = { ...data, exportedAt: new Date().toISOString(), app: 'Kenledger' }
  download(`kenledger-backup-${today()}.json`, JSON.stringify(payload, null, 2), 'application/json')
}

const csvCell = (v: string | number | undefined) => {
  const s = v == null ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function transactionsToCSV(data: LedgerData, txs: Transaction[] = data.transactions): string {
  const acc = (id?: string) => data.accounts.find((a) => a.id === id)?.name ?? ''
  const cat = (id?: string) => {
    const c = data.categories.find((x) => x.id === id)
    if (!c) return ''
    const p = c.parentId ? data.categories.find((x) => x.id === c.parentId) : undefined
    return p ? `${p.name} / ${c.name}` : c.name
  }
  const curOf = (id?: string) => data.accounts.find((a) => a.id === id)?.currency || data.settings.currency
  const header = ['Date', 'Account', 'Type', 'Category', 'Description', 'Amount', 'Currency', 'To Account', 'To Amount', 'To Currency', 'Notes']
  const rows = [...txs]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((t) => [
      t.date,
      acc(t.accountId),
      t.type[0].toUpperCase() + t.type.slice(1),
      t.type === 'transfer' ? 'Transfer' : cat(t.categoryId),
      t.description,
      t.amount.toFixed(2),
      curOf(t.accountId),
      t.type === 'transfer' ? acc(t.toAccountId) : '',
      t.type === 'transfer' ? (t.toAmount ?? t.amount).toFixed(2) : '',
      t.type === 'transfer' ? curOf(t.toAccountId) : '',
      t.notes ?? '',
    ].map(csvCell).join(','))
  // BOM so Excel reads ₹ correctly; Google Sheets ignores it.
  return '﻿' + [header.join(','), ...rows].join('\n')
}

export function exportCSV(data: LedgerData, txs?: Transaction[]) {
  download(`kenledger-transactions-${today()}.csv`, transactionsToCSV(data, txs), 'text/csv;charset=utf-8')
}
