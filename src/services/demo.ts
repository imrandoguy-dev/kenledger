import type { LedgerData, Transaction } from '../types/ledger'
import { addDays, today } from '../utils/dates'
import { emptyLedger } from './storage'
import { uid } from '../utils/id'

/** Sample ledger for exploring the UI. Only loaded when the user asks. */
export function demoLedger(name = 'Julian'): LedgerData {
  const base = emptyLedger()
  const t0 = today()
  const now = new Date().toISOString()
  const hdfc = { id: uid(), name: 'HDFC Savings', type: 'savings' as const, startingBalance: 50000, currency: 'INR', icon: '🏦', color: '#174C3B', createdAt: now }
  const cash = { id: uid(), name: 'Cash', type: 'cash' as const, startingBalance: 2000, currency: 'INR', icon: '💵', color: '#8A6A3F', createdAt: now }
  const icici = { id: uid(), name: 'ICICI Credit', type: 'credit' as const, startingBalance: 0, currency: 'INR', icon: '💳', color: '#4C7A8C', createdAt: now }
  const tx: Transaction[] = []
  const add = (daysAgo: number, type: Transaction['type'], accountId: string, amount: number, description: string, categoryId?: string, toAccountId?: string) =>
    tx.push({ id: uid(), type, accountId, amount, description, categoryId, toAccountId, date: addDays(t0, -daysAgo), createdAt: new Date(Date.now() - daysAgo * 864e5).toISOString() })

  // ~60 days of plausible activity
  add(0, 'expense', hdfc.id, 850, 'Groceries', 'food.groceries')
  add(0, 'expense', hdfc.id, 180, 'Coffee', 'food.coffee')
  add(1, 'expense', cash.id, 240, 'Uber', 'transport.taxi')
  add(2, 'expense', hdfc.id, 1200, 'Electricity bill', 'bills.electricity')
  add(3, 'expense', icici.id, 1500, 'Running shoes', 'shopping.clothing')
  add(3, 'expense', hdfc.id, 620, 'Dinner at Toit', 'food.restaurant')
  add(4, 'transfer', hdfc.id, 3000, 'ATM withdrawal', undefined, cash.id)
  add(5, 'expense', cash.id, 90, 'Parking', 'transport.parking')
  add(6, 'expense', hdfc.id, 499, 'Netflix', 'entertainment.subscriptions')
  add(7, 'expense', hdfc.id, 2100, 'Weekly groceries', 'food.groceries')
  add(8, 'expense', cash.id, 350, 'Pharmacy', 'health.medicine')
  add(9, 'expense', icici.id, 3499, 'Headphones', 'shopping.electronics')
  add(10, 'expense', hdfc.id, 1800, 'Fuel', 'transport.fuel')
  add(12, 'expense', hdfc.id, 12000, 'Rent', 'bills.rent')
  add(12, 'income', hdfc.id, 45000, 'Salary', 'income.salary')
  add(14, 'expense', hdfc.id, 430, 'Groceries', 'food.groceries')
  add(15, 'expense', hdfc.id, 799, 'Internet', 'bills.internet')
  add(17, 'expense', cash.id, 260, 'Takeaway', 'food.takeaway')
  add(19, 'expense', hdfc.id, 1100, 'Movie night', 'entertainment.movies')
  add(21, 'income', hdfc.id, 8500, 'Freelance design', 'income.freelance')
  add(23, 'expense', hdfc.id, 1650, 'Household supplies', 'shopping.household')
  add(26, 'expense', hdfc.id, 920, 'Groceries', 'food.groceries')
  add(28, 'expense', icici.id, 2200, 'Gift for Priya', 'other.gifts')
  add(31, 'expense', hdfc.id, 12000, 'Rent', 'bills.rent')
  add(33, 'income', hdfc.id, 45000, 'Salary', 'income.salary')
  add(35, 'expense', hdfc.id, 2400, 'Groceries', 'food.groceries')
  add(38, 'expense', hdfc.id, 1750, 'Fuel', 'transport.fuel')
  add(41, 'expense', hdfc.id, 799, 'Internet', 'bills.internet')
  add(44, 'expense', hdfc.id, 900, 'Restaurant', 'food.restaurant')
  add(47, 'expense', icici.id, 5600, 'Train tickets', 'transport.train')
  add(52, 'expense', hdfc.id, 1300, 'Doctor visit', 'health.doctor')
  add(58, 'expense', hdfc.id, 2600, 'Groceries', 'food.groceries')

  return {
    ...base,
    accounts: [hdfc, cash, icici],
    transactions: tx,
    settings: { ...base.settings, name, onboarded: true, defaultAccountId: hdfc.id },
  }
}
