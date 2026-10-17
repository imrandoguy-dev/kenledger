import { useRef, useState } from 'react'
import { Loader2, Sparkles, X } from 'lucide-react'
import { useAppUpdate } from '../pwa'
import { useLedger } from '../store/ledgerStore'

/**
 * "A new version is ready" card. Appears after a new deploy reaches Netlify.
 * Waits for unsaved changes to reach the sheet before reloading.
 */
export function UpdateBanner() {
  const { ready, apply, dismiss } = useAppUpdate()
  const { sync, retrySync } = useLedger()
  const [busy, setBusy] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const syncRef = useRef(sync)
  syncRef.current = sync
  if (!ready) return null
  const unsaved = sync.pending > 0 || sync.saving

  const update = async () => {
    setBusy(true)
    if (unsaved) {
      retrySync()
      // Wait up to ~15s for queued changes to save.
      for (let i = 0; i < 30; i++) {
        await new Promise((r) => setTimeout(r, 500))
        if (!syncRef.current.pending && !syncRef.current.saving) break
      }
      // Never reload with changes that haven't reached the sheet (e.g. offline): they'd be lost.
      if (syncRef.current.pending || syncRef.current.saving) {
        setBusy(false)
        setBlocked(true)
        return
      }
    }
    await apply()
  }

  return (
    <div role="status" className="pointer-events-none fixed inset-x-0 bottom-[92px] z-[65] flex justify-center px-4 lg:bottom-6 lg:justify-end lg:px-6">
      <div className="anim-rise pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-[22px] bg-deep p-3 pl-4 text-[#F5F2E9] shadow-2xl">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10"><Sparkles size={18} /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold">New version available</p>
          <p className="text-[12px] text-[#F5F2E9]/70">{blocked ? 'Some changes aren’t saved to your sheet yet. Reconnect, then tap Update again.' : unsaved ? 'Your changes will save first.' : 'Tap update to get the latest Kenledger.'}</p>
        </div>
        <button onClick={update} disabled={busy}
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-[#F5F2E9] px-4 text-[13px] font-semibold text-[#102F27] disabled:opacity-70">
          {busy && <Loader2 size={14} className="animate-spin" />} Update
        </button>
        <button onClick={dismiss} aria-label="Later" title="Later" className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[#F5F2E9]/60 hover:bg-white/10 hover:text-[#F5F2E9]">
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
