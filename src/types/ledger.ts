export type AccountType = 'cash' | 'bank' | 'savings' | 'credit' | 'wallet' | 'other'
export type TxType = 'expense' | 'income' | 'transfer'
export type Theme = 'system' | 'light' | 'dark'

export interface Account {
  id: string
  name: string
  type: AccountType
  startingBalance: number
  currency: string
  icon: string // emoji
  color: string
  createdAt: string
  archived?: boolean
}

/**
 * Single source of truth. Balances and analytics are always derived from these.
 * Transfers are stored as one record: accountId = from, toAccountId = to.
 */
export interface Transaction {
  id: string
  accountId: string
  toAccountId?: string
  type: TxType
  amount: number // always positive
  categoryId?: string
  description: string
  date: string // YYYY-MM-DD in local time
  notes?: string
  createdAt: string
}

export interface Category {
  id: string
  name: string
  icon: string // emoji
  color: string
  type: 'expense' | 'income'
  parentId?: string
  custom?: boolean
}

export interface Settings {
  name: string
  currency: string
  theme: Theme
  weekStart: 0 | 1 // 0 = Sunday, 1 = Monday
  dateFormat: 'short' | 'iso' | 'dmy'
  defaultAccountId?: string
  onboarded: boolean
}

export interface LedgerData {
  version: 1
  accounts: Account[]
  transactions: Transaction[]
  categories: Category[]
  settings: Settings
}
