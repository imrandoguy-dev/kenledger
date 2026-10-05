import type { AccountType, Category } from '../types/ledger'

export const ACCOUNT_TYPES: { value: AccountType; label: string; icon: string }[] = [
  { value: 'savings', label: 'Savings', icon: '🏦' },
  { value: 'bank', label: 'Bank', icon: '🏛️' },
  { value: 'cash', label: 'Cash', icon: '💵' },
  { value: 'credit', label: 'Credit Card', icon: '💳' },
  { value: 'wallet', label: 'Wallet', icon: '👛' },
  { value: 'other', label: 'Other', icon: '📒' },
]

export const ACCOUNT_ICONS = ['🏦', '🏛️', '💵', '💳', '👛', '📱', '💰', '🪙', '📒', '🏠', '✈️', '🎯']
export const ACCOUNT_COLORS = ['#174C3B', '#2F6B55', '#4C7A8C', '#8A6A3F', '#B4654A', '#6B5B8A', '#3F5A3A', '#7B817B']

export interface CurrencyMeta { code: string; symbol: string; locale: string; label: string; flag: string }

/** Currencies you can give an account or convert between. Order = how they appear in pickers. */
export const CURRENCIES: CurrencyMeta[] = [
  { code: 'INR', symbol: '₹', locale: 'en-IN', label: 'Indian Rupee', flag: '🇮🇳' },
  { code: 'AED', symbol: 'AED ', locale: 'en-US', label: 'UAE Dirham', flag: '🇦🇪' },
  { code: 'USD', symbol: '$', locale: 'en-US', label: 'US Dollar', flag: '🇺🇸' },
  { code: 'EUR', symbol: '€', locale: 'en-US', label: 'Euro', flag: '🇪🇺' },
  { code: 'GBP', symbol: '£', locale: 'en-GB', label: 'British Pound', flag: '🇬🇧' },
  { code: 'SAR', symbol: 'SAR ', locale: 'en-US', label: 'Saudi Riyal', flag: '🇸🇦' },
  { code: 'QAR', symbol: 'QAR ', locale: 'en-US', label: 'Qatari Riyal', flag: '🇶🇦' },
  { code: 'OMR', symbol: 'OMR ', locale: 'en-US', label: 'Omani Rial', flag: '🇴🇲' },
  { code: 'KWD', symbol: 'KWD ', locale: 'en-US', label: 'Kuwaiti Dinar', flag: '🇰🇼' },
  { code: 'BHD', symbol: 'BHD ', locale: 'en-US', label: 'Bahraini Dinar', flag: '🇧🇭' },
  { code: 'SGD', symbol: 'S$', locale: 'en-US', label: 'Singapore Dollar', flag: '🇸🇬' },
  { code: 'MYR', symbol: 'RM ', locale: 'en-US', label: 'Malaysian Ringgit', flag: '🇲🇾' },
  { code: 'CAD', symbol: 'C$', locale: 'en-US', label: 'Canadian Dollar', flag: '🇨🇦' },
  { code: 'AUD', symbol: 'A$', locale: 'en-US', label: 'Australian Dollar', flag: '🇦🇺' },
  { code: 'NZD', symbol: 'NZ$', locale: 'en-US', label: 'New Zealand Dollar', flag: '🇳🇿' },
  { code: 'CHF', symbol: 'CHF ', locale: 'en-US', label: 'Swiss Franc', flag: '🇨🇭' },
  { code: 'JPY', symbol: '¥', locale: 'en-US', label: 'Japanese Yen', flag: '🇯🇵' },
  { code: 'CNY', symbol: 'CN¥', locale: 'en-US', label: 'Chinese Yuan', flag: '🇨🇳' },
  { code: 'PKR', symbol: 'Rs ', locale: 'en-US', label: 'Pakistani Rupee', flag: '🇵🇰' },
  { code: 'LKR', symbol: 'Rs ', locale: 'en-US', label: 'Sri Lankan Rupee', flag: '🇱🇰' },
  { code: 'BDT', symbol: '৳', locale: 'en-US', label: 'Bangladeshi Taka', flag: '🇧🇩' },
  { code: 'NPR', symbol: 'Rs ', locale: 'en-US', label: 'Nepalese Rupee', flag: '🇳🇵' },
  { code: 'PHP', symbol: '₱', locale: 'en-US', label: 'Philippine Peso', flag: '🇵🇭' },
  { code: 'THB', symbol: '฿', locale: 'en-US', label: 'Thai Baht', flag: '🇹🇭' },
  { code: 'TRY', symbol: '₺', locale: 'en-US', label: 'Turkish Lira', flag: '🇹🇷' },
  { code: 'ZAR', symbol: 'R ', locale: 'en-US', label: 'South African Rand', flag: '🇿🇦' },
]


// Muted, desaturated palette that sits well on ivory.
const C = {
  food: '#C47A4F',
  shop: '#174C3B',
  transport: '#4C7A8C',
  bills: '#8A6A3F',
  fun: '#6B5B8A',
  health: '#5E8B6E',
  other: '#9A9A8E',
  income: '#2F6B55',
}

type Seed = [id: string, name: string, icon: string, children: [string, string][]]
const expenseSeed: [Seed, string][] = [
  [['food', 'Food & Dining', '🍽️', [['Groceries', '🛒'], ['Restaurant', '🍜'], ['Coffee', '☕'], ['Takeaway', '🥡'], ['Delivery', '🛵']]], C.food],
  [['shopping', 'Shopping', '🛍️', [['Clothing', '👕'], ['Electronics', '🎧'], ['Household', '🧺'], ['Online Shopping', '📦']]], C.shop],
  [['transport', 'Transport', '🚕', [['Fuel', '⛽'], ['Taxi', '🚕'], ['Bus', '🚌'], ['Train', '🚆'], ['Parking', '🅿️']]], C.transport],
  [['bills', 'Bills', '🧾', [['Electricity', '💡'], ['Internet', '🌐'], ['Phone', '📱'], ['Rent', '🏠'], ['Insurance', '🛡️']]], C.bills],
  [['entertainment', 'Entertainment', '🎬', [['Movies', '🎬'], ['Games', '🎮'], ['Subscriptions', '🔁'], ['Events', '🎟️']]], C.fun],
  [['health', 'Health', '🩺', [['Medicine', '💊'], ['Doctor', '🩺'], ['Fitness', '🏋️']]], C.health],
  [['other', 'Other', '📌', [['Education', '🎓'], ['Travel', '✈️'], ['Gifts', '🎁'], ['Miscellaneous', '📌']]], C.other],
]

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

export function defaultCategories(): Category[] {
  const out: Category[] = []
  for (const [[id, name, icon, children], color] of expenseSeed) {
    out.push({ id, name, icon, color, type: 'expense' })
    for (const [cn, ci] of children) {
      out.push({ id: `${id}.${slug(cn)}`, name: cn, icon: ci, color, type: 'expense', parentId: id })
    }
  }
  const income: [string, string][] = [['Salary', '💼'], ['Freelance', '🧑‍💻'], ['Business', '🏪'], ['Interest', '📈'], ['Refund', '↩️'], ['Gift', '🎁'], ['Other Income', '➕']]
  for (const [n, i] of income) out.push({ id: `income.${slug(n)}`, name: n, icon: i, color: C.income, type: 'income' })
  return out
}
