"use client";

import { useState } from "react";
import Link from "next/link";
import { ShieldIcon } from "@/components/icons";

const ORG_TYPES = ["Fire", "EMS", "Police", "Hospital", "Other"];

export default function ApplyPage() {
  const [orgName, setOrgName] = useState("");
  const [orgType, setOrgType] = useState(ORG_TYPES[0]);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError("");
    try {
      const res = await fetch("/api/responder-orgs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ orgName, orgType, contactName, contactEmail, phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not submit the application.");
      setStatus("sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit the application.");
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
            Register your organization
          </h1>
          <p style={{ color: "var(--muted)", fontSize: 14, textAlign: "center", margin: "0 0 26px" }}>
            First responder orgs can apply for a code that unlocks the full record on a scan.
            We review every application by hand before issuing a code.
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
              Application submitted. We&rsquo;ll be in touch at {contactEmail}.
            </p>
          ) : (
            <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="rq-field">
                <label className="rq-label" htmlFor="orgName">
                  Organization name
                </label>
                <input
                  id="orgName"
                  className="rq-input"
                  required
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Chicago Fire Department EMS"
                />
              </div>
              <div className="rq-field">
                <label className="rq-label" htmlFor="orgType">
                  Type
                </label>
                <select
                  id="orgType"
                  className="rq-select"
                  value={orgType}
                  onChange={(e) => setOrgType(e.target.value)}
                >
                  {ORG_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="rq-field">
                <label className="rq-label" htmlFor="contactName">
                  Your name
                </label>
                <input
                  id="contactName"
                  className="rq-input"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Jane Alvarez"
                />
              </div>
              <div className="rq-field">
                <label className="rq-label" htmlFor="contactEmail">
                  Work email
                </label>
                <input
                  id="contactEmail"
                  className="rq-input"
                  type="email"
                  required
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="you@chicago.gov"
                />
              </div>
              <div className="rq-field">
                <label className="rq-label" htmlFor="phone">
                  Phone (optional)
                </label>
                <input
                  id="phone"
                  className="rq-input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+13125551234"
                />
              </div>
              {status === "error" && <p className="rq-error-text">{error}</p>}
              <button
                type="submit"
                className="rq-btn rq-btn-primary rq-btn-block"
                disabled={status === "sending"}
              >
                {status === "sending" && <span className="rq-spinner" />}
                Submit application
              </button>
            </form>
          )}

          <p style={{ textAlign: "center", marginTop: 20 }}>
            <Link href="/" className="rq-hint">
              Back to ResQ
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
