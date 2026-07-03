import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** Null when env vars are absent — the app then runs in demo mode on
 * bundled sample data, so the UI is fully explorable before Supabase is
 * provisioned. */
export const supabase = url && anonKey ? createClient(url, anonKey) : null;

export const isDemoMode = supabase === null;
