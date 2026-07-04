import {
  Bar,
  BarChart,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { pct } from '../lib/format.js'
import { useTheme } from '../theme.jsx'

// Horizontal bars of archetype share within one tournament. One measure
// across categories, so one hue (categorical slot 1) — identity comes from
// the row labels, not color.
const BAR_LIGHT = '#2a78d6'
const BAR_DARK = '#3987e5'
const ROW_HEIGHT = 34

function BarTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  return (
    <div className="rounded-xl border border-slate-300/60 bg-[#f1f3f8] px-3 py-2 text-xs shadow-lg dark:border-slate-600/60 dark:bg-[#262b34]">
      <div className="font-semibold text-slate-700 dark:text-slate-200">{row.name}</div>
      <div className="mt-1 text-slate-600 dark:text-slate-300">
        {row.decks} decks · {pct(row.share)} of field · event WR {pct(row.win_rate)}
      </div>
    </div>
  )
}

export default function ShareBarChart({ rows }) {
  const { dark } = useTheme()
  const axisInk = dark ? '#9ca3af' : '#6b7280'

  return (
    <div style={{ height: rows.length * ROW_HEIGHT + 30 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={rows}
          layout="vertical"
          margin={{ top: 0, right: 44, bottom: 0, left: 8 }}
        >
          <XAxis type="number" hide domain={[0, 'dataMax']} />
          <YAxis
            type="category"
            dataKey="name"
            width={170}
            tick={{ fill: axisInk, fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(128,128,128,0.08)' }} />
          <Bar
            dataKey="share"
            fill={dark ? BAR_DARK : BAR_LIGHT}
            barSize={14}
            radius={[0, 4, 4, 0]}
            isAnimationActive={false}
          >
            <LabelList
              dataKey="share"
              position="right"
              formatter={(v) => pct(v, 0)}
              style={{ fill: axisInk, fontSize: 11, fontVariantNumeric: 'tabular-nums' }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
