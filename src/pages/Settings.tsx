import { useRef, useState, type ReactNode } from 'react'
import { Download, Upload, FileSpreadsheet, Trash2, Sparkles, Plus, X, ShieldCheck, Smartphone, RefreshCw, Unlink, ExternalLink, Link2 } from 'lucide-react'
import { SyncBadge } from '../components/SyncBadge'
import { useLedger, useUi } from '../store/ledgerStore'
import { PageHeader } from '../components/Layout'
import { Button, Confirm, Segmented, Bubble } from '../components/ui'
import { exportBackup, exportCSV } from '../services/export'
import { readBackupFile } from '../services/import'
import { demoLedger } from '../services/demo'
import { CURRENCIES } from '../utils/constants'
import type { LedgerData, Theme } from '../types/ledger'
import { useInstallPrompt } from '../pwa'
import scriptSource from '../../google-apps-script/Code.gs?raw'

const SCRIPT_VERSION = Number(/const VERSION = (\d+)/.exec(scriptSource)?.[1] ?? 1)

/** Shown when the sheet runs an older copy of the Apps Script. */
function ScriptUpdate() {
  const [copied, setCopied] = useState(false)
  return (
    <div className="bg-neg-soft/60 px-4 py-4 text-[13px] leading-relaxed">
      <p className="text-[15px] font-semibold text-ink">Update your sheet script</p>
      <p className="mt-1 text-muted">A newer script adds currency columns and saves transfers between currencies. Your data stays as it is.</p>
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted [&_b]:text-ink">
        <li>Copy the new script, open your sheet → <b>Extensions → Apps Script</b>, replace everything and paste.</li>
        <li>Put your own secret back on the <b>SECRET</b> line, then Save.</li>
        <li><b>Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy</b>. The URL stays the same.</li>
        <li>Come back here and tap <b>Refresh now</b>.</li>
      </ol>
      <Button size="sm" className="mt-3" onClick={async () => {
        try { await navigator.clipboard.writeText(scriptSource); setCopied(true); setTimeout(() => setCopied(false), 2500) } catch { /* noop */ }
      }}>{copied ? 'Copied' : 'Copy new script'}</Button>
    </div>
  )
}

const CAT_ICONS = ['🐾', '👶', '💄', '🏡', '📚', '🧘', '🍺', '🚗', '🎨', '🛠️', '💼', '🎓', '🧾', '📌']

export function Settings() {
  const { data, updateSettings, activeAccounts, replaceAll, clearAll, addCategory, deleteCategory, sync, refresh, disconnect } = useLedger()
  const [confirmDisconnect, setConfirmDisconnect] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const demo = !!sync.conn?.demo
  const { notify } = useUi()
  const s = data.settings
  const fileRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<LedgerData | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const [confirmDemo, setConfirmDemo] = useState(false)
  const [catName, setCatName] = useState('')
  const [catIcon, setCatIcon] = useState(CAT_ICONS[0])
  const [catType, setCatType] = useState<'expense' | 'income'>('expense')
  const install = useInstallPrompt()
  const custom = data.categories.filter((c) => c.custom)

  async function onFile(f?: File) {
    if (!f) return
    try { setPending(await readBackupFile(f)) }
    catch (e) { notify(e instanceof Error ? e.message : 'Could not read backup') }
    finally { if (fileRef.current) fileRef.current.value = '' }
  }

  return (
    <>
      <PageHeader title="Settings" eyebrow="Kenledger · Version 1.0" />

      <Group title="Google Sheet">
        {demo ? (
          <Action icon={<Link2 size={18} />} title="Connect a Google Sheet" body="You're in demo mode — nothing is being saved" onClick={disconnect} />
        ) : (
          <>
            <div className="flex items-center justify-between gap-3 px-4 py-3.5">
              <div className="min-w-0">
                <p className="truncate text-[15px] font-semibold">{sync.meta.spreadsheetName ?? 'Connected sheet'}</p>
                <p className="text-[12px] text-muted">{sync.lastSynced ? `Last synced ${new Date(sync.lastSynced).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : 'Connected'}</p>
              </div>
              <SyncBadge />
            </div>
            {sync.syncError && <p className="px-4 py-3 text-[13px] text-neg">{sync.syncError}</p>}
            {(sync.meta.scriptVersion ?? 1) < SCRIPT_VERSION && <ScriptUpdate />}
            {sync.meta.spreadsheetUrl && (
              <a href={sync.meta.spreadsheetUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3.5 px-4 py-3.5 hover:bg-card-2/50">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-card-2 text-primary"><ExternalLink size={18} /></span>
                <span><span className="block text-[15px] font-semibold">Open in Google Sheets</span><span className="text-[13px] text-muted">See every transaction in the Transactions tab</span></span>
              </a>
            )}
            <Action icon={<RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />} title="Refresh now" body="Pull changes made on your other devices"
              onClick={async () => { setRefreshing(true); await refresh(); setRefreshing(false); notify('Up to date') }} />
            <Action icon={<Unlink size={18} />} title="Disconnect this device" body="Your sheet and data stay untouched" onClick={() => setConfirmDisconnect(true)} />
          </>
        )}
      </Group>

      <Group title="Profile">
        <Row label="Your name">
          <input value={s.name} onChange={(e) => updateSettings({ name: e.target.value })} placeholder="Add name" maxLength={30}
            className="w-40 bg-transparent text-right text-[15px] text-muted outline-none placeholder:text-faint focus:text-ink" />
        </Row>
      </Group>

      <Group title="Appearance">
        <div className="px-4 py-3.5">
          <p className="mb-2.5 text-[15px] font-semibold">Theme</p>
          <Segmented<Theme> label="Theme" value={s.theme} onChange={(t) => updateSettings({ theme: t })}
            options={[{ value: 'system', label: 'System' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} />
        </div>
        <Row label="Main currency" hint="Totals, analytics and reports use this">
          <select className="select max-w-[150px]" value={s.currency} onChange={(e) => updateSettings({ currency: e.target.value })}>
            {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
          </select>
        </Row>
      </Group>

      <Group title="Preferences">
        <Row label="Start of week">
          <select className="select" value={s.weekStart} onChange={(e) => updateSettings({ weekStart: Number(e.target.value) as 0 | 1 })}>
            <option value={1}>Monday</option><option value={0}>Sunday</option>
          </select>
        </Row>
        <Row label="Date format" hint="Used in reports and exports">
          <select className="select" value={s.dateFormat} onChange={(e) => updateSettings({ dateFormat: e.target.value as typeof s.dateFormat })}>
            <option value="short">Sep 30, 2026</option><option value="dmy">30/09/2026</option><option value="iso">2026-09-30</option>
          </select>
        </Row>
        <Row label="Default account">
          <select className="select max-w-[160px]" value={s.defaultAccountId ?? ''} onChange={(e) => updateSettings({ defaultAccountId: e.target.value || undefined })}>
            {!activeAccounts.length && <option value="">None</option>}
            {activeAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </Row>
      </Group>

      <Group title="Categories">
        <div className="px-4 py-4">
          <p className="mb-3 text-[13px] text-muted">{data.categories.filter((c) => !c.parentId).length} categories · sub-categories can be added while recording an expense.</p>
          {custom.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {custom.map((c) => (
                <span key={c.id} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-card-2 pl-3 pr-1 text-[13px] font-medium">
                  {c.icon} {c.name}
                  {c.parentId && <span className="text-faint">· {data.categories.find((p) => p.id === c.parentId)?.name}</span>}
                  <button onClick={() => { deleteCategory(c.id); notify(`${c.name} removed`) }} aria-label={`Remove ${c.name}`} className="grid h-7 w-7 place-items-center rounded-full text-muted hover:bg-bg"><X size={13} /></button>
                </span>
              ))}
            </div>
          )}
          <form className="flex flex-wrap items-center gap-2" onSubmit={(e) => {
            e.preventDefault()
            if (!catName.trim()) return
            addCategory({ name: catName.trim(), icon: catIcon, color: catType === 'income' ? '#2F6B55' : '#8A6A3F', type: catType })
            notify(`${catName.trim()} added`); setCatName('')
          }}>
            <select aria-label="Icon" className="select !pr-7 text-lg" value={catIcon} onChange={(e) => setCatIcon(e.target.value)}>
              {CAT_ICONS.map((i) => <option key={i}>{i}</option>)}
            </select>
            <input value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="New category" aria-label="Category name" maxLength={30}
              className="select min-w-0 flex-1 !bg-none !pr-3" />
            <select aria-label="Category type" className="select" value={catType} onChange={(e) => setCatType(e.target.value as 'expense' | 'income')}>
              <option value="expense">Expense</option><option value="income">Income</option>
            </select>
            <Button size="sm" type="submit"><Plus size={14} /> Add</Button>
          </form>
        </div>
      </Group>

      <Group title="Data">
        <Action icon={<Download size={18} />} title="Export Backup" body="Download all Kenledger data (.json)" onClick={() => { exportBackup(data); notify('Backup downloaded') }} />
        <Action icon={<Upload size={18} />} title="Import Backup" body="Restore from a .json backup" onClick={() => fileRef.current?.click()} />
        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        <Action icon={<FileSpreadsheet size={18} />} title="Export CSV" body="Open in Google Sheets or Excel" onClick={() => { exportCSV(data); notify('CSV downloaded') }} disabled={!data.transactions.length} />
        {demo && <Action icon={<Sparkles size={18} />} title="Reset Demo Data" body="Start the demo over" onClick={() => setConfirmDemo(true)} />}
        <Action icon={<Trash2 size={18} />} title="Clear All Data" body={demo ? "Empty the demo ledger" : "Delete every account and transaction from your sheet"} onClick={() => setConfirmClear(true)} danger />
      </Group>

      <div className="mt-5 flex gap-3 rounded-[22px] bg-pos-soft p-4 text-[13px] leading-relaxed text-ink">
        <ShieldCheck size={20} className="shrink-0 text-pos" />
        <p>{demo ? 'Demo mode: changes live only in this tab and disappear when you close it.' : 'Your ledger lives only in your own Google Sheet — this browser just remembers which sheet to open. Connect any other device with the same Web app URL and secret.'}</p>
      </div>

      {install.canInstall && (
        <button onClick={install.prompt} className="card mt-3 flex w-full items-center gap-3 p-4 text-left hover:brightness-[.99]">
          <Bubble size={40}><Smartphone size={18} className="text-primary" /></Bubble>
          <span className="flex-1"><span className="block text-[15px] font-semibold">Install Kenledger</span><span className="text-[13px] text-muted">Add to your home screen · works offline</span></span>
        </button>
      )}

      <p className="mt-8 text-center text-[12px] text-faint">Kenledger 1.0 · {data.transactions.length} transactions · {data.accounts.length} accounts</p>

      <Confirm open={!!pending} title="Restore backup?" danger={false}
        body={pending && <>This replaces everything in your ledger with <b className="text-ink">{pending.accounts.length} accounts</b> and <b className="text-ink">{pending.transactions.length} transactions</b> from the backup.</>}
        confirmLabel="Restore" onCancel={() => setPending(null)}
        onConfirm={() => { replaceAll({ ...pending!, settings: { ...pending!.settings, onboarded: true } }); setPending(null); notify('Backup restored') }} />
      <Confirm open={confirmDisconnect} title="Disconnect this device?" danger={false}
        body="Kenledger will forget the sheet link on this browser. Your Google Sheet and all its data stay as they are, and you can reconnect any time."
        confirmLabel="Disconnect" onCancel={() => setConfirmDisconnect(false)} onConfirm={() => { setConfirmDisconnect(false); disconnect() }} />
      <Confirm open={confirmClear} title="Delete all data?" body="This cannot be undone unless you have a backup." confirmLabel="Delete Everything"
        onCancel={() => setConfirmClear(false)} onConfirm={() => { clearAll(); setConfirmClear(false); window.location.hash = '#/' }} />
      <Confirm open={confirmDemo} title="Reset demo data?" danger={false}
        body='Loads three sample accounts and two months of transactions again.'
        confirmLabel="Load Demo" onCancel={() => setConfirmDemo(false)}
        onConfirm={() => { replaceAll(demoLedger(s.name || 'Julian')); setConfirmDemo(false); notify('Demo data loaded'); window.location.hash = '#/' }} />
    </>
  )
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-6 first-of-type:mt-0">
      <h2 className="eyebrow mb-2 px-1">{title}</h2>
      <div className="card divide-y divide-line">{children}</div>
    </section>
  )
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <div><p className="text-[15px] font-semibold">{label}</p>{hint && <p className="text-[12px] text-muted">{hint}</p>}</div>
      {children}
    </div>
  )
}

function Action({ icon, title, body, onClick, danger, disabled }: { icon: ReactNode; title: string; body: string; onClick: () => void; danger?: boolean; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left hover:bg-card-2/50 disabled:opacity-40">
      <span className={`grid h-10 w-10 place-items-center rounded-full ${danger ? 'bg-neg-soft text-neg' : 'bg-card-2 text-primary'}`}>{icon}</span>
      <span><span className={`block text-[15px] font-semibold ${danger ? 'text-neg' : ''}`}>{title}</span><span className="text-[13px] text-muted">{body}</span></span>
    </button>
  )
}
