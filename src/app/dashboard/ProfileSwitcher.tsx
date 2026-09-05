"use client";

import { useState } from "react";
import type { Profile } from "@/lib/types";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function ProfileSwitcher({
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
      <p className="rq-panel-sub">Your own, and anyone you manage.</p>

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
        {profiles.length === 0 && (
          <p className="rq-hint" style={{ padding: "6px 2px" }}>
            No profiles yet.
          </p>
        )}
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
            <button
              type="button"
              className="rq-btn rq-btn-ghost rq-btn-sm"
              style={{ flex: 1 }}
              onClick={() => setAdding(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rq-btn rq-btn-primary rq-btn-sm"
              style={{ flex: 1 }}
              disabled={busy || !name.trim()}
            >
              {busy ? <span className="rq-spinner" /> : "Create"}
            </button>
          </div>
        </form>
      ) : (
        <button
          className="rq-btn rq-btn-ghost rq-btn-block rq-btn-sm"
          style={{ marginTop: 10 }}
          onClick={() => setAdding(true)}
        >
          + New profile
        </button>
      )}
    </div>
  );
}
