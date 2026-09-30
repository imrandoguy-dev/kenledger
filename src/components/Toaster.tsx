import { useUi } from '../store/ledgerStore'

export function Toaster() {
  const { toast, dismissToast } = useUi()
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-28 z-[60] flex justify-center px-4 lg:bottom-8">
      {toast && (
        <div key={toast.id} className="anim-rise pointer-events-auto flex items-center gap-4 rounded-full bg-deep py-2.5 pl-5 pr-2.5 text-sm font-medium text-[#F5F2E9] shadow-xl">
          <span>{toast.message}</span>
          {toast.action ? (
            <button onClick={() => { toast.action!.run(); dismissToast() }} className="rounded-full bg-white/15 px-3.5 py-1.5 text-[12px] font-semibold uppercase tracking-[.1em] hover:bg-white/25">
              {toast.action.label}
            </button>
          ) : <span className="w-1" />}
        </div>
      )}
    </div>
  )
}
