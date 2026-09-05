"use client";

import { useState } from "react";
import type { Field, Tier } from "@/lib/types";
import { CATEGORIES } from "@/lib/fields";

const CATEGORY_LABEL: Record<string, string> = {
  critical: "Critical",
  medical: "Medical",
  identity: "Identity",
  admin: "Administrative",
};

const CATEGORY_DOT: Record<string, string> = {
  critical: "var(--red)",
  medical: "var(--brand)",
  identity: "#a855f7",
  admin: "var(--muted)",
};

function TierToggle({ tier, onChange }: { tier: Tier; onChange: (t: Tier) => void }) {
  return (
    <button
      className="rq-toggle"
      data-on={tier === "public"}
      title={tier === "public" ? "Public — click to gate" : "Gated — click to make public"}
      onClick={() => onChange(tier === "public" ? "gated" : "public")}
    />
  );
}

function AddFieldForm({ onAdd }: { onAdd: (data: Partial<Field>) => Promise<void> }) {
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

  if (!open) {
    return (
      <button className="rq-btn rq-btn-ghost rq-btn-block rq-btn-sm" onClick={() => setOpen(true)}>
        + Add field
      </button>
    );
  }

  return (
    <form className="rq-add-form" onSubmit={submit}>
      <div className="rq-form-grid">
        <input
          className="rq-input"
          placeholder="Label (e.g. Blood type)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          autoFocus
        />
        <select
          className="rq-select"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABEL[c]}
            </option>
          ))}
        </select>
      </div>
      <input
        className="rq-input"
        placeholder="Value (e.g. O negative)"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: "var(--ink-soft)" }}>
          <TierToggle tier={tier} onChange={setTier} />
          {tier === "public" ? "Public" : "Gated"}
        </label>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="rq-btn rq-btn-ghost rq-btn-sm" onClick={() => setOpen(false)}>
            Cancel
          </button>
          <button
            type="submit"
            className="rq-btn rq-btn-primary rq-btn-sm"
            disabled={busy || !label.trim() || !value.trim()}
          >
            {busy ? <span className="rq-spinner" /> : "Add"}
          </button>
        </div>
      </div>
    </form>
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
        <TierToggle tier={field.tier} onChange={(t) => onUpdate({ tier: t })} />
        <button className="rq-icon-btn" onClick={onDelete} title="Delete">
          ✕
        </button>
      </div>
    </div>
  );
}

export function FieldEditor({
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
  const criticalFields = fields.filter((f) => f.category === "critical");
  const allCriticalGated = criticalFields.length > 0 && criticalFields.every((f) => f.tier === "gated");
  const noneVisible = fields.length > 0 && fields.every((f) => f.tier === "gated");

  return (
    <div>
      {(allCriticalGated || noneVisible) && (
        <div className="rq-warning-banner">
          <span>⚠</span>
          <span>
            A bystander who scans this will see nothing. In most emergencies the first person on
            scene isn&rsquo;t a paramedic.
          </span>
        </div>
      )}

      {CATEGORIES.map((category) => {
        const rows = fields.filter((f) => f.category === category);
        if (rows.length === 0) return null;
        return (
          <div className="rq-category-block" key={category}>
            <div className="rq-category-heading">
              <span className="rq-dot" style={{ background: CATEGORY_DOT[category] }} />
              {CATEGORY_LABEL[category]}
            </div>
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
          No fields yet — add allergies, conditions, or medications below.
        </p>
      )}

      <AddFieldForm onAdd={onAdd} />
    </div>
  );
}
