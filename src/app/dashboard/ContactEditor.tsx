"use client";

import { useState } from "react";
import type { Contact, Tier } from "@/lib/types";

function TierToggle({ tier, onChange }: { tier: Tier; onChange: (t: Tier) => void }) {
  return (
    <button
      className="rq-toggle"
      data-on={tier === "public"}
      title={tier === "public" ? "Public (click to gate)" : "Gated (click to make public)"}
      onClick={() => onChange(tier === "public" ? "gated" : "public")}
    />
  );
}

const PHONE_RE = /^\+[1-9]\d{7,14}$/;

function AddContactForm({ onAdd }: { onAdd: (data: Partial<Contact>) => Promise<void> }) {
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

  if (!open) {
    return (
      <button className="rq-btn rq-btn-ghost rq-btn-block rq-btn-sm" onClick={() => setOpen(true)}>
        + Add contact
      </button>
    );
  }

  return (
    <form className="rq-add-form" onSubmit={submit}>
      <div className="rq-form-grid">
        <input
          className="rq-input"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
        <input
          className="rq-input"
          placeholder="Relationship (wife, dad...)"
          value={relationship}
          onChange={(e) => setRelationship(e.target.value)}
        />
      </div>
      <input
        className="rq-input"
        placeholder="+13125550101"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />
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
  return (
    <div className="rq-row">
      <div className="rq-row-main">
        <p className="rq-row-title">
          {contact.name}
          {contact.relationship ? ` · ${contact.relationship}` : ""}
        </p>
        <p className="rq-row-sub">
          {contact.phone} · code {contact.dial_code}
        </p>
      </div>
      <div className="rq-row-actions">
        <label
          title="Notify on scan"
          style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--muted)", fontWeight: 600 }}
        >
          <input
            type="checkbox"
            checked={contact.notify}
            onChange={(e) => onUpdate({ notify: e.target.checked })}
          />
          Notify
        </label>
        <TierToggle tier={contact.tier} onChange={(t) => onUpdate({ tier: t })} />
        <button className="rq-icon-btn" onClick={onDelete} title="Delete">
          ✕
        </button>
      </div>
    </div>
  );
}

export function ContactEditor({
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
  return (
    <div>
      {contacts.length === 0 && (
        <p className="rq-hint" style={{ marginBottom: 14 }}>
          No emergency contacts yet.
        </p>
      )}
      {contacts.map((contact) => (
        <ContactRow
          key={contact.id}
          contact={contact}
          onUpdate={(patch) => onUpdate(contact.id, patch)}
          onDelete={() => onDelete(contact.id)}
        />
      ))}
      <AddContactForm onAdd={onAdd} />
    </div>
  );
}
