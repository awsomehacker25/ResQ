"use client";

import { useState } from "react";
import { browserClient, isSupabaseConfigured } from "@/lib/supabase-browser";
import { ShieldIcon } from "@/components/icons";

export function Login() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  if (!isSupabaseConfigured()) {
    return (
      <div className="rq-center-card">
        <div className="rq-container-narrow">
          <div className="rq-card" style={{ padding: 32, textAlign: "center" }}>
            <h1 style={{ fontSize: 19, margin: "0 0 8px" }}>Supabase isn&rsquo;t configured</h1>
            <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.5 }}>
              Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
              <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in <code>.env.local</code> — see{" "}
              <code>SETUP.md</code>.
            </p>
          </div>
        </div>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError("");
    try {
      const { error } = await browserClient().auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo:
            typeof window !== "undefined" ? `${window.location.origin}/dashboard` : undefined,
        },
      });
      if (error) throw error;
      setStatus("sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the link.");
      setStatus("error");
    }
  }

  return (
    <div className="rq-center-card">
      <div className="rq-container-narrow">
        <div className="rq-card" style={{ padding: 36 }}>
          <div className="rq-empty-shield" style={{ margin: "0 auto 18px" }}>
            <ShieldIcon size={24} />
          </div>
          <h1 style={{ fontSize: 21, textAlign: "center", margin: "0 0 6px" }}>
            Sign in to ResQ
          </h1>
          <p
            style={{
              color: "var(--muted)",
              fontSize: 14,
              textAlign: "center",
              margin: "0 0 26px",
            }}
          >
            We&rsquo;ll email you a magic link — no password needed.
          </p>

          {status === "sent" ? (
            <p
              style={{
                background: "var(--green-bg)",
                border: "1px solid var(--green-border)",
                color: "var(--green)",
                borderRadius: "var(--radius-md)",
                padding: "14px 16px",
                fontSize: 14,
                fontWeight: 600,
                textAlign: "center",
              }}
            >
              Check {email} for your sign-in link.
            </p>
          ) : (
            <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="rq-field">
                <label className="rq-label" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  className="rq-input"
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              {status === "error" && <p className="rq-error-text">{error}</p>}
              <button
                type="submit"
                className="rq-btn rq-btn-primary rq-btn-block"
                disabled={status === "sending"}
              >
                {status === "sending" && <span className="rq-spinner" />}
                Send magic link
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
