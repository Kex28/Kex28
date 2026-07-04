import { sampleSnapshot } from "./sampleData";
import type { MetaRow, MetaSnapshot } from "./types";

/* Read layer. Talks straight to Supabase's PostgREST endpoint with the anon
   key (RLS allows public reads on pulled tables). Refresh-based by design:
   data is fetched on page load, never pushed mid-session. */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const configured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

async function rest<T>(pathAndQuery: string): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${pathAndQuery}`, {
    headers: {
      apikey: SUPABASE_ANON_KEY!,
      Authorization: `Bearer ${SUPABASE_ANON_KEY!}`,
    },
  });
  if (!res.ok) throw new Error(`Supabase read failed (${res.status})`);
  return res.json() as Promise<T>;
}

interface SnapshotRow {
  captured_at: string;
  meta_share: string | number;
  win_rate: string | number | null;
  deck_count: number | null;
  match_count: number | null;
  source_window: string | null;
  archetypes: {
    id: string;
    name: string;
    leader: string;
    base: string;
    aspect: string | null;
  };
}

export async function fetchMetaSnapshot(): Promise<MetaSnapshot> {
  if (!configured) return sampleSnapshot;

  const [latest] = await rest<{ captured_at: string }[]>(
    "meta_snapshots?select=captured_at&order=captured_at.desc&limit=1",
  );
  if (!latest) return { ...sampleSnapshot, rows: [], demo: false, lastSyncAt: null };

  const [snapshotRows, syncRuns] = await Promise.all([
    rest<SnapshotRow[]>(
      `meta_snapshots?select=captured_at,meta_share,win_rate,deck_count,match_count,source_window,archetypes(id,name,leader,base,aspect)` +
        `&captured_at=eq.${encodeURIComponent(latest.captured_at)}&order=meta_share.desc`,
    ),
    rest<{ finished_at: string | null }[]>(
      "sync_runs?select=finished_at&status=eq.ok&order=finished_at.desc&limit=1",
    ),
  ]);

  const rows: MetaRow[] = snapshotRows.map((r) => ({
    archetype: r.archetypes,
    metaShare: Number(r.meta_share),
    winRate: r.win_rate == null ? null : Number(r.win_rate),
    deckCount: r.deck_count,
    matchCount: r.match_count,
  }));

  return {
    capturedAt: latest.captured_at,
    sourceWindow: snapshotRows[0]?.source_window ?? null,
    lastSyncAt: syncRuns[0]?.finished_at ?? null,
    demo: false,
    rows,
  };
}
