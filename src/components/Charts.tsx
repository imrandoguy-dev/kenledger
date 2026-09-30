import { Cell, Pie, PieChart, ResponsiveContainer, Bar, BarChart, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import type { CategorySlice, TrendPoint } from '../services/calculations'
import { compact, money } from '../utils/currency'
import { Bubble } from './ui'

export function SpendingDonut({ slices, total, currency, size = 220 }: { slices: CategorySlice[]; total: number; currency: string; size?: number }) {
  const data = slices.length ? slices : [{ id: 'none', name: 'None', amount: 1, color: 'var(--card-2)' } as CategorySlice]
  return (
    <div className="relative mx-auto" style={{ width: size, height: size }} role="img"
      aria-label={`Spending donut: ${slices.map((s) => `${s.name} ${Math.round(s.pct)}%`).join(', ') || 'no spending'}`}>
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey="amount" innerRadius="72%" outerRadius="100%" paddingAngle={slices.length > 1 ? 2.5 : 0} cornerRadius={6} stroke="none" startAngle={90} endAngle={-270} isAnimationActive>
            {data.map((s) => <Cell key={s.id} fill={s.color} />)}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="eyebrow">Total</p>
          <p className="tnum mt-0.5 text-[28px] font-semibold tracking-tight">{compact(total, currency)}</p>
        </div>
      </div>
    </div>
  )
}

export function CategoryBreakdown({ slices, currency, onPick }: { slices: CategorySlice[]; currency: string; onPick?: (id: string) => void }) {
  const max = Math.max(1, ...slices.map((s) => s.amount))
  return (
    <ul className="space-y-1">
      {slices.map((s) => (
        <li key={s.id}>
          <button onClick={() => onPick?.(s.id)} disabled={!onPick} className="w-full rounded-2xl px-2 py-2.5 text-left transition-colors enabled:hover:bg-card-2/60">
            <div className="flex items-center gap-3">
              <Bubble size={38} color={s.color}>{s.icon}</Bubble>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-[15px] font-semibold">{s.name}</span>
                  <span className="tnum text-[15px] font-semibold">{money(s.amount, currency)}</span>
                </div>
                <div className="mt-1.5 flex items-center gap-3">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-card-2">
                    <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${(s.amount / max) * 100}%`, background: s.color }} />
                  </div>
                  <span className="tnum w-10 text-right text-[11px] font-semibold text-muted">{s.pct < 1 && s.pct > 0 ? '<1' : Math.round(s.pct)}%</span>
                </div>
              </div>
            </div>
          </button>
        </li>
      ))}
    </ul>
  )
}

export function TrendChart({ points, currency, showIncome }: { points: TrendPoint[]; currency: string; showIncome?: boolean }) {
  const dense = points.length > 16
  return (
    <div className="h-52 w-full" role="img" aria-label="Spending trend bar chart">
      <ResponsiveContainer>
        <BarChart data={points} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barGap={3}>
          <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="3 4" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} interval={dense ? 'preserveStartEnd' : 0} minTickGap={4} />
          <YAxis tickLine={false} axisLine={false} width={48} tick={{ fill: 'var(--faint)', fontSize: 11 }} tickFormatter={(v: number) => compact(v, currency)} />
          <Tooltip
            cursor={{ fill: 'var(--card-2)', radius: 8 }}
            contentStyle={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, boxShadow: 'var(--shadow)', fontSize: 13 }}
            labelStyle={{ color: 'var(--muted)', fontWeight: 600 }}
            formatter={(v, n) => [money(Number(v), currency), n === 'spent' ? 'Spent' : 'Income']}
          />
          <Bar dataKey="spent" fill="var(--primary)" radius={[6, 6, 2, 2]} maxBarSize={28} />
          {showIncome && <Bar dataKey="income" fill="var(--pos)" fillOpacity={0.35} radius={[6, 6, 2, 2]} maxBarSize={28} />}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
