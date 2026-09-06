import type { Contact, Field, Profile, Tier } from "./types";
import { serviceClient } from "./supabase";

const SLUG_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

// random, never sequential - sequential ids would let anyone enumerate every profile
export function generateSlug(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (b) => SLUG_ALPHABET[b % SLUG_ALPHABET.length]).join("");
}

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
