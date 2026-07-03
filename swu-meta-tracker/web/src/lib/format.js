export function formatPercent(fraction, digits = 1) {
  if (fraction == null || Number.isNaN(Number(fraction))) return '—'
  return `${(Number(fraction) * 100).toFixed(digits)}%`
}

export function formatDateTime(value) {
  if (!value) return 'never'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'never'
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}
