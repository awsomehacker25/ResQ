"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { browserClient, isSupabaseConfigured } from "@/lib/supabase-browser";
import type { Contact, Field, Profile } from "@/lib/types";
import { buildPayload } from "@/lib/profile";
import { ProfileCard } from "@/components/ProfileCard";
import { ShieldIcon } from "@/components/icons";
import { api } from "./api";
import { Login } from "./Login";
import { ProfileSwitcher } from "./ProfileSwitcher";
import { FieldEditor } from "./FieldEditor";
import { ContactEditor } from "./ContactEditor";
import { ScanLog } from "./ScanLog";
import { QrPanel } from "./QrPanel";

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

  const previewPayload = activeProfile
    ? buildPayload(activeProfile, fields, contacts, "public")
    : null;

  return (
    <div className="rq-shell">
      <header className="rq-nav">
        <Link href="/" className="rq-nav-brand">
          <span className="rq-nav-mark">
            <ShieldIcon size={17} />
          </span>
          ResQ
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 13, color: "var(--muted)" }}>{emailAddr}</span>
          <button
            className="rq-btn rq-btn-ghost rq-btn-sm"
            onClick={() => browserClient().auth.signOut()}
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="rq-container">
        <div className="rq-dash-layout">
          <div className="rq-dash-col">
            <ProfileSwitcher
              profiles={profiles}
              activeId={activeId}
              onSelect={setActiveId}
              onCreate={createProfile}
            />
          </div>

          <div>
            {!activeProfile ? (
              <div className="rq-card rq-panel">
                <p className="rq-panel-title">Create your first profile</p>
                <p className="rq-panel-sub">
                  Start with your own, then add one for anyone you manage.
                </p>
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
                  <ContactEditor
                    contacts={contacts}
                    onAdd={addContact}
                    onUpdate={updateContact}
                    onDelete={deleteContact}
                  />
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
                  <ProfileCard payload={previewPayload} />
                </div>
              </div>
              <QrPanel slug={activeProfile.slug} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
