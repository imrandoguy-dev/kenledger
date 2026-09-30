import { useState, type ReactNode } from 'react'
import { Check, Copy, ExternalLink, Link2, Loader2 } from 'lucide-react'
import { useLedger } from '../store/ledgerStore'
import { Logo } from '../components/Layout'
import { Button } from '../components/ui'
import scriptSource from '../../google-apps-script/Code.gs?raw'

export function Connect() {
  const { connect, sync } = useLedger()
  const [url, setUrl] = useState('')
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(sync.loadError ?? '')
  const [copied, setCopied] = useState(false)

  async function copy() {
    try { await navigator.clipboard.writeText(scriptSource); setCopied(true); setTimeout(() => setCopied(false), 2500) }
    catch {
      const ta = document.getElementById('script-src') as HTMLTextAreaElement | null
      ta?.select()
    }
  }

  async function submit() {
    const u = url.trim()
    if (!/^https:\/\/script\.google(usercontent)?\.com\/.+/.test(u)) { setError('Paste the Web app URL from Apps Script. It starts with https://script.google.com/macros/s/ and ends in /exec.'); return }
    if (!token.trim()) { setError('Enter the secret phrase you put in the script.'); return }
    setBusy(true); setError('')
    try { await connect({ url: u, token: token.trim() }) }
    catch (e) { setError(e instanceof Error ? e.message : 'Couldn’t connect.') }
    finally { setBusy(false) }
  }

  return (
    <div className="mx-auto min-h-dvh max-w-xl px-5 py-10">
      <div className="flex items-center gap-3">
        <Logo size={44} />
        <div>
          <p className="eyebrow">Welcome to</p>
          <h1 className="text-[26px] font-semibold tracking-tight">Kenledger</h1>
        </div>
      </div>
      <p className="mt-5 text-[15px] leading-relaxed text-muted">
        Kenledger keeps your ledger in <b className="text-ink">your own Google Sheet</b>. Nothing is stored in this browser, so every phone and computer you connect sees the same accounts and transactions.
      </p>

      <ol className="mt-8 space-y-3">
        <Step n={1} title="Create a Google Sheet">
          Open <a className="font-semibold text-primary underline underline-offset-2" href="https://sheets.new" target="_blank" rel="noreferrer">sheets.new <ExternalLink size={12} className="inline" /></a> and name it something like “Kenledger”.
        </Step>
        <Step n={2} title="Add the Kenledger script">
          <p>In the sheet, open <b>Extensions → Apps Script</b>. Delete everything in the editor, paste this script, then change <code className="rounded bg-card-2 px-1">SECRET</code> near the top to a private phrase of your own. Save.</p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={copy}>{copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy script</>}</Button>
            <span className="self-center text-[12px] text-faint">{scriptSource.split('\n').length} lines</span>
          </div>
          <textarea id="script-src" readOnly value={scriptSource} aria-label="Kenledger Apps Script"
            className="mt-3 h-28 w-full resize-none rounded-2xl bg-card-2 p-3 font-mono text-[11px] leading-snug text-muted outline-none" />
        </Step>
        <Step n={3} title="Deploy it as a web app">
          Click <b>Deploy → New deployment</b>, choose type <b>Web app</b>, set <b>Execute as: Me</b> and <b>Who has access: Anyone</b>, then <b>Deploy</b>. Approve the Google permission screen (choose <i>Advanced → Go to project</i> if it warns you). Copy the <b>Web app URL</b>.
        </Step>
        <Step n={4} title="Connect this device">
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void submit() }}>
            <label className="block">
              <span className="eyebrow mb-1 block">Web app URL</span>
              <input id="conn-url" className="field text-[14px]" placeholder="https://script.google.com/macros/s/…/exec" value={url} onChange={(e) => setUrl(e.target.value)} autoComplete="off" spellCheck={false} />
            </label>
            <label className="block">
              <span className="eyebrow mb-1 block">Secret phrase</span>
              <input id="conn-token" type="password" className="field text-[14px]" placeholder="The SECRET you set in the script" value={token} onChange={(e) => setToken(e.target.value)} autoComplete="off" />
            </label>
            {error && <p role="alert" className="rounded-2xl bg-neg-soft px-4 py-2.5 text-sm font-medium text-neg">{error}</p>}
            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              {busy ? <><Loader2 size={18} className="animate-spin" /> Connecting…</> : <><Link2 size={18} /> Connect Google Sheet</>}
            </Button>
          </form>
        </Step>
      </ol>

      <p className="mt-6 text-center text-[13px] text-muted">
        On your other devices, open Kenledger and enter the same URL and secret.
      </p>
      <div className="mt-6 text-center">
        <button onClick={() => void connect({ demo: true })} className="text-[13px] font-semibold text-primary underline underline-offset-4">
          Just look around with demo data (nothing is saved)
        </button>
      </div>
    </div>
  )
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <li className="card flex gap-4 p-5">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-[14px] font-semibold text-primary-ink">{n}</span>
      <div className="min-w-0 flex-1 text-[14px] leading-relaxed text-muted [&_b]:text-ink">
        <p className="mb-1 text-[15px] font-semibold text-ink">{title}</p>
        {children}
      </div>
    </li>
  )
}

export function Loading({ label = 'Opening your sheet…' }: { label?: string }) {
  return (
    <div className="grid min-h-dvh place-items-center">
      <div className="flex flex-col items-center gap-4 text-muted">
        <Logo size={56} />
        <p className="flex items-center gap-2 text-sm"><Loader2 size={16} className="animate-spin" /> {label}</p>
      </div>
    </div>
  )
}

export function LoadError() {
  const { sync, connect, disconnect } = useLedger()
  const [busy, setBusy] = useState(false)
  return (
    <div className="grid min-h-dvh place-items-center px-6">
      <div className="card w-full max-w-sm p-6 text-center">
        <Logo size={48} />
        <h1 className="mt-4 text-[20px] font-semibold">Can’t open your sheet</h1>
        <p className="mt-2 text-sm text-muted">{sync.loadError}</p>
        <div className="mt-6 flex flex-col gap-2">
          <Button disabled={busy} onClick={async () => { if (!sync.conn) return; setBusy(true); try { await connect(sync.conn) } catch { /* shown via state */ } finally { setBusy(false) } }}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : null} Try again
          </Button>
          <Button variant="soft" onClick={disconnect}>Connect a different sheet</Button>
        </div>
      </div>
    </div>
  )
}
