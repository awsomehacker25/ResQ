"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { browserClient, isSupabaseConfigured } from "@/lib/supabase-browser";
import { Login } from "@/app/dashboard/Login";
import { ShieldIcon } from "@/components/icons";

type Org = {
  id: string;
  org_name: string;
  org_type: string;
  contact_name: string | null;
  contact_email: string;
  phone: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  code: string | null;
};

function CodeActions({ code, org }: { code: string; org: Org }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard permission denied, nothing to fall back to
    }
  }

  const subject = encodeURIComponent("Your ResQ responder code");
  const body = encodeURIComponent(
    `Hi${org.contact_name ? ` ${org.contact_name}` : ""},\n\n` +
      `${org.org_name} is approved for ResQ responder access. Your code is:\n\n${code}\n\n` +
      `Enter it at the "I'm a first responder" prompt on any ResQ profile to unlock the full record.`,
  );
  const mailto = `mailto:${org.contact_email}?subject=${subject}&body=${body}`;

  return (
    <div style={{ display: "flex", gap: 8 }}>
      <button className="rq-btn rq-btn-ghost rq-btn-sm" style={{ width: 68 }} onClick={copy}>
        {copied ? "Copied" : "Copy"}
      </button>
      <a className="rq-btn rq-btn-ghost rq-btn-sm" style={{ width: 68 }} href={mailto}>
        Email
      </a>
    </div>
  );
}

export default function AdminRespondersPage() {
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [orgs, setOrgs] = useState<Org[] | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setReady(true);
      return;
    }
    const sb = browserClient();
    sb.auth.getSession().then(({ data }) => {
      setToken(data.session?.access_token ?? null);
      setReady(true);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      setToken(session?.access_token ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const load = useCallback(async (tok: string) => {
    const res = await fetch("/api/responder-orgs", { headers: { authorization: `Bearer ${tok}` } });
    if (res.status === 403) {
      setForbidden(true);
      return;
    }
    const data = await res.json();
    setOrgs(data.orgs);
  }, []);

  useEffect(() => {
    if (token) load(token).catch(console.error);
  }, [token, load]);

  async function approve(id: string) {
    if (!token) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/responder-orgs/${id}/approve`, {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not approve");
      await load(token);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not approve");
    } finally {
      setBusyId(null);
    }
  }

  async function reject(id: string) {
    if (!token) return;
    setBusyId(id);
    try {
      await fetch(`/api/responder-orgs/${id}/reject`, {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
      });
      await load(token);
    } finally {
      setBusyId(null);
    }
  }

  if (!ready) {
    return (
      <div className="rq-center-card">
        <span className="rq-spinner rq-spinner-dark" />
      </div>
    );
  }

  if (!token) return <Login />;

  if (forbidden) {
    return (
      <div className="rq-center-card">
        <div className="rq-container-narrow">
          <div className="rq-card" style={{ padding: 32, textAlign: "center" }}>
            <h1 style={{ fontSize: 19, margin: "0 0 8px" }}>Not authorized</h1>
            <p style={{ color: "var(--muted)", fontSize: 14 }}>
              This account isn&rsquo;t the configured admin. Sign in with the address set in
              <code> RESQ_ADMIN_EMAIL</code>.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rq-shell">
      <header className="rq-nav">
        <div className="rq-nav-inner">
          <span className="rq-nav-brand">
            <span className="rq-nav-mark">
              <ShieldIcon size={15} />
            </span>
            Responder org review
          </span>
          <Link href="/dashboard" className="rq-btn rq-btn-ghost rq-btn-sm">
            ← Dashboard
          </Link>
        </div>
      </header>

      <div className="rq-container">
        <div className="rq-card rq-panel">
          {orgs === null ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
              <span className="rq-spinner rq-spinner-dark" />
            </div>
          ) : orgs.length === 0 ? (
            <p className="rq-hint">No applications yet.</p>
          ) : (
            <div className="rq-scroll-x">
              <table className="rq-table">
                <thead>
                  <tr>
                    <th>Org</th>
                    <th>Type</th>
                    <th>Contact</th>
                    <th>Status</th>
                    <th>Code</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orgs.map((org) => (
                    <tr key={org.id}>
                      <td>{org.org_name}</td>
                      <td>{org.org_type}</td>
                      <td>
                        {org.contact_name ? `${org.contact_name} - ` : ""}
                        {org.contact_email}
                      </td>
                      <td>
                        <span className={`rq-badge${org.status === "rejected" ? " rq-badge-critical" : ""}`}>
                          {org.status}
                        </span>
                      </td>
                      <td>
                        <span className="rq-hint">{org.code ?? "-"}</span>
                      </td>
                      <td>
                        {org.status === "pending" ? (
                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              className="rq-btn rq-btn-primary rq-btn-sm"
                              disabled={busyId === org.id}
                              onClick={() => approve(org.id)}
                            >
                              Approve
                            </button>
                            <button
                              className="rq-btn rq-btn-ghost rq-btn-sm"
                              disabled={busyId === org.id}
                              onClick={() => reject(org.id)}
                            >
                              Reject
                            </button>
                          </div>
                        ) : org.status === "approved" && org.code ? (
                          <CodeActions code={org.code} org={org} />
                        ) : (
                          <span className="rq-hint">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
