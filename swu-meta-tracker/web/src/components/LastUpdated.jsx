import { formatDateTime } from '../lib/format'

/* Every pulled dataset shows when it was last refreshed. Data is
   refresh-based: this stamp reflects the page load, not a live feed. */
export default function LastUpdated({ timestamp }) {
  return (
    <p className="text-xs text-ink-muted">
      Data last updated: <time dateTime={timestamp || undefined}>{formatDateTime(timestamp)}</time>
    </p>
  )
}
