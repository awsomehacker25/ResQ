"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { browserClient } from "@/lib/supabase-browser";
import { ShieldIcon } from "@/components/icons";

type State = "checking" | "verified" | "error";

export default function VerifyOrgEmailPage() {
  return (
    <Suspense>
      <VerifyOrgEmailForm />
    </Suspense>
  );
}

function VerifyOrgEmailForm() {
  const params = useSearchParams();
  const orgId = params.get("orgId");
  const [state, setState] = useState<State>("checking");
  const [message, setMessage] = useState("Confirming your email...");

  useEffect(() => {
    if (!orgId) {
      setState("error");
      setMessage("This link is missing its application id.");
      return;
    }
    const sb = browserClient();
    sb.auth.getSession().then(async ({ data }) => {
      const token = data.session?.access_token;
      if (!token) {
        setState("error");
        setMessage("This confirmation link is invalid or has expired.");
        return;
      }
      try {
        const res = await fetch(`/api/responder-orgs/${orgId}/verify-email`, {
          method: "POST",
          headers: { authorization: `Bearer ${token}` },
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "Could not confirm this email.");
        setState("verified");
        setMessage("Email confirmed. Your application is now pending review.");
      } catch (err) {
        setState("error");
        setMessage(err instanceof Error ? err.message : "Could not confirm this email.");
      }
    });
  }, [orgId]);

  return (
    <div className="rq-center-card">
      <div className="rq-container-narrow">
        <div className="rq-card" style={{ padding: 36, textAlign: "center" }}>
          <div className="rq-empty-shield" style={{ margin: "0 auto 18px" }}>
            <ShieldIcon size={24} />
          </div>
          <h1 style={{ fontSize: 19, margin: "0 0 8px" }}>
            {state === "checking" ? "One moment" : state === "verified" ? "You're confirmed" : "Something went wrong"}
          </h1>
          <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.5 }}>{message}</p>
          <p style={{ marginTop: 20 }}>
            <Link href="/" className="rq-hint">
              Back to ResQ
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
