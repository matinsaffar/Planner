import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

// Simple magic-link login gate. Only you know the email you set up as your
// Supabase user, so only you can ever get a valid login link. Combined with
// Row Level Security in Postgres, this means nobody else can read or write
// your data even if they find the Vercel URL.

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<any>(null);
  const [checked, setChecked] = useState(false);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecked(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  async function sendLink() {
    await supabase.auth.signInWithOtp({ email });
    setSent(true);
  }

  if (!checked) return <div className="loading-screen">Checking session…</div>;

  if (!session) {
    return (
      <div className="loading-screen" style={{ flexDirection: "column", gap: 14 }}>
        <h2 style={{ color: "var(--gold)", margin: 0 }}>Adaptive Planner</h2>
        {!sent ? (
          <>
            <p style={{ fontSize: 13, color: "var(--muted)" }}>Sign in with your email to access your planner.</p>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
              style={{ padding: 10, borderRadius: 8, border: "1px solid var(--line)", background: "var(--surface2)", color: "var(--ink)" }} />
            <button className="btn btn-primary" style={{ padding: "10px 20px" }} onClick={sendLink}>Send magic link</button>
          </>
        ) : (
          <p style={{ fontSize: 13, color: "var(--muted)" }}>Check your email and tap the sign-in link to continue.</p>
        )}
      </div>
    );
  }

  return <>{children}</>;
}
