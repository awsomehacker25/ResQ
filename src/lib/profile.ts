import { serviceClient } from "./supabase";

// ---------- data model (mirrors the Postgres schema in supabase/migrations) ----------

export type Tier = "public" | "gated";

export type Profile = {
  id: string;
  user_id: string;
  slug: string;
  display_name: string;
  photo_url: string | null;
  created_at: string;
};

export type Field = {
  id: string;
  profile_id: string;
  key: string;
  label: string;
  value: string;
  tier: Tier;
  category: string;
  rank: number;
  created_at: string;
};

export type Contact = {
  id: string;
  profile_id: string;
  name: string;
  relationship: string | null;
  phone: string;
  tier: Tier;
  notify: boolean;
  rank: number;
  dial_code: string;
  created_at: string;
};

export type Scan = {
  id: string;
  profile_id: string;
  scanned_at: string;
  tier: Tier;
  ip_city: string | null;
  lat: number | null;
  lng: number | null;
  responder_code: string | null;
  user_agent: string | null;
};

// ---------- field categories ----------

// Field order is app-enforced, never user-editable: a medic scanning a
// stranger needs blood type in the same place every time.
export const CATEGORY_RANK: Record<string, number> = {
  critical: 0,   // allergies, blood type, anything life-threatening
  medical: 100,  // medications, conditions, devices
  identity: 200, // name, age, DOB, address, spoken language
  admin: 300,    // insurance, physician, directives, organ donor
};

export const CATEGORIES = Object.keys(CATEGORY_RANK);
export const DEFAULT_CATEGORY = "medical";

export function rankFor(category: string): number {
  return CATEGORY_RANK[category] ?? CATEGORY_RANK[DEFAULT_CATEGORY];
}

export function isCategory(value: unknown): value is string {
  return typeof value === "string" && value in CATEGORY_RANK;
}

// ---------- slugs ----------

const SLUG_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

// random, never sequential - sequential ids would let anyone enumerate every profile
export function generateSlug(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (b) => SLUG_ALPHABET[b % SLUG_ALPHABET.length]).join("");
}

// ---------- tier filtering: the actual privacy boundary ----------

export type PublicField = { key: string; label: string; value: string; category: string };

export type PublicContact = {
  name: string;
  relationship: string | null;
  dialCode: string;
  phone?: string;
  tel: string;
  masked: boolean; // false only when tel routes direct, not through the IVR
};

export type ProfilePayload = {
  slug: string;
  displayName: string;
  photoUrl: string | null;
  tier: Tier;
  fields: PublicField[];
  contacts: PublicContact[];
  hasHiddenContent: boolean;
  unlockedBy?: string;
};

function visible(rowTier: Tier, viewerTier: Tier): boolean {
  return rowTier === "public" || viewerTier === "gated";
}

// filtering happens server-side: a gated row must never reach the response payload
export function filterFields(fields: Field[], viewerTier: Tier): PublicField[] {
  return fields
    .filter((f) => visible(f.tier, viewerTier))
    .sort((a, b) => a.rank - b.rank || a.created_at.localeCompare(b.created_at))
    .map((f) => ({ key: f.key, label: f.label, value: f.value, category: f.category }));
}

export function maskedTel(dialCode: string): string | null {
  const mask = process.env.TWILIO_MASK_NUMBER;
  // Post-dial DTMF is unreliable on some Android builds, so the dial code is
  // always returned alongside for the IVR's spoken-prompt fallback.
  return mask ? `tel:${mask},,,${dialCode}#` : null;
}

export function filterContacts(contacts: Contact[], viewerTier: Tier): PublicContact[] {
  return contacts
    .filter((c) => visible(c.tier, viewerTier))
    .sort((a, b) => a.rank - b.rank || a.created_at.localeCompare(b.created_at))
    .map((c) => {
      const base = { name: c.name, relationship: c.relationship, dialCode: c.dial_code };
      // Responders have authenticated and are accountable via the scan log,
      // so the authenticated path carries no masking failure modes.
      if (viewerTier === "gated")
        return { ...base, phone: c.phone, tel: `tel:${c.phone}`, masked: false };
      // A stranger who scans must be able to call without walking away with
      // a permanent record of the contact's personal number. With no mask
      // number configured this degrades to a direct line, and then the
      // dial-code hint must not claim otherwise.
      const masked = maskedTel(c.dial_code);
      return { ...base, tel: masked ?? `tel:${c.phone}`, masked: Boolean(masked) };
    });
}

export function buildPayload(
  profile: Profile,
  fields: Field[],
  contacts: Contact[],
  viewerTier: Tier,
  unlockedBy?: string,
): ProfilePayload {
  const visibleFields = filterFields(fields, viewerTier);
  const visibleContacts = filterContacts(contacts, viewerTier);
  return {
    slug: profile.slug,
    displayName: profile.display_name,
    photoUrl: profile.photo_url,
    tier: viewerTier,
    fields: visibleFields,
    contacts: visibleContacts,
    hasHiddenContent:
      visibleFields.length < fields.length || visibleContacts.length < contacts.length,
    ...(unlockedBy ? { unlockedBy } : {}),
  };
}

// ---------- loading a profile by its public slug ----------

export type ProfileRecord = { profile: Profile; fields: Field[]; contacts: Contact[] };

export async function loadBySlug(slug: string): Promise<ProfileRecord | null> {
  const db = serviceClient();
  const { data: profile } = await db
    .from("profiles")
    .select("*")
    .eq("slug", slug)
    .maybeSingle<Profile>();
  if (!profile) return null;

  const [fields, contacts] = await Promise.all([
    db.from("fields").select("*").eq("profile_id", profile.id),
    db.from("contacts").select("*").eq("profile_id", profile.id),
  ]);
  return {
    profile,
    fields: (fields.data ?? []) as Field[],
    contacts: (contacts.data ?? []) as Contact[],
  };
}
