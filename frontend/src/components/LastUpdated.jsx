/** Every pulled dataset shows when it was last refreshed — spec requirement. */
export default function LastUpdated({ timestamp, demo }) {
  if (!timestamp) return null;
  const when = new Date(timestamp).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  return (
    <p className="text-xs" style={{ color: "var(--ink-3)" }}>
      Data last updated {when}
      {demo && " · demo data (Supabase not configured)"}
    </p>
  );
}
