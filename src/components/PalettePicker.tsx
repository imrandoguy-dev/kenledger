import { useEffect, useMemo, useState } from 'react'
import { Check, Pencil, Plus, Trash2 } from 'lucide-react'
import { useLedger, useUi } from '../store/ledgerStore'
import { Button, Confirm, Segmented, Sheet } from './ui'
import {
  allPalettes, BASE_FIELDS, baseFromTokens, BUILT_IN, DEFAULT_PALETTE, deriveOther, normHex, starterBase, tokensFromBase,
  type BaseColors, type CustomPalette, type Mode, type Palette, type Tokens,
} from '../theme/palettes'
import { uid } from '../utils/id'

/** Which mode is showing right now (System follows the phone). */
function useMode(): Mode {
  const { data } = useLedger()
  const t = data.settings.theme
  const [sysDark, setSysDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const on = () => setSysDark(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return t === 'dark' || (t === 'system' && sysDark) ? 'dark' : 'light'
}

export function PalettePicker() {
  const { data, updateSettings } = useLedger()
  const { notify } = useUi()
  const mode = useMode()
  const custom = data.settings.customPalettes ?? []
  const current = data.settings.palette ?? DEFAULT_PALETTE
  const palettes = allPalettes(custom)
  const [editing, setEditing] = useState<CustomPalette | 'new' | null>(null)

  return (
    <div className="px-4 py-3.5">
      <div className="mb-2.5 flex items-baseline justify-between">
        <p className="text-[15px] font-semibold">Colour palette</p>
        <p className="text-[12px] text-muted">{mode === 'dark' ? 'Dark' : 'Light'} shown</p>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3" role="radiogroup" aria-label="Colour palette">
        {palettes.map((p) => (
          <PaletteCard key={p.id} p={p} t={p[mode]} selected={p.id === current}
            onSelect={() => { updateSettings({ palette: p.id }); notify(`${p.name} palette on`) }}
            onEdit={p.custom ? () => setEditing(custom.find((c) => c.id === p.id) ?? null) : undefined} />
        ))}
        <button onClick={() => setEditing('new')}
          className="flex min-h-[104px] flex-col items-center justify-center gap-1.5 rounded-[18px] border-2 border-dashed border-line text-[13px] font-semibold text-muted hover:border-primary hover:text-primary">
          <Plus size={18} /> New palette
        </button>
      </div>
      {editing && (
        <PaletteEditor
          initial={editing === 'new' ? null : editing}
          mode={mode}
          onClose={() => setEditing(null)}
          onSave={(pal) => {
            const exists = custom.some((c) => c.id === pal.id)
            updateSettings({ customPalettes: exists ? custom.map((c) => (c.id === pal.id ? pal : c)) : [...custom, pal], palette: pal.id })
            notify(exists ? `${pal.name} updated` : `${pal.name} created`)
            setEditing(null)
          }}
          onDelete={(id) => {
            updateSettings({ customPalettes: custom.filter((c) => c.id !== id), ...(current === id ? { palette: DEFAULT_PALETTE } : {}) })
            notify('Palette deleted')
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}

function PaletteCard({ p, t, selected, onSelect, onEdit }: { p: Palette; t: Tokens; selected: boolean; onSelect: () => void; onEdit?: () => void }) {
  return (
    <div className="relative">
      <button role="radio" aria-checked={selected} onClick={onSelect}
        className={`w-full overflow-hidden rounded-[18px] text-left transition-transform active:scale-[.98] ${selected ? 'ring-2 ring-primary ring-offset-2 ring-offset-card' : 'ring-1 ring-line'}`}>
        <Swatch t={t} />
        <span className="flex items-center gap-1.5 bg-card px-3 py-2 text-[13px] font-semibold">
          {selected && <Check size={14} className="text-primary" />}
          <span className="truncate">{p.name}</span>
        </span>
      </button>
      {onEdit && (
        <button onClick={onEdit} aria-label={`Edit ${p.name}`}
          className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-black/25 text-white backdrop-blur hover:bg-black/40">
          <Pencil size={12} />
        </button>
      )}
    </div>
  )
}

/** Tiny dashboard drawn in the palette's own colours. */
function Swatch({ t, big }: { t: Tokens; big?: boolean }) {
  return (
    <span className={`block ${big ? 'p-4' : 'p-2.5'}`} style={{ background: t.bg }} aria-hidden>
      <span className={`block rounded-xl ${big ? 'p-4' : 'p-2'}`} style={{ background: t.card }}>
        <span className={`block font-semibold ${big ? 'text-[11px]' : 'text-[8px]'} tracking-[.12em]`} style={{ color: t.muted }}>BALANCE</span>
        <span className={`block font-semibold tnum ${big ? 'text-[26px]' : 'text-[15px]'} leading-tight`} style={{ color: t.ink }}>₹31,469</span>
        <span className="mt-1.5 flex items-center gap-1.5">
          <span className={`rounded-full ${big ? 'px-3 py-1 text-[11px]' : 'px-1.5 py-px text-[7px]'} font-semibold`} style={{ background: t.primary, color: t.primaryInk }}>Add</span>
          <span className={`${big ? 'text-[12px]' : 'text-[8px]'} font-semibold`} style={{ color: t.pos }}>+1.5k</span>
          <span className={`${big ? 'text-[12px]' : 'text-[8px]'} font-semibold`} style={{ color: t.neg }}>−6.6k</span>
        </span>
      </span>
      {big && (
        <span className="mt-3 flex h-10 items-center justify-around rounded-full px-4" style={{ background: t.deep }}>
          <span className="h-2 w-6 rounded-full opacity-60" style={{ background: t.navInk }} />
          <span className="grid h-7 w-7 place-items-center rounded-full text-[14px] font-bold" style={{ background: t.navInk, color: t.deep }}>+</span>
          <span className="h-2 w-6 rounded-full opacity-60" style={{ background: t.navInk }} />
        </span>
      )}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/* Create / edit a custom palette                                       */
/* ------------------------------------------------------------------ */

function PaletteEditor({ initial, mode, onClose, onSave, onDelete }: {
  initial: CustomPalette | null
  mode: Mode
  onClose: () => void
  onSave: (p: CustomPalette) => void
  onDelete: (id: string) => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [tab, setTab] = useState<Mode>(mode)
  const [colors, setColors] = useState<Record<Mode, BaseColors>>(() => ({
    dark: initial?.dark ?? starterBase('dark'),
    light: initial?.light ?? starterBase('light'),
  }))
  // A new palette's other mode is made automatically until you edit it yourself.
  const [touched, setTouched] = useState<Record<Mode, boolean>>({ dark: !!initial, light: !!initial })
  const [chart, setChart] = useState<string[]>(() => initial?.chart?.length ? initial.chart : [])
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const other: Mode = tab === 'dark' ? 'light' : 'dark'
  const shown = colors[tab]
  const preview = useMemo(() => tokensFromBase(shown, tab), [shown, tab])

  const setColor = (key: keyof BaseColors, value: string) => {
    const next = { ...colors, [tab]: { ...colors[tab], [key]: value } }
    const t2 = { ...touched, [tab]: true }
    // Keep the untouched mode in step with what you're typing.
    if (!t2[other] && normHex(value)) next[other] = deriveOther(next[tab], other)
    setColors(next)
    setTouched(t2)
    setError('')
  }

  const startFrom = (id: string) => {
    const p = BUILT_IN.find((b) => b.id === id)
    if (!p) return
    setColors({ dark: baseFromTokens(p.dark), light: baseFromTokens(p.light) })
    setChart(p.chart)
    setTouched({ dark: true, light: true })
  }

  function save() {
    if (!name.trim()) { setError('Give your palette a name.'); return }
    for (const m of ['dark', 'light'] as Mode[]) {
      for (const f of BASE_FIELDS) {
        if (!normHex(colors[m][f.key])) { setTab(m); setError(`${m === 'dark' ? 'Dark' : 'Light'} · ${f.label} isn’t a valid colour code. Use something like #F2A07B.`); return }
      }
    }
    const clean = (b: BaseColors) => Object.fromEntries(Object.entries(b).map(([k, v]) => [k, normHex(v)!])) as unknown as BaseColors
    onSave({
      id: initial?.id ?? `custom-${uid().slice(0, 8)}`,
      name: name.trim(),
      dark: clean(colors.dark),
      light: clean(colors.light),
      chart: chart.map((c) => normHex(c)).filter((c): c is string => !!c),
    })
  }

  return (
    <>
      <Sheet open={!confirmDelete} onClose={onClose} title={initial ? 'Edit palette' : 'New palette'} wide
        footer={
          <div className="flex gap-3">
            {initial && <Button variant="soft" onClick={() => setConfirmDelete(true)}><Trash2 size={16} /> Delete</Button>}
            <Button size="lg" className="flex-1" onClick={save}>{initial ? 'Save palette' : 'Create & use'}</Button>
          </div>
        }>
        <div className="space-y-4">
          <div className="card space-y-4 p-5">
            <label className="block">
              <span className="eyebrow">Name</span>
              <input id="pal-name" data-autofocus className="field text-[17px]" placeholder="e.g. Desert Night" value={name} onChange={(e) => { setName(e.target.value); setError('') }} maxLength={30} />
            </label>
            {!initial && (
              <label className="block">
                <span className="eyebrow">Start from (optional)</span>
                <select id="pal-start" className="select mt-1.5 w-full" defaultValue="" onChange={(e) => e.target.value && startFrom(e.target.value)}>
                  <option value="">Blank — Midnight Peach colours</option>
                  {BUILT_IN.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </label>
            )}
          </div>

          <Segmented<Mode> label="Mode" value={tab} onChange={setTab}
            options={[{ value: 'dark', label: 'Dark colours' }, { value: 'light', label: 'Light colours' }]} />
          {!touched[tab] && touched[other] && (
            <p className="-mt-1 px-1 text-[12px] text-muted">Made automatically from your {other} colours. Change any you like.</p>
          )}

          <div className="grid gap-4 md:grid-cols-[1fr_minmax(0,240px)]">
            <div className="card divide-y divide-line">
              {BASE_FIELDS.map((f) => (
                <ColorRow key={`${tab}-${f.key}`} id={`pal-${tab}-${f.key}`} label={f.label} value={shown[f.key]} onChange={(v) => setColor(f.key, v)} />
              ))}
            </div>
            <div className="space-y-3">
              <div className="overflow-hidden rounded-[18px] ring-1 ring-line"><Swatch t={preview} big /></div>
              <p className="px-1 text-[11px] text-muted">Text and buttons are adjusted a little if needed so they stay readable.</p>
            </div>
          </div>

          <div className="card p-4">
            <p className="text-[15px] font-semibold">Chart colours <span className="text-[12px] font-normal text-muted">(optional)</span></p>
            <p className="mb-3 text-[12px] text-muted">Used for the biggest spending categories in Analytics. Leave empty to keep each category’s own colour.</p>
            <div className="flex flex-wrap gap-2">
              {chart.map((c, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-card-2 py-1 pl-1 pr-1">
                  <input type="color" aria-label={`Chart colour ${i + 1}`} value={normHex(c) ?? '#000000'} onChange={(e) => setChart(chart.map((x, j) => (j === i ? e.target.value.toUpperCase() : x)))}
                    className="h-7 w-7 cursor-pointer rounded-full border-0 bg-transparent p-0" />
                  <input aria-label={`Chart colour ${i + 1} code`} value={c} onChange={(e) => setChart(chart.map((x, j) => (j === i ? e.target.value : x)))}
                    className="w-[74px] bg-transparent font-mono text-[12px] uppercase outline-none" maxLength={7} />
                  <button onClick={() => setChart(chart.filter((_, j) => j !== i))} aria-label="Remove colour" className="grid h-6 w-6 place-items-center rounded-full text-muted hover:bg-bg">×</button>
                </span>
              ))}
              {chart.length < 6 && (
                <button onClick={() => setChart([...chart, shown.accent])} className="h-9 rounded-full border border-dashed border-line px-3 text-[12px] font-semibold text-muted hover:text-ink">+ Add colour</button>
              )}
            </div>
          </div>

          {error && <p role="alert" className="rounded-2xl bg-neg-soft px-4 py-2.5 text-sm font-medium text-neg">{error}</p>}
        </div>
      </Sheet>
      <Confirm open={confirmDelete} title={`Delete ${initial?.name}?`} body="Kenledger switches back to its default colours if this palette is in use."
        confirmLabel="Delete" onCancel={() => setConfirmDelete(false)} onConfirm={() => initial && onDelete(initial.id)} />
    </>
  )
}

function ColorRow({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  const valid = normHex(value)
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <input type="color" aria-label={`${label} picker`} value={valid ?? '#000000'} onChange={(e) => onChange(e.target.value.toUpperCase())}
        className="h-9 w-9 shrink-0 cursor-pointer rounded-full border border-line bg-transparent p-0" />
      <label htmlFor={id} className="min-w-0 flex-1 text-[14px] font-semibold">{label}</label>
      <input id={id} value={value} onChange={(e) => onChange(e.target.value)} spellCheck={false} maxLength={7}
        className={`w-[92px] rounded-xl bg-card-2 px-2.5 py-1.5 text-center font-mono text-[13px] uppercase outline-none focus:ring-2 focus:ring-primary ${valid ? '' : 'text-neg ring-1 ring-neg'}`} />
    </div>
  )
}
