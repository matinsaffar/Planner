import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

// Login gate supporting two modes: magic link (passwordless) or
// email+password. Only you know the credentials for your Supabase user,
// so only you can ever sign in. Combined with Row Level Security in
// Postgres, this means nobody else can read or write your data even if
// they find the Vercel URL.

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<any>(null);
  const [checked, setChecked] = useState(false);
  const [mode, setMode] = useState<"magic" | "password">("magic");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecked(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  async function sendLink() {
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  async function signInPassword() {
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setError(error.message);
  }

  const inputStyle = {
    padding: 10,
    borderRadius: 8,
    border: "1px solid var(--line)",
    background: "var(--surface2)",
    color: "var(--ink)",
    fontSize: 16,
  };

  if (!checked) return <div className="loading-screen">Checking session…</div>;

  if (!session) {
    return (
      <div className="loading-screen" style={{ flexDirection: "column", gap: 14 }}>
        <img
          src="/icon-512.png"
          alt="Adaptive Planner"
          style={{ width: 72, height: 72, borderRadius: 18, boxShadow: "0 8px 24px rgba(0,0,0,.35)" }}
        />
        <h2 style={{ color: "var(--gold)", margin: 0 }}>Adaptive Planner</h2>

        <div className="day-buttons" style={{ width: 220 }}>
          <button
            className={mode === "magic" ? "active" : ""}
            onClick={() => { setMode("magic"); setError(""); }}
          >
            Magic link
          </button>
          <button
            className={mode === "password" ? "active" : ""}
            onClick={() => { setMode("password"); setError(""); }}
          >
            Password
          </button>
        </div>

        {mode === "magic" ? (
          !sent ? (
            <>
              <p style={{ fontSize: 13, color: "var(--muted)" }}>Sign in with your email to access your planner.</p>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={inputStyle}
              />
              <button
                className="btn btn-primary"
                style={{ padding: "10px 20px", flex: "none", width: "auto", alignSelf: "center" }}
                onClick={sendLink}
                disabled={loading || !email}
              >
                {loading ? "Sending…" : "Send magic link"}
              </button>
            </>
          ) : (
            <p style={{ fontSize: 13, color: "var(--muted)" }}>Check your email and tap the sign-in link to continue.</p>
          )
        ) : (
          <>
            <p style={{ fontSize: 13, color: "var(--muted)" }}>Sign in with your email and password.</p>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={inputStyle}
            />
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="password"
              type="password"
              onKeyDown={(e) => e.key === "Enter" && signInPassword()}
              style={inputStyle}
            />
            <button
              className="btn btn-primary"
              style={{ padding: "10px 20px", flex: "none", width: "auto", alignSelf: "center" }}
              onClick={signInPassword}
              disabled={loading || !email || !password}
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </>
        )}

        {error && <p style={{ fontSize: 12, color: "var(--danger)" }}>{error}</p>}
      </div>
    );
  }

  return <>{children}</>;
}
