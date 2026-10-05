import { useEffect } from 'react'
import { LedgerProvider, UiProvider, useLedger, useUi } from './store/ledgerStore'
import { useRoute } from './router'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { Accounts } from './pages/Accounts'
import { AccountDetails } from './pages/AccountDetails'
import { Transactions } from './pages/Transactions'
import { Analytics } from './pages/Analytics'
import { Calendar } from './pages/Calendar'
import { Settings } from './pages/Settings'
import { Onboarding } from './pages/Onboarding'
import { Converter } from './pages/Converter'
import { FxProvider } from './store/fxStore'
import { Connect, Loading, LoadError } from './pages/Connect'
import { TransactionForm } from './components/TransactionForm'
import { TransactionDetail } from './components/TransactionDetail'
import { AccountForm } from './components/AccountForm'
import { PrintDialog } from './components/PrintReport'
import { Toaster } from './components/Toaster'

function useTheme() {
  const { data } = useLedger()
  const theme = data.settings.theme
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && mq.matches)
      document.documentElement.dataset.theme = dark ? 'dark' : 'light'
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0E1A16' : '#F5F2E9')
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [theme])
}

/** Keyboard shortcut: "n" (or "+") opens a new expense from anywhere. */
function useShortcuts() {
  const { openTx, txSheet, accountSheet, print, viewTx } = useUi()
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t.closest('input,textarea,select,[contenteditable]') || e.metaKey || e.ctrlKey || e.altKey) return
      if (txSheet || accountSheet || print || viewTx) return
      if (e.key === 'n' || e.key === '+') { e.preventDefault(); openTx({ type: 'expense' }) }
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [openTx, txSheet, accountSheet, print, viewTx])
}

function Shell() {
  const { data, account, sync } = useLedger()
  const { scope, setScope } = useUi()
  const route = useRoute()
  useTheme()
  useShortcuts()

  // Drop a stale account filter (e.g. after deleting the account).
  useEffect(() => { if (scope && !account(scope)) setScope('') }, [scope, account, setScope])

  if (sync.status === 'none') return <Connect />
  if (sync.status === 'loading') return <Loading />
  if (sync.status === 'error') return <LoadError />
  if (!data.settings.onboarded) return <><Onboarding /><Toaster /></>

  let page
  switch (route.name) {
    case 'accounts': page = <Accounts />; break
    case 'account': page = <AccountDetails id={route.id} />; break
    case 'activity': page = <Transactions />; break
    case 'analytics': page = <Analytics />; break
    case 'calendar': page = <Calendar />; break
    case 'settings': page = <Settings />; break
    case 'convert': page = <Converter />; break
    default: page = <Dashboard />
  }

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-ink">Skip to content</a>
      <Layout route={route}>
        <div key={route.name + ('id' in route ? route.id : '')} className="anim-rise">{page}</div>
      </Layout>
      <TransactionForm />
      <TransactionDetail />
      <AccountForm />
      <PrintDialog />
      <Toaster />
    </>
  )
}

export default function App() {
  return (
    <LedgerProvider>
      <FxProvider>
      <UiProvider>
        <Shell />
      </UiProvider>
      </FxProvider>
    </LedgerProvider>
  )
}
