export const pct = (v, digits = 1) => (v == null ? '—' : `${(v * 100).toFixed(digits)}%`)

export const deltaPp = (v) =>
  v == null ? '—' : `${v >= 0 ? '+' : '−'}${Math.abs(v * 100).toFixed(1)}pp`

export const longDate = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
