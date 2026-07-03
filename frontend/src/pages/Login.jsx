import { useEffect, useState } from "react";
import { supabase, isDemoMode } from "../lib/supabase";

/** Supabase Auth email/password login. Each teammate gets their own account;
 * saved decks and watchlists are per-user. Sign-ups are created from the
 * Supabase dashboard (invite-only team, no open registration). */
export default function Login() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (isDemoMode) {
    return (
      <div className="flex flex-col gap-6 pt-4 max-w-md">
        <h1 className="text-2xl font-semibold tracking-tight">Login</h1>
        <div className="neu p-6">
          <p className="text-sm" style={{ color: "var(--ink-2)" }}>
            Accounts need Supabase configured — set <code>VITE_SUPABASE_URL</code> and{" "}
            <code>VITE_SUPABASE_ANON_KEY</code>, then teammates can sign in here with
            their own logins.
          </p>
        </div>
      </div>
    );
  }

  async function signIn(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    setBusy(false);
  }

  if (session) {
    return (
      <div className="flex flex-col gap-6 pt-4 max-w-md">
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <div className="neu p-6 flex flex-col gap-4">
          <p className="text-sm" style={{ color: "var(--ink-2)" }}>
            Signed in as <strong style={{ color: "var(--ink)" }}>{session.user.email}</strong>
          </p>
          <button type="button" className="neu-btn px-4 py-2 text-sm font-medium self-start"
                  onClick={() => supabase.auth.signOut()}>
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pt-4 max-w-md">
      <h1 className="text-2xl font-semibold tracking-tight">Login</h1>
      <form className="neu p-6 flex flex-col gap-4" onSubmit={signIn}>
        <label className="flex flex-col gap-2 text-sm font-medium">
          Email
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                 className="neu-inset px-4 py-3 text-sm outline-none"
                 style={{ color: "var(--ink)" }} autoComplete="email" />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium">
          Password
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                 className="neu-inset px-4 py-3 text-sm outline-none"
                 style={{ color: "var(--ink)" }} autoComplete="current-password" />
        </label>
        {error && <p className="text-sm" style={{ color: "var(--down)" }}>{error}</p>}
        <button type="submit" disabled={busy}
                className="neu-btn px-4 py-3 text-sm font-semibold"
                style={{ color: "var(--accent)" }}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
