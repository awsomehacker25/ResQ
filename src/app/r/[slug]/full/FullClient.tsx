"use client";

import { useState } from "react";
import type { ProfilePayload } from "@/lib/profile";
import { ProfileCard } from "@/components/ProfileCard";
import { LockIcon, ShieldIcon } from "@/components/icons";

type State =
  | { step: "locked" }
  | { step: "checking" }
  | { step: "denied"; message: string }
  | { step: "unlocked"; payload: ProfilePayload };

export function FullClient({ slug }: { slug: string }) {
  const [code, setCode] = useState("");
  const [state, setState] = useState<State>({ step: "locked" });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setState({ step: "checking" });

    const scanId =
      typeof window !== "undefined" ? sessionStorage.getItem(`resq:scan:${slug}`) : null;

    try {
      const res = await fetch("/api/responder", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug, code: code.trim(), scanId }),
      });
      if (res.status === 429) {
        setState({ step: "denied", message: "Too many attempts. Try again in a minute." });
        return;
      }
      if (!res.ok) {
        setState({ step: "denied", message: "Code not recognized." });
        return;
      }
      const payload = (await res.json()) as ProfilePayload;
      setState({ step: "unlocked", payload });
    } catch {
      setState({ step: "denied", message: "Something went wrong. Try again." });
    }
  }

  if (state.step === "unlocked") {
    return (
      <div className="rq-phone-frame">
        <ProfileCard payload={state.payload} />
      </div>
    );
  }

  return (
    <div className="rq-phone-frame">
      <div className="rq-card" style={{ padding: 32, textAlign: "center" }}>
        <div className="rq-empty-shield" style={{ margin: "0 auto 18px" }}>
          <LockIcon size={24} />
        </div>
        <h1 style={{ fontSize: 19, margin: "0 0 6px" }}>First responder unlock</h1>
        <p style={{ color: "var(--muted)", fontSize: 14, margin: "0 0 24px", lineHeight: 1.5 }}>
          Enter your department&rsquo;s access code to view the full record. This unlock is
          logged against this profile&rsquo;s scan history.
        </p>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <input
            className="rq-input rq-code-input"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="CFD-4471"
            autoFocus
            autoComplete="off"
            disabled={state.step === "checking"}
          />
          {state.step === "denied" && <p className="rq-error-text">{state.message}</p>}
          <button
            type="submit"
            className="rq-btn rq-btn-dark rq-btn-block"
            disabled={state.step === "checking" || !code.trim()}
          >
            {state.step === "checking" ? <span className="rq-spinner" /> : <ShieldIcon size={16} />}
            Unlock full record
          </button>
        </form>
      </div>
      <p style={{ textAlign: "center", fontSize: 12.5, marginTop: 16 }}>
        <a className="rq-muted-link" href={`/r/${slug}`}>
          ← Back to public profile
        </a>
      </p>
    </div>
  );
}
