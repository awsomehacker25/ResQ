"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { browserClient, isSupabaseConfigured } from "@/lib/supabase-browser";
import type { Contact, Field, Profile, Tier } from "@/lib/types";
import { buildPayload } from "@/lib/profile";
import { ProfileCard } from "@/components/ProfileCard";
import { CATEGORIES } from "@/lib/fields";
import { Login } from "./Login";

async function call(path: string, token: string, init?: RequestInit) {
  const res = await fetch(path, {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}) as { error?: string });
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  if (res.status === 204) return null;
  return res.json();
}

function api(token: string) {
  return {
    get: (path: string) => call(path, token),
    post: (path: string, body: unknown) =>
      call(path, token, { method: "POST", body: JSON.stringify(body) }),
    patch: (path: string, body: unknown) =>
      call(path, token, { method: "PATCH", body: JSON.stringify(body) }),
    del: (path: string) => call(path, token, { method: "DELETE" }),
  };
}

type ScanRow = {
  id: string;
  scanned_at: string;
  tier: "public" | "gated";
  ip_city: string | null;
  lat: number | null;
  lng: number | null;
  responder_code: string | null;
};

type Tab = "fields" | "contacts" | "scans";

const PHONE_RE = /^\+[1-9]\d{7,14}$/;
const CATEGORY_LABEL: Record<string, string> = {
  critical: "Critical",
  medical: "Medical",
  identity: "Identity",
  admin: "Administrative",
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

function TierCheckbox({ tier, onChange }: { tier: Tier; onChange: (t: Tier) => void }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
      <input
        type="checkbox"
        checked={tier === "public"}
        onChange={(e) => onChange(e.target.checked ? "public" : "gated")}
      />
      Public
    </label>
  );
}

function ProfileSwitcher({
  profiles,
  activeId,
  onSelect,
  onCreate,
}: {
  profiles: Profile[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: (displayName: string) => Promise<void>;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      await onCreate(name.trim());
      setName("");
      setAdding(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rq-card rq-panel">
      <p className="rq-panel-title">Profiles</p>
      <div className="rq-profile-list">
        {profiles.map((p) => (
          <button
            key={p.id}
            className="rq-profile-item"
            data-active={p.id === activeId}
            onClick={() => onSelect(p.id)}
          >
            <span className="rq-avatar-sm">{initials(p.display_name)}</span>
            {p.display_name}
          </button>
        ))}
        {profiles.length === 0 && <p className="rq-hint">No profiles yet.</p>}
      </div>

      {adding ? (
        <form onSubmit={submit} style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
          <input
            className="rq-input"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="rq-btn rq-btn-ghost rq-btn-sm" style={{ flex: 1 }} onClick={() => setAdding(false)}>
              Cancel
            </button>
            <button type="submit" className="rq-btn rq-btn-primary rq-btn-sm" style={{ flex: 1 }} disabled={busy || !name.trim()}>
              {busy ? <span className="rq-spinner" /> : "Add"}
            </button>
          </div>
        </form>
      ) : (
        <button className="rq-btn rq-btn-ghost rq-btn-block rq-btn-sm" style={{ marginTop: 10 }} onClick={() => setAdding(true)}>
          + Add
        </button>
      )}
    </div>
  );
}

function FieldRow({
  field,
  onUpdate,
  onDelete,
}: {
  field: Field;
  onUpdate: (patch: Partial<Field>) => Promise<void>;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(field.label);
  const [value, setValue] = useState(field.value);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      await onUpdate({ label: label.trim() || field.label, value: value.trim() || field.value });
      setEditing(false);
    } finally {
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <div className="rq-row" style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}>
        <input className="rq-input" value={label} onChange={(e) => setLabel(e.target.value)} />
        <input className="rq-input" value={value} onChange={(e) => setValue(e.target.value)} />
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button className="rq-btn rq-btn-ghost rq-btn-sm" onClick={() => setEditing(false)}>
            Cancel
          </button>
          <button className="rq-btn rq-btn-primary rq-btn-sm" onClick={save} disabled={busy}>
            {busy ? <span className="rq-spinner" /> : "Save"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rq-row">
      <div className="rq-row-main" onClick={() => setEditing(true)} style={{ cursor: "text" }}>
        <p className="rq-row-title">{field.label}</p>
        <p className="rq-row-sub">{field.value}</p>
      </div>
      <div className="rq-row-actions">
        <TierCheckbox tier={field.tier} onChange={(t) => onUpdate({ tier: t })} />
        <button className="rq-icon-btn" onClick={onDelete} title="Delete">
          ✕
        </button>
      </div>
    </div>
  );
}

function FieldEditor({
  fields,
  onAdd,
  onUpdate,
  onDelete,
}: {
  fields: Field[];
  onAdd: (data: Partial<Field>) => Promise<void>;
  onUpdate: (id: string, patch: Partial<Field>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [value, setValue] = useState("");
  const [category, setCategory] = useState("medical");
  const [tier, setTier] = useState<Tier>("gated");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim() || !value.trim()) return;
    setBusy(true);
    try {
      await onAdd({ label: label.trim(), value: value.trim(), category, tier });
      setLabel("");
      setValue("");
      setTier("gated");
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  const criticalFields = fields.filter((f) => f.category === "critical");
  const allCriticalGated = criticalFields.length > 0 && criticalFields.every((f) => f.tier === "gated");
  const noneVisible = fields.length > 0 && fields.every((f) => f.tier === "gated");

  return (
    <div>
      {(allCriticalGated || noneVisible) && (
        <div className="rq-warning-banner">
          A bystander who scans this will see nothing. In most emergencies the first person on
          scene isn&rsquo;t a paramedic.
        </div>
      )}

      {CATEGORIES.map((cat) => {
        const rows = fields.filter((f) => f.category === cat);
        if (rows.length === 0) return null;
        return (
          <div className="rq-category-block" key={cat}>
            <div className="rq-category-heading">{CATEGORY_LABEL[cat]}</div>
            {rows.map((field) => (
              <FieldRow
                key={field.id}
                field={field}
                onUpdate={(patch) => onUpdate(field.id, patch)}
                onDelete={() => onDelete(field.id)}
              />
            ))}
          </div>
        );
      })}

      {fields.length === 0 && (
        <p className="rq-hint" style={{ marginBottom: 14 }}>
          No fields yet. Add allergies, conditions, or medications below.
        </p>
      )}

      {!open ? (
        <button className="rq-btn rq-btn-ghost rq-btn-block rq-btn-sm" onClick={() => setOpen(true)}>
          + Add
        </button>
      ) : (
        <form className="rq-add-form" onSubmit={submit}>
          <div className="rq-form-grid">
            <input className="rq-input" placeholder="Label (e.g. Blood type)" value={label} onChange={(e) => setLabel(e.target.value)} autoFocus />
            <select className="rq-select" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABEL[c]}
                </option>
              ))}
            </select>
          </div>
          <input className="rq-input" placeholder="Value (e.g. O negative)" value={value} onChange={(e) => setValue(e.target.value)} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <TierCheckbox tier={tier} onChange={setTier} />
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="rq-btn rq-btn-ghost rq-btn-sm" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="rq-btn rq-btn-primary rq-btn-sm" disabled={busy || !label.trim() || !value.trim()}>
                {busy ? <span className="rq-spinner" /> : "Add"}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}

function ContactRow({
  contact,
  onUpdate,
  onDelete,
}: {
  contact: Contact;
  onUpdate: (patch: Partial<Contact>) => Promise<void>;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(contact.name);
  const [relationship, setRelationship] = useState(contact.relationship ?? "");
  const [phone, setPhone] = useState(contact.phone);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!name.trim() || !PHONE_RE.test(phone.trim())) {
      setError("Enter a name and a phone number in E.164 format, e.g. +13125550101");
      return;
    }
    setError("");
    setBusy(true);
    try {
      await onUpdate({ name: name.trim(), relationship: relationship.trim() || null, phone: phone.trim() });
      setEditing(false);
    } finally {
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <div className="rq-row" style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}>
        <div className="rq-form-grid">
          <input className="rq-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
          <input className="rq-input" value={relationship} onChange={(e) => setRelationship(e.target.value)} placeholder="Relationship (wife, dad...)" />
        </div>
        <input className="rq-input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+13125550101" />
        {error && <p className="rq-error-text">{error}</p>}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            className="rq-btn rq-btn-ghost rq-btn-sm"
            onClick={() => {
              setName(contact.name);
              setRelationship(contact.relationship ?? "");
              setPhone(contact.phone);
              setError("");
              setEditing(false);
            }}
          >
            Cancel
          </button>
          <button className="rq-btn rq-btn-primary rq-btn-sm" onClick={save} disabled={busy}>
            {busy ? <span className="rq-spinner" /> : "Save"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rq-row">
      <div className="rq-row-main" onClick={() => setEditing(true)} style={{ cursor: "text" }}>
        <p className="rq-row-title">
          {contact.name}
          {contact.relationship ? ` · ${contact.relationship}` : ""}
        </p>
        <p className="rq-row-sub">
          {contact.phone} · code {contact.dial_code}
        </p>
      </div>
      <div className="rq-row-actions">
        <label title="Notify on scan" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
          <input type="checkbox" checked={contact.notify} onChange={(e) => onUpdate({ notify: e.target.checked })} />
          Notify
        </label>
        <TierCheckbox tier={contact.tier} onChange={(t) => onUpdate({ tier: t })} />
        <button className="rq-icon-btn" onClick={onDelete} title="Delete">
          ✕
        </button>
      </div>
    </div>
  );
}

function ContactEditor({
  contacts,
  onAdd,
  onUpdate,
  onDelete,
}: {
  contacts: Contact[];
  onAdd: (data: Partial<Contact>) => Promise<void>;
  onUpdate: (id: string, patch: Partial<Contact>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !PHONE_RE.test(phone.trim())) {
      setError("Enter a name and a phone number in E.164 format, e.g. +13125550101");
      return;
    }
    setError("");
    setBusy(true);
    try {
      await onAdd({ name: name.trim(), relationship: relationship.trim() || null, phone: phone.trim() });
      setName("");
      setRelationship("");
      setPhone("");
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add contact.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {contacts.length === 0 && <p className="rq-hint" style={{ marginBottom: 14 }}>No emergency contacts yet.</p>}
      {contacts.map((contact) => (
        <ContactRow key={contact.id} contact={contact} onUpdate={(patch) => onUpdate(contact.id, patch)} onDelete={() => onDelete(contact.id)} />
      ))}

      {!open ? (
        <button className="rq-btn rq-btn-ghost rq-btn-block rq-btn-sm" onClick={() => setOpen(true)}>
          + Add
        </button>
      ) : (
        <form className="rq-add-form" onSubmit={submit}>
          <div className="rq-form-grid">
            <input className="rq-input" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            <input className="rq-input" placeholder="Relationship (wife, dad...)" value={relationship} onChange={(e) => setRelationship(e.target.value)} />
          </div>
          <input className="rq-input" placeholder="+13125550101" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <p className="rq-hint">E.164 format: country code, no spaces or dashes.</p>
          {error && <p className="rq-error-text">{error}</p>}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" className="rq-btn rq-btn-ghost rq-btn-sm" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="rq-btn rq-btn-primary rq-btn-sm" disabled={busy}>
              {busy ? <span className="rq-spinner" /> : "Add"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function ScanLog({ scans }: { scans: ScanRow[] }) {
  if (scans.length === 0) {
    return <p className="rq-hint">No scans yet. Scan the QR code, or use &ldquo;Scan&rdquo; beside it.</p>;
  }
  return (
    <div className="rq-scroll-x">
      <table className="rq-table">
        <thead>
          <tr>
            <th>When</th>
            <th>Location</th>
            <th>Tier reached</th>
            <th>Responder</th>
          </tr>
        </thead>
        <tbody>
          {scans.map((scan) => (
            <tr key={scan.id}>
              <td>{new Date(scan.scanned_at).toLocaleString()}</td>
              <td>{scan.ip_city ?? "Location unavailable"}</td>
              <td>
                <span className={`rq-badge${scan.tier === "gated" ? " rq-badge-critical" : ""}`}>{scan.tier}</span>
              </td>
              <td>{scan.responder_code ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function QrPanel({ slug, onScan }: { slug: string; onScan?: () => void }) {
  const [copied, setCopied] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const publicUrl = `${origin}/r/${slug}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard permission denied, nothing to fall back to
    }
  }

  // same endpoint the real scan uses, so demo works without a phone camera on conference wifi
  async function simulateScan() {
    setSimulating(true);
    try {
      await fetch("/api/scan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug, lat: null, lng: null }),
      });
      onScan?.();
    } finally {
      setSimulating(false);
    }
  }

  return (
    <div className="rq-card rq-panel">
      <p className="rq-panel-title">QR code</p>
      <div className="rq-qr-box">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="rq-qr-img" src={`/api/qr/${slug}?size=512`} alt="ResQ QR code" />
        <p className="rq-link-pill">{publicUrl}</p>
        <div style={{ display: "flex", gap: 8, width: "100%" }}>
          <button className="rq-btn rq-btn-ghost rq-btn-sm" style={{ flex: 1 }} onClick={copyLink}>
            {copied ? "Copied" : "Copy"}
          </button>
          <a className="rq-btn rq-btn-ghost rq-btn-sm" style={{ flex: 1 }} href={`/api/qr/${slug}?size=1024`} download={`resq-${slug}.png`}>
            Download
          </a>
        </div>
        <a className="rq-btn rq-btn-dark rq-btn-block rq-btn-sm" href={`/print/${slug}`} target="_blank" rel="noreferrer">
          Print
        </a>
        <button className="rq-btn rq-btn-ghost rq-btn-block rq-btn-sm" onClick={simulateScan} disabled={simulating}>
          {simulating ? <span className="rq-spinner rq-spinner-dark" /> : null}
          Scan
        </button>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [emailAddr, setEmailAddr] = useState<string | null>(null);

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [fields, setFields] = useState<Field[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [scans, setScans] = useState<ScanRow[]>([]);
  const [tab, setTab] = useState<Tab>("fields");
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setReady(true);
      return;
    }
    const sb = browserClient();
    sb.auth.getSession().then(({ data }) => {
      setToken(data.session?.access_token ?? null);
      setEmailAddr(data.session?.user.email ?? null);
      setReady(true);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      setToken(session?.access_token ?? null);
      setEmailAddr(session?.user.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const loadProfiles = useCallback(async (tok: string) => {
    const data = await api(tok).get("/api/profiles");
    setProfiles(data.profiles);
    setActiveId((current: string | null) => current ?? data.profiles[0]?.id ?? null);
  }, []);

  useEffect(() => {
    if (token) loadProfiles(token).catch(console.error);
  }, [token, loadProfiles]);

  useEffect(() => {
    if (!token) {
      setIsAdmin(false);
      return;
    }
    // reuses the server-side admin gate, no admin email ever hits the client
    fetch("/api/responder-orgs", { headers: { authorization: `Bearer ${token}` } })
      .then((res) => setIsAdmin(res.ok))
      .catch(() => setIsAdmin(false));
  }, [token]);

  const loadProfileData = useCallback(async (tok: string, profileId: string) => {
    setLoadingProfile(true);
    try {
      const [f, c, s] = await Promise.all([
        api(tok).get(`/api/profiles/${profileId}/fields`),
        api(tok).get(`/api/profiles/${profileId}/contacts`),
        api(tok).get(`/api/profiles/${profileId}/scans`),
      ]);
      setFields(f.fields);
      setContacts(c.contacts);
      setScans(s.scans);
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  useEffect(() => {
    if (token && activeId) loadProfileData(token, activeId).catch(console.error);
  }, [token, activeId, loadProfileData]);

  if (!ready) {
    return (
      <div className="rq-center-card">
        <span className="rq-spinner rq-spinner-dark" />
      </div>
    );
  }

  if (!token) return <Login />;

  const activeProfile = profiles.find((p) => p.id === activeId) ?? null;

  async function createProfile(displayName: string) {
    if (!token) return;
    const created = await api(token).post("/api/profiles", { display_name: displayName });
    setProfiles((prev) => [...prev, created]);
    setActiveId(created.id);
  }

  async function addField(data: Partial<Field>) {
    if (!token || !activeId) return;
    const created = await api(token).post(`/api/profiles/${activeId}/fields`, data);
    setFields((prev) => [...prev, created]);
  }
  async function updateField(id: string, patch: Partial<Field>) {
    if (!token) return;
    const updated = await api(token).patch(`/api/fields/${id}`, patch);
    setFields((prev) => prev.map((f) => (f.id === id ? updated : f)));
  }
  async function deleteField(id: string) {
    if (!token) return;
    await api(token).del(`/api/fields/${id}`);
    setFields((prev) => prev.filter((f) => f.id !== id));
  }

  async function addContact(data: Partial<Contact>) {
    if (!token || !activeId) return;
    const created = await api(token).post(`/api/profiles/${activeId}/contacts`, data);
    setContacts((prev) => [...prev, created]);
  }
  async function updateContact(id: string, patch: Partial<Contact>) {
    if (!token) return;
    const updated = await api(token).patch(`/api/contacts/${id}`, patch);
    setContacts((prev) => prev.map((c) => (c.id === id ? updated : c)));
  }
  async function deleteContact(id: string) {
    if (!token) return;
    await api(token).del(`/api/contacts/${id}`);
    setContacts((prev) => prev.filter((c) => c.id !== id));
  }

  async function refreshScans() {
    if (!token || !activeId) return;
    const s = await api(token).get(`/api/profiles/${activeId}/scans`);
    setScans(s.scans);
    setTab("scans");
  }

  const previewPayload = activeProfile ? buildPayload(activeProfile, fields, contacts, "public") : null;

  return (
    <div className="rq-shell">
      <header className="rq-nav">
        <Link href="/" className="rq-nav-brand">
          ResQ
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {isAdmin && (
            <Link href="/admin/responders" className="rq-btn rq-btn-ghost rq-btn-sm">
              Responder review
            </Link>
          )}
          <span style={{ fontSize: 13, color: "var(--muted)" }}>{emailAddr}</span>
          <button className="rq-btn rq-btn-ghost rq-btn-sm" onClick={() => browserClient().auth.signOut()}>
            Sign out
          </button>
        </div>
      </header>

      <div className="rq-container">
        <div className="rq-dash-layout">
          <div className="rq-dash-col">
            <ProfileSwitcher profiles={profiles} activeId={activeId} onSelect={setActiveId} onCreate={createProfile} />
          </div>

          <div>
            {!activeProfile ? (
              <div className="rq-card rq-panel">
                <p className="rq-panel-title">Create your first profile</p>
              </div>
            ) : (
              <div className="rq-card rq-panel">
                <div className="rq-tabs">
                  <button className="rq-tab" data-active={tab === "fields"} onClick={() => setTab("fields")}>
                    Fields
                  </button>
                  <button className="rq-tab" data-active={tab === "contacts"} onClick={() => setTab("contacts")}>
                    Contacts
                  </button>
                  <button className="rq-tab" data-active={tab === "scans"} onClick={() => setTab("scans")}>
                    Scan log
                  </button>
                </div>
                {loadingProfile ? (
                  <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
                    <span className="rq-spinner rq-spinner-dark" />
                  </div>
                ) : tab === "fields" ? (
                  <FieldEditor fields={fields} onAdd={addField} onUpdate={updateField} onDelete={deleteField} />
                ) : tab === "contacts" ? (
                  <ContactEditor contacts={contacts} onAdd={addContact} onUpdate={updateContact} onDelete={deleteContact} />
                ) : (
                  <ScanLog scans={scans} />
                )}
              </div>
            )}
          </div>

          {activeProfile && previewPayload && (
            <div className="rq-dash-col">
              <div>
                <p className="rq-panel-title" style={{ marginBottom: 10 }}>
                  Live preview
                </p>
                <div className="rq-phone-frame">
                  <ProfileCard payload={previewPayload} responderHref={`/r/${activeProfile.slug}/full`} />
                </div>
              </div>
              <QrPanel slug={activeProfile.slug} onScan={refreshScans} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
