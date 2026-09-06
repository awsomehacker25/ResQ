"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { browserClient } from "@/lib/supabase-browser";
import { ShieldIcon } from "@/components/icons";

type State = "checking" | "ready" | "invalid" | "done";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [state, setState] = useState<State>("checking");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const sb = browserClient();
    let settled = false;

    // The recovery link's session lands via URL fragment; supabase-js parses
    // it and fires this event once ready, but the exact timing depends on
    // page load, so we also poll getSession() as a fallback below.
    const { data: sub } = sb.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        settled = true;
        setState("ready");
      }
    });

    sb.auth.getSession().then(({ data }) => {
      if (settled) return;
      if (data.session) {
        settled = true;
        setState("ready");
        return;
      }
      setTimeout(() => {
        if (!settled) setState("invalid");
      }, 1500);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { error } = await browserClient().auth.updateUser({ password });
      if (error) throw error;
      setState("done");
      setTimeout(() => router.push("/dashboard"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rq-center-card">
      <div className="rq-container-narrow">
        <div className="rq-card" style={{ padding: 36, textAlign: "center" }}>
          <div className="rq-empty-shield" style={{ margin: "0 auto 18px" }}>
            <ShieldIcon size={22} />
          </div>

          {state === "checking" && (
            <>
              <h1 style={{ fontSize: 19, margin: "0 0 8px" }}>One moment</h1>
              <p style={{ color: "var(--muted)", fontSize: 14 }}>Confirming your reset link...</p>
            </>
          )}

          {state === "invalid" && (
            <>
              <h1 style={{ fontSize: 19, margin: "0 0 8px" }}>Link invalid or expired</h1>
              <p style={{ color: "var(--muted)", fontSize: 14 }}>
                Go back to sign-in and request a new password reset link.
              </p>
            </>
          )}

          {state === "done" && (
            <>
              <h1 style={{ fontSize: 19, margin: "0 0 8px" }}>Password updated</h1>
              <p style={{ color: "var(--muted)", fontSize: 14 }}>Taking you to the dashboard...</p>
            </>
          )}

          {state === "ready" && (
            <>
              <h1 style={{ fontSize: 19, margin: "0 0 6px" }}>Set a new password</h1>
              <p style={{ color: "var(--muted)", fontSize: 14, margin: "0 0 26px" }}>
                Choose a new password for your account.
              </p>
              <form
                onSubmit={submit}
                style={{ display: "flex", flexDirection: "column", gap: 12, textAlign: "left" }}
              >
                <div className="rq-field">
                  <label className="rq-label" htmlFor="password">
                    New password
                  </label>
                  <input
                    id="password"
                    className="rq-input"
                    type="password"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    autoFocus
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                  />
                </div>
                {error && <p className="rq-error-text">{error}</p>}
                <button type="submit" className="rq-btn rq-btn-primary rq-btn-block" disabled={busy}>
                  {busy && <span className="rq-spinner" />}
                  Save
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
