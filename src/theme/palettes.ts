/**
 * Colour palettes. Every palette has a light and a dark version; the Theme setting
 * (System / Light / Dark) picks which one shows. Custom palettes are stored as a few
 * base colours per mode and the rest of the tokens are worked out from those.
 */

export type Mode = 'light' | 'dark'

/** Everything the UI reads (as CSS variables). */
export interface Tokens {
  bg: string
  card: string
  card2: string
  ink: string
  muted: string
  faint: string
  line: string
  primary: string
  primaryInk: string
  /** Accent when used as text on cards (deeper in light mode so it stays readable). */
  primaryText: string
  deep: string
  navInk: string
  pos: string
  neg: string
  negSoft: string
  posSoft: string
}

/** The colours you type in for a custom palette (per mode). */
export interface BaseColors {
  bg: string
  card: string
  accent: string
  text: string
  muted: string
  income: string
  expense: string
}

export interface CustomPalette {
  id: string
  name: string
  light: BaseColors
  dark: BaseColors
  chart?: string[]
}

export interface Palette {
  id: string
  name: string
  light: Tokens
  dark: Tokens
  /** Colours for chart categories. Empty = use each category's own colour. */
  chart: string[]
  custom?: boolean
}

export const BASE_FIELDS: { key: keyof BaseColors; label: string }[] = [
  { key: 'bg', label: 'Background' },
  { key: 'card', label: 'Cards' },
  { key: 'accent', label: 'Buttons / accent' },
  { key: 'text', label: 'Main text' },
  { key: 'muted', label: 'Secondary text' },
  { key: 'income', label: 'Income' },
  { key: 'expense', label: 'Expenses' },
]

/* ------------------------------------------------------------------ */
/* Colour maths                                                         */
/* ------------------------------------------------------------------ */

export function normHex(input: string): string | null {
  let s = input.trim().replace(/^#/, '')
  if (/^[0-9a-f]{3}$/i.test(s)) s = s.split('').map((c) => c + c).join('')
  return /^[0-9a-f]{6}$/i.test(s) ? `#${s.toUpperCase()}` : null
}

function rgb(hex: string): [number, number, number] {
  const h = (normHex(hex) ?? '#000000').slice(1)
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}
function toHex([r, g, b]: number[]) {
  return '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('').toUpperCase()
}
/** a mixed toward b by t (0..1) */
export function mix(a: string, b: string, t: number) {
  const x = rgb(a), y = rgb(b)
  return toHex(x.map((v, i) => v + (y[i] - v) * t))
}
export function luminance(hex: string) {
  const [r, g, b] = rgb(hex).map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
export function contrast(a: string, b: string) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (l1 + 0.05) / (l2 + 0.05)
}
export const isDarkColor = (hex: string) => luminance(hex) < 0.2

/** Move `c` toward `toward` until it reaches `min` contrast against `against`. */
function ensureContrast(c: string, against: string, toward: string, min: number) {
  let out = c
  for (let t = 0.08; contrast(out, against) < min && t <= 1; t += 0.08) out = mix(c, toward, t)
  return out
}

/* ------------------------------------------------------------------ */
/* Custom palettes → tokens                                            */
/* ------------------------------------------------------------------ */

export function tokensFromBase(b: BaseColors, mode: Mode): Tokens {
  const dark = mode === 'dark'
  const ink = ensureContrast(b.text, b.card, dark ? '#FFFFFF' : '#000000', 7)
  const muted = ensureContrast(b.muted, b.card, dark ? '#FFFFFF' : '#000000', 3.6)
  const onAccent = contrast('#FFFFFF', b.accent) >= contrast('#111111', b.accent) ? '#FFFFFF' : mix(b.bg, '#000000', dark ? 0.3 : 0.85)
  const pos = ensureContrast(b.income, b.card, dark ? '#FFFFFF' : '#000000', 3.4)
  const neg = ensureContrast(b.expense, b.card, dark ? '#FFFFFF' : '#000000', 3.4)
  const deep = dark ? mix(b.bg, '#000000', 0.35) : (isDarkColor(b.text) ? b.text : '#1A1D24')
  return {
    bg: b.bg,
    card: b.card,
    card2: mix(b.card, ink, dark ? 0.07 : 0.06),
    ink,
    muted,
    faint: mix(muted, b.card, 0.4),
    line: mix(b.card, ink, dark ? 0.12 : 0.1),
    primary: b.accent,
    primaryInk: onAccent,
    primaryText: ensureContrast(b.accent, b.card, dark ? '#FFFFFF' : '#000000', 3.6),
    deep,
    navInk: dark ? ink : mix(b.bg, '#FFFFFF', 0.5),
    pos,
    neg,
    negSoft: mix(b.card, b.expense, dark ? 0.16 : 0.14),
    posSoft: mix(b.card, b.income, dark ? 0.16 : 0.14),
  }
}

/** Make the other mode from one set of colours, keeping the same accent and character. */
export function deriveOther(b: BaseColors, to: Mode): BaseColors {
  if (to === 'light') {
    // A pale wash of the dark background and accent, so light mode keeps the palette's warmth.
    const bg = mix('#FFFFFF', mix(b.bg, b.accent, 0.35), 0.09)
    const card = mix('#FFFFFF', bg, 0.25)
    const text = isDarkColor(b.card) ? mix(b.card, '#000000', 0.25) : '#1A1D24'
    return {
      bg, card, accent: b.accent,
      text,
      muted: mix(text, bg, 0.42),
      income: mix(b.income, '#000000', 0.38),
      expense: mix(b.expense, '#000000', 0.32),
    }
  }
  const bg = isDarkColor(b.text) ? mix(b.text, '#000000', 0.35) : '#14171E'
  const card = mix(bg, '#FFFFFF', 0.07)
  const text = mix(b.bg, '#FFFFFF', 0.4)
  return {
    bg, card,
    accent: contrast(b.accent, card) < 3 ? mix(b.accent, '#FFFFFF', 0.3) : b.accent,
    text,
    muted: mix(text, bg, 0.38),
    income: mix(b.income, '#FFFFFF', 0.35),
    expense: mix(b.expense, '#FFFFFF', 0.3),
  }
}

export function customToPalette(c: CustomPalette): Palette {
  return {
    id: c.id, name: c.name, custom: true,
    light: tokensFromBase(c.light, 'light'),
    dark: tokensFromBase(c.dark, 'dark'),
    chart: (c.chart ?? []).map((x) => normHex(x)).filter((x): x is string => !!x),
  }
}

/* ------------------------------------------------------------------ */
/* Built-in palettes                                                    */
/* ------------------------------------------------------------------ */

export const DEFAULT_PALETTE = 'kenledger'

export const BUILT_IN: Palette[] = [
  {
    id: 'kenledger', name: 'Kenledger', chart: [],
    light: { bg: '#F5F2E9', card: '#FCFBF6', card2: '#EFEBDF', ink: '#17211D', muted: '#666C66', faint: '#A6AAA3', line: '#E7E4DA', primary: '#174C3B', primaryInk: '#F5F2E9', primaryText: '#174C3B', deep: '#102F27', navInk: '#F5F2E9', pos: '#2F6B55', neg: '#A65A40', negSoft: '#F3E3DA', posSoft: '#DDE8E0' },
    dark: { bg: '#0E1A16', card: '#15241F', card2: '#1C2E28', ink: '#EDEAE0', muted: '#93A097', faint: '#66736B', line: '#243832', primary: '#7FBF9E', primaryInk: '#0E1A16', primaryText: '#7FBF9E', deep: '#0A1411', navInk: '#EDEAE0', pos: '#86C4A2', neg: '#E0977C', negSoft: '#3A2620', posSoft: '#1E3A2F' },
  },
  {
    id: 'midnight-peach', name: 'Midnight Peach', chart: ['#F2A07B', '#79D6AE', '#8C9FE8', '#D7B56D', '#E58FB0', '#6FC3D9'],
    light: { bg: '#F6F1EC', card: '#FFFDFB', card2: '#EFE6DE', ink: '#1B2540', muted: '#5F6984', faint: '#9AA2B5', line: '#E8DFD6', primary: '#B5582F', primaryInk: '#FFFDFB', primaryText: '#A9502A', deep: '#23395B', navInk: '#F7D9C4', pos: '#1F7F5B', neg: '#C2513F', negSoft: '#F7E1DA', posSoft: '#DDF0E7' },
    dark: { bg: '#121A2F', card: '#1C2940', card2: '#23395B', ink: '#F7E6DA', muted: '#A7B2C5', faint: '#6E7C95', line: '#2A3A57', primary: '#F2A07B', primaryInk: '#121A2F', primaryText: '#F2A07B', deep: '#0B1122', navInk: '#F7D9C4', pos: '#79D6AE', neg: '#F08A80', negSoft: '#3A2632', posSoft: '#1B3A3A' },
  },
  {
    id: 'clay-sky', name: 'Clay & Sky', chart: ['#D77A61', '#8ED5B5', '#E9D8A6', '#A6A8E8', '#7FB4D9', '#D9A0C4'],
    light: { bg: '#EEF2F5', card: '#FFFFFF', card2: '#E3EAF0', ink: '#1C3140', muted: '#4F6C86', faint: '#93A9BA', line: '#D9E2E9', primary: '#B35A43', primaryInk: '#FFFFFF', primaryText: '#A9503A', deep: '#203746', navInk: '#E9D8A6', pos: '#2A7D5D', neg: '#B4533B', negSoft: '#F6E2DB', posSoft: '#DCEFE6' },
    dark: { bg: '#16262F', card: '#203746', card2: '#2A4556', ink: '#F0E3BC', muted: '#B7C9D4', faint: '#7590A0', line: '#2F4A5B', primary: '#D77A61', primaryInk: '#16262F', primaryText: '#E38F78', deep: '#0F1C23', navInk: '#E9D8A6', pos: '#8ED5B5', neg: '#E9A08A', negSoft: '#3E2A28', posSoft: '#1E3D3A' },
  },
  {
    id: 'moss-marigold', name: 'Moss & Marigold', chart: ['#EFBF3A', '#83D0A4', '#91B9D8', '#D18A6C', '#B9A7E0', '#9FB86A'],
    light: { bg: '#F3F2E8', card: '#FFFEF8', card2: '#E9EBDC', ink: '#1E3328', muted: '#55664D', faint: '#9AA690', line: '#DFE2D0', primary: '#E5AE22', primaryInk: '#1E3328', primaryText: '#7A5A06', deep: '#243D32', navInk: '#F5F1E6', pos: '#2C7A52', neg: '#B0533A', negSoft: '#F5E3D8', posSoft: '#DCEEDF' },
    dark: { bg: '#18291F', card: '#243D32', card2: '#2E4B3E', ink: '#F5F1E6', muted: '#C2CCB8', faint: '#82937C', line: '#34513F', primary: '#EFBF3A', primaryInk: '#18291F', primaryText: '#EFBF3A', deep: '#101D16', navInk: '#F5F1E6', pos: '#83D0A4', neg: '#E5A08A', negSoft: '#41302A', posSoft: '#1F4231' },
  },
  {
    id: 'monochrome-lime', name: 'Monochrome Lime', chart: ['#C7E85A', '#83D6B0', '#82B8F0', '#BD9BFA', '#F2B880', '#F08C91'],
    light: { bg: '#F3F4F1', card: '#FFFFFF', card2: '#EAECE6', ink: '#1A1E26', muted: '#575F6C', faint: '#9AA1AC', line: '#E1E4DD', primary: '#C7E85A', primaryInk: '#1A1E26', primaryText: '#4A6600', deep: '#252A34', navInk: '#F3F5F7', pos: '#21754F', neg: '#C2414A', negSoft: '#F8DFE1', posSoft: '#DCF0E6' },
    dark: { bg: '#14171E', card: '#1F242D', card2: '#29303B', ink: '#F3F5F7', muted: '#A5ADB9', faint: '#6B7380', line: '#2D333E', primary: '#C7E85A', primaryInk: '#14171E', primaryText: '#C7E85A', deep: '#0D0F14', navInk: '#F3F5F7', pos: '#83D6B0', neg: '#F08C91', negSoft: '#3A2328', posSoft: '#1D3A31' },
  },
]

export function allPalettes(custom: CustomPalette[] = []): Palette[] {
  return [...BUILT_IN, ...custom.map(customToPalette)]
}

export function findPalette(id: string | undefined, custom: CustomPalette[] = []): Palette {
  return allPalettes(custom).find((p) => p.id === id) ?? BUILT_IN[0]
}

/** Starting point for "New palette": Midnight Peach's base colours. */
export function starterBase(mode: Mode): BaseColors {
  return mode === 'dark'
    ? { bg: '#121A2F', card: '#1C2940', accent: '#F2A07B', text: '#F7D9C4', muted: '#A7B2C5', income: '#79D6AE', expense: '#F08A80' }
    : { bg: '#F6F1EC', card: '#FFFDFB', accent: '#D9774C', text: '#1B2540', muted: '#5F6984', income: '#1F7F5B', expense: '#C2513F' }
}

/** Base colours that reproduce a palette (for "Duplicate & edit"). */
export function baseFromTokens(t: Tokens): BaseColors {
  return { bg: t.bg, card: t.card, accent: t.primary, text: t.ink, muted: t.muted, income: t.pos, expense: t.neg }
}

/* ------------------------------------------------------------------ */
/* Applying                                                             */
/* ------------------------------------------------------------------ */

const VARS: [keyof Tokens, string][] = [
  ['bg', '--bg'], ['card', '--card'], ['card2', '--card-2'], ['ink', '--ink'], ['muted', '--muted'], ['faint', '--faint'],
  ['line', '--line'], ['primary', '--primary'], ['primaryInk', '--primary-ink'], ['primaryText', '--primary-text'],
  ['deep', '--deep'], ['navInk', '--nav-ink'], ['pos', '--pos'], ['neg', '--neg'], ['negSoft', '--neg-soft'], ['posSoft', '--pos-soft'],
]
const LOOK_KEY = 'kenledger:look'

export function applyTokens(t: Tokens, mode: Mode) {
  const root = document.documentElement
  for (const [k, v] of VARS) root.style.setProperty(v, t[k])
  root.dataset.theme = mode
  root.style.colorScheme = mode
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t.bg)
  // Remember the look so the next launch paints in the right colours straight away.
  try { localStorage.setItem(LOOK_KEY, JSON.stringify({ mode, vars: VARS.map(([k, v]) => [v, t[k]]) })) } catch { /* noop */ }
}
