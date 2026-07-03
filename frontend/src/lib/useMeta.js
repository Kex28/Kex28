import { useEffect, useState } from "react";
import { supabase, isDemoMode } from "./supabase";
import sample from "../data/sample-meta.json";

/**
 * Loads the latest meta snapshot. Refresh-based by design: data is fetched
 * once on mount, so a page shows whatever was current when it loaded and a
 * scheduled pull only appears on the next load/refresh — no live sync.
 */
export function useMeta() {
  const [state, setState] = useState({ loading: true, rows: [], snapshotAt: null, error: null, demo: isDemoMode });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (isDemoMode) {
        setState({ loading: false, rows: sample.rows, snapshotAt: sample.snapshot_at, error: null, demo: true });
        return;
      }
      const { data, error } = await supabase
        .from("latest_meta")
        .select("*")
        .order("meta_share", { ascending: false });
      if (cancelled) return;
      if (error) {
        setState({ loading: false, rows: [], snapshotAt: null, error: error.message, demo: false });
      } else {
        setState({
          loading: false,
          rows: data ?? [],
          snapshotAt: data?.[0]?.snapshot_at ?? null,
          error: null,
          demo: false,
        });
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return state;
}
