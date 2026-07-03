import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Null when env vars aren't set — the app then runs on bundled sample data,
// so the UI is viewable before Supabase is provisioned.
export const supabase = url && anonKey ? createClient(url, anonKey) : null;
