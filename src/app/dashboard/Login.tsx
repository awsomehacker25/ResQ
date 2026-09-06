"use client";

import { useState } from "react";
import { browserClient, isSupabaseConfigured } from "@/lib/supabase-browser";
import { GoogleIcon, ShieldIcon } from "@/components/icons";

type Mode = "signin" | "signup" | "forgot";

export function Login() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<"idle" | "busy" | "checkEmail" | "error">("idle");
  const [error, setError] = useState("");

  if (!isSupabaseConfigured()) {
    return (
      <div className="rq-center-card">
        <div className="rq-container-narrow">
          <div className="rq-card" style={{ padding: 32, textAlign: "center" }}>
            <h1 style={{ fontSize: 19, margin: "0 0 8px" }}>Supabase isn&rsquo;t configured</h1>
            <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.5 }}>
              Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
              <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in <code>.env.local</code>.
            </p>
          </div>
        </div>
      </div>
    );
  }

  function switchMode(next: Mode) {
    setMode(next);
    setStatus("idle");
    setError("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("busy");
    setError("");
    try {
      if (mode === "forgot") {
        const { error } = await browserClient().auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/dashboard/reset-password`,
        });
        if (error) throw error;
        setStatus("checkEmail");
        return;
      }
      if (mode === "signup") {
        const { data, error } = await browserClient().auth.signUp({ email, password });
        if (error) throw error;
        // If email confirmations are on in Supabase, there is no session yet.
        if (!data.session) {
          setStatus("checkEmail");
          return;
        }
      } else {
        const { error } = await browserClient().auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      setStatus("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
      setStatus("error");
    }
  }

  async function withGoogle() {
    setStatus("busy");
    setError("");
    try {
      const { error } = await browserClient().auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/dashboard` },
      });
      if (error) throw error;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start Google sign-in.");
      setStatus("error");
    }
  }

  const title =
    mode === "signin" ? "Sign in to ResQ" : mode === "signup" ? "Create your ResQ account" : "Reset your password";
  const subtitle =
    mode === "signin"
      ? "Enter your email and password."
      : mode === "signup"
        ? "Pick a password to get started."
        : "We'll email you a link to set a new password.";

  return (
    <div className="rq-center-card">
      <div className="rq-container-narrow">
        <div className="rq-card" style={{ padding: 36 }}>
          <div className="rq-empty-shield" style={{ margin: "0 auto 18px" }}>
            <ShieldIcon size={22} />
          </div>
          <h1 style={{ fontSize: 21, textAlign: "center", margin: "0 0 6px" }}>{title}</h1>
          <p style={{ color: "var(--muted)", fontSize: 14, textAlign: "center", margin: "0 0 26px" }}>
            {subtitle}
          </p>

          {status === "checkEmail" ? (
            <p
              style={{
                border: "1px solid var(--green)",
                color: "var(--green)",
                padding: "14px 16px",
                fontSize: 14,
                fontWeight: 600,
                textAlign: "center",
              }}
            >
              {mode === "forgot" ? `Check ${email} for a link to set a new password.` : `Check ${email} to confirm your account.`}
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
              {mode !== "forgot" && (
                <div className="rq-field">
                  <label className="rq-label" htmlFor="password">
                    Password
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      id="password"
                      className="rq-input"
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={6}
                      autoComplete={mode === "signup" ? "new-password" : "current-password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      style={{ paddingRight: 40 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      title={showPassword ? "Hide password" : "Show password"}
                      style={{
                        position: "absolute",
                        right: 4,
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: 6,
                        display: "flex",
                        color: "var(--faint)",
                      }}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>
              )}
              {mode === "signin" && (
                <button
                  type="button"
                  className="rq-hint"
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "right" }}
                  onClick={() => switchMode("forgot")}
                >
                  Forgot password?
                </button>
              )}
              {status === "error" && <p className="rq-error-text">{error}</p>}
              <button
                type="submit"
                className="rq-btn rq-btn-primary rq-btn-block"
                disabled={status === "busy"}
              >
                {status === "busy" && <span className="rq-spinner" />}
                {mode === "signin" ? "Sign in" : mode === "signup" ? "Add" : "Send"}
              </button>
            </form>
          )}

          {status !== "checkEmail" && mode !== "forgot" && (
            <>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  margin: "18px 0",
                  color: "var(--faint)",
                  fontSize: 12,
                }}
              >
                <span style={{ flex: 1, height: 1, background: "var(--border)" }} />
                or
                <span style={{ flex: 1, height: 1, background: "var(--border)" }} />
              </div>
              <button
                type="button"
                className="rq-btn rq-btn-ghost rq-btn-block"
                onClick={withGoogle}
                disabled={status === "busy"}
                style={{ gap: 10 }}
              >
                <GoogleIcon size={17} />
                Continue with Google
              </button>
            </>
          )}

          <p style={{ textAlign: "center", marginTop: 20, fontSize: 13 }}>
            {mode === "signin" ? (
              <>
                No account?{" "}
                <button
                  type="button"
                  className="rq-hint"
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                  onClick={() => switchMode("signup")}
                >
                  Create one
                </button>
              </>
            ) : (
              <>
                {mode === "forgot" ? "Remembered it?" : "Already have an account?"}{" "}
                <button
                  type="button"
                  className="rq-hint"
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                  onClick={() => switchMode("signin")}
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
