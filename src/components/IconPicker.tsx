import { useRef, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { useLedger, useUi } from '../store/ledgerStore'
import { ACCOUNT_ICONS } from '../utils/constants'

const EMOJI = /\p{Extended_Pictographic}|\p{Regional_Indicator}|\p{Emoji_Presentation}/u

/** Split typed/pasted text into separate emoji, keeping only real emoji. */
function extractEmoji(text: string): string[] {
  const parts = typeof Intl !== 'undefined' && 'Segmenter' in Intl
    ? Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text), (s) => s.segment)
    : Array.from(text)
  return parts.map((p) => p.trim()).filter((p) => p && EMOJI.test(p))
}

/**
 * Account icon picker. The list lives in settings.accountIcons so it follows you
 * to every device through the Sheet. Tap + to add your own, Edit to remove any.
 */
export function IconPicker({ value, onChange }: { value: string; onChange: (icon: string) => void }) {
  const { data, updateSettings } = useLedger()
  const { notify } = useUi()
  const icons = data.settings.accountIcons ?? ACCOUNT_ICONS
  const [editing, setEditing] = useState(false)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const [err, setErr] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Keep the account's current icon visible even if it was removed from the list.
  const shown = value && !icons.includes(value) ? [value, ...icons] : icons
  const isDefault = !data.settings.accountIcons

  function save(list: string[]) {
    updateSettings({ accountIcons: list })
  }

  function add() {
    const found = extractEmoji(draft)
    if (!found.length) { setErr('Type or paste an emoji from your keyboard.'); return }
    const fresh = [...new Set(found)].filter((e) => !icons.includes(e))
    if (fresh.length) save([...icons, ...fresh])
    onChange(found[found.length - 1])
    setDraft(''); setErr(''); setAdding(false)
    notify(fresh.length ? `Added ${fresh.join(' ')}` : 'Already in your icons')
  }

  function remove(icon: string) {
    save(icons.filter((i) => i !== icon))
  }

  function openAdd() {
    setEditing(false); setAdding(true); setErr('')
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="eyebrow">Icon</p>
        <div className="flex items-center gap-3 text-[12px] font-semibold">
          {editing && !isDefault && (
            <button type="button" className="text-muted hover:text-ink"
              onClick={() => { updateSettings({ accountIcons: undefined }); notify('Icons reset to default') }}>Reset</button>
          )}
          <button type="button" className="text-primary" onClick={() => { setEditing((e) => !e); setAdding(false) }}>
            {editing ? 'Done' : 'Edit'}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {shown.map((i) => {
          const removable = editing && icons.includes(i)
          return (
            <div key={i} className="relative">
              <button type="button" aria-label={`Icon ${i}`} aria-pressed={value === i}
                onClick={() => (removable ? remove(i) : onChange(i))}
                className={`grid h-10 w-10 place-items-center rounded-full bg-card-2 text-lg ${value === i ? 'ring-2 ring-primary' : ''}`}>{i}</button>
              {removable && (
                <button type="button" aria-label={`Remove ${i}`} onClick={() => remove(i)}
                  className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-neg text-white shadow">
                  <X size={12} strokeWidth={3} />
                </button>
              )}
            </div>
          )
        })}
        {!editing && (
          <button type="button" aria-label="Add your own emoji" onClick={openAdd}
            className="grid h-10 w-10 place-items-center rounded-full border-2 border-dashed border-line text-muted hover:text-ink">
            <Plus size={18} />
          </button>
        )}
      </div>

      {editing && <p className="mt-2 text-[12px] text-muted">Tap an icon to remove it.</p>}

      {adding && (
        <div className="mt-3">
          <div className="flex items-center gap-2">
            <input ref={inputRef} className="field flex-1 text-center text-2xl" placeholder="😀" value={draft}
              aria-label="Emoji to add" enterKeyHint="done"
              onChange={(e) => { setDraft(e.target.value); setErr('') }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }} />
            <button type="button" onClick={add} className="h-11 rounded-full bg-primary px-5 text-sm font-semibold text-primary-ink">Add</button>
            <button type="button" aria-label="Cancel" onClick={() => { setAdding(false); setDraft(''); setErr('') }}
              className="grid h-11 w-11 place-items-center rounded-full bg-card-2 text-muted"><X size={18} /></button>
          </div>
          <p className={`mt-2 text-[12px] ${err ? 'text-neg' : 'text-muted'}`}>
            {err || 'Open your keyboard’s emoji panel and pick one — you can add several at once.'}
          </p>
        </div>
      )}
    </div>
  )
}
