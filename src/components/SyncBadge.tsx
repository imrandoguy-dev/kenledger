import { Check, CloudOff, Loader2, FlaskConical } from 'lucide-react'
import { useLedger } from '../store/ledgerStore'

/** Small status pill: Saved to sheet / Saving… / Offline. */
export function SyncBadge({ className = '' }: { className?: string }) {
  const { sync, retrySync } = useLedger()
  if (sync.conn?.demo) {
    return <a href="#/settings" className={`inline-flex items-center gap-1.5 rounded-full bg-neg-soft px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[.08em] text-neg ${className}`}><FlaskConical size={13} /> Demo · not saved</a>
  }
  if (sync.syncError) {
    return (
      <button onClick={retrySync} title={sync.syncError} className={`inline-flex items-center gap-1.5 rounded-full bg-neg-soft px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[.08em] text-neg ${className}`}>
        <CloudOff size={13} /> {sync.pending ? `${sync.pending} unsaved · retry` : 'Sync issue'}
      </button>
    )
  }
  if (sync.pending || sync.saving) {
    return <span role="status" className={`inline-flex items-center gap-1.5 rounded-full bg-card-2 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[.08em] text-muted ${className}`}><Loader2 size={13} className="animate-spin" /> Saving</span>
  }
  return <span role="status" className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[.08em] text-pos ${className}`}><Check size={13} /> Saved to sheet</span>
}
