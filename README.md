# Kenledger

A calm, private notebook for your money. Record expenses across multiple accounts, watch balances update, see where your money went, and print clean reports — all in the browser, no server or database.

## Features (MVP)

- Onboarding (name → starting balance → first account) or one-tap demo data
- Unlimited accounts (Cash, Bank, Savings, Credit Card, Wallet, Other) with icon + colour
- Expense / Income / Transfer — transfers never count as spending or income
- Date defaults to the device's *today*; Today / Yesterday / any past date
- 7 default categories with sub-categories; add your own
- Activity: search, filters (account, type, category, date, amount), 4 sort orders
- Edit / delete with confirmation and **Undo**
- Analytics: Week / Month / Year, previous/next period, donut, category breakdown, trend chart, metrics, factual insights, % change vs previous period
- Calendar heat-map with per-day totals and entries
- Print report dialog (range, account, category, sections) → browser print / Save as PDF
- CSV export (Google Sheets-ready), JSON backup + restore, clear all
- Light / Dark / System theme (dark is designed, not inverted)
- PWA: installable, works offline
- Keyboard: press `n` anywhere to add an expense; accessible dialogs with focus trap

## Architecture

**Every transaction is the source of truth.** Balances are never stored:

```
balance = startingBalance + income − expenses + transfersIn − transfersOut
```

Transfers are stored as a single transaction (`accountId` = from, `toAccountId` = to), so editing or deleting one keeps both accounts consistent.

```
src/
  types/ledger.ts          data model
  store/ledgerStore.tsx    React context: data + UI state, persisted to localStorage
  services/                calculations, storage, export, import, demo
  utils/                   currency, dates, constants
  components/              UI primitives, forms, charts, print report, layout
  pages/                   Dashboard, Accounts, AccountDetails, Transactions, Analytics, Calendar, Settings, Onboarding
```

Stack: React 19, TypeScript, Vite, Tailwind CSS v4, Recharts, Lucide, vite-plugin-pwa.

## Develop

```bash
npm install
npm run dev
npm run build     # outputs dist/ with service worker
```

## Deploy (GitHub → Netlify)

1. `git init && git add . && git commit -m "Kenledger v1" && git remote add origin git@github.com:<you>/kenledger.git && git push -u origin main`
2. Netlify → **Add new site → Import from Git** → pick the repo. `netlify.toml` already sets build `npm run build`, publish `dist`, Node 22.
3. Every push to `main` redeploys automatically.

## Data & privacy

Data lives in this browser's `localStorage` (key `kenledger:v1`) and never leaves the device. Each browser/device has its own ledger — use **Settings → Export Backup** regularly, and **Import Backup** to move to another device.
