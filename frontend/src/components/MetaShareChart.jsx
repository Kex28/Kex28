import { useMemo } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useTheme } from '../theme.jsx'

// Categorical slots 1-4 (validated against both app surfaces); assigned to
// archetypes in a fixed order and never re-cycled — color follows the
// entity, not its rank.
const SERIES_LIGHT = ['#2a78d6', '#1baf7a', '#eda100', '#008300']
const SERIES_DARK = ['#3987e5', '#199e70', '#c98500', '#008300']

const CHART_HEIGHT = 280
const MARGIN = { top: 10, right: 12, bottom: 0, left: 0 }
const X_AXIS_HEIGHT = 30
const PLOT_HEIGHT = CHART_HEIGHT - MARGIN.top - X_AXIS_HEIGHT

const pct = (v, digits = 1) => `${(v * 100).toFixed(digits)}%`
const weekLabel = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

function ChartTooltip({ active, payload, label, colors }) {
  if (!active || !payload?.length) return null
  const rows = [...payload].sort((a, b) => b.value - a.value)
  return (
    <div className="rounded-xl border border-slate-300/60 bg-[#f1f3f8] px-3 py-2 text-xs shadow-lg dark:border-slate-600/60 dark:bg-[#262b34]">
      <div className="mb-1 font-semibold text-slate-700 dark:text-slate-200">
        Week of {weekLabel(label)}
      </div>
      {rows.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2 py-0.5">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ background: colors[entry.dataKey] }}
          />
          <span className="text-slate-600 dark:text-slate-300">{entry.name}</span>
          <span className="ml-auto pl-3 tabular-nums font-medium text-slate-800 dark:text-slate-100">
            {pct(entry.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

// Weekly meta share for the top `maxSeries` archetypes (by latest-window
// share). Direct end labels live in an HTML gutter to the right of the plot
// so overlapping finishes can be nudged apart.
export default function MetaShareChart({ rows, maxSeries = 4 }) {
  const { dark } = useTheme()
  const palette = dark ? SERIES_DARK : SERIES_LIGHT

  const { data, series, domainMax } = useMemo(() => {
    const weeks = [...new Set(rows.map((r) => r.week))].sort()
    // Rank by deck volume over the trailing two weeks (the trend window),
    // not the final week alone — one small weekend shouldn't evict a top
    // archetype from the chart.
    const recentWeeks = new Set(weeks.slice(-2))
    const volume = new Map()
    for (const r of rows) {
      if (!recentWeeks.has(r.week)) continue
      const cur = volume.get(r.archetype_id) ?? { id: r.archetype_id, name: r.name, decks: 0 }
      cur.decks += r.deck_count ?? 0
      volume.set(r.archetype_id, cur)
    }
    const top = [...volume.values()]
      .sort((a, b) => b.decks - a.decks)
      .slice(0, maxSeries)
    const ids = new Set(top.map((s) => s.id))
    const byWeek = Object.fromEntries(weeks.map((w) => [w, { week: w }]))
    let max = 0
    for (const r of rows) {
      if (!ids.has(r.archetype_id)) continue
      byWeek[r.week][r.archetype_id] = r.meta_share
      max = Math.max(max, r.meta_share)
    }
    return {
      data: weeks.map((w) => byWeek[w]),
      series: top,
      domainMax: Math.ceil((max * 100) / 5) * 5 / 100,
    }
  }, [rows, maxSeries])

  const colors = Object.fromEntries(series.map((s, i) => [s.id, palette[i]]))
  const axisInk = dark ? '#9ca3af' : '#6b7280'
  const grid = dark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'

  // End labels: value-proportional y positions, nudged apart if closer
  // than one line-height.
  const endLabels = useMemo(() => {
    const last = data[data.length - 1] ?? {}
    const labels = series
      .filter((s) => last[s.id] != null)
      .map((s) => ({
        ...s,
        value: last[s.id],
        y: MARGIN.top + (1 - last[s.id] / domainMax) * PLOT_HEIGHT,
      }))
      .sort((a, b) => a.y - b.y)
    for (let i = 1; i < labels.length; i++) {
      labels[i].y = Math.max(labels[i].y, labels[i - 1].y + 16)
    }
    return labels
  }, [data, series, domainMax])

  if (!series.length) return null

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
        {series.map((s) => (
          <span key={s.id} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: colors[s.id] }} />
            {s.name}
          </span>
        ))}
      </div>
      <div className="flex">
        <div className="min-w-0 flex-1" style={{ height: CHART_HEIGHT }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={MARGIN}>
              <CartesianGrid stroke={grid} vertical={false} />
              <XAxis
                dataKey="week"
                tickFormatter={weekLabel}
                tick={{ fill: axisInk, fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: grid }}
                height={X_AXIS_HEIGHT}
              />
              <YAxis
                domain={[0, domainMax]}
                ticks={Array.from(
                  { length: Math.round(domainMax * 20) + 1 },
                  (_, i) => i * 0.05,
                )}
                tickFormatter={(v) => pct(v, 0)}
                tick={{ fill: axisInk, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <Tooltip
                content={<ChartTooltip colors={colors} />}
                cursor={{ stroke: axisInk, strokeWidth: 1, strokeDasharray: '3 3' }}
              />
              {series.map((s) => (
                <Line
                  key={s.id}
                  type="monotone"
                  dataKey={s.id}
                  name={s.name}
                  stroke={colors[s.id]}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="relative hidden w-28 shrink-0 sm:block" aria-hidden="true">
          {endLabels.map((label) => (
            <span
              key={label.id}
              className="absolute left-2 -translate-y-1/2 whitespace-nowrap text-[11px] leading-none text-slate-600 dark:text-slate-300"
              style={{ top: label.y }}
            >
              {label.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
