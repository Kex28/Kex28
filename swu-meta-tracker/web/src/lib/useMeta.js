import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import sample from "../data/sample-meta.json";

/**
 * Loads the latest meta snapshot (joined to archetype names) from Supabase.
 * Refresh-based per the spec: fetched once on mount, no live subscriptions.
 * Falls back to bundled sample rows when Supabase isn't configured yet.
 */
export function useMeta() {
  const [state, setState] = useState({
    rows: [],
    lastUpdatedAt: null,
    isSample: false,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!supabase) {
        setState({
          rows: sample.rows,
          lastUpdatedAt: sample.lastUpdatedAt,
          isSample: true,
          loading: false,
          error: null,
        });
        return;
      }
      try {
        const { data: latest, error: dateErr } = await supabase
          .from("meta_snapshots")
          .select("snapshot_date")
          .order("snapshot_date", { ascending: false })
          .limit(1);
        if (dateErr) throw dateErr;
        if (!latest?.length) {
          setState({ rows: [], lastUpdatedAt: null, isSample: false, loading: false, error: null });
          return;
        }

        const snapshotDate = latest[0].snapshot_date;
        const { data, error } = await supabase
          .from("meta_snapshots")
          .select("meta_share, win_rate, deck_count, last_updated_at, archetypes(name, leader, base)")
          .eq("snapshot_date", snapshotDate)
          .order("meta_share", { ascending: false });
        if (error) throw error;

        if (!cancelled) {
          setState({
            rows: data.map((r) => ({
              archetype: r.archetypes?.name ?? "Unknown",
              leader: r.archetypes?.leader,
              base: r.archetypes?.base,
              metaShare: r.meta_share != null ? Number(r.meta_share) : null,
              winRate: r.win_rate != null ? Number(r.win_rate) : null,
              deckCount: r.deck_count,
            })),
            lastUpdatedAt: data[0]?.last_updated_at ?? null,
            isSample: false,
            loading: false,
            error: null,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setState((s) => ({ ...s, loading: false, error: err.message ?? String(err) }));
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
