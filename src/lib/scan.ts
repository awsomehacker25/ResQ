import twilio from "twilio";
import { serviceClient } from "./supabase";
import type { Contact, ProfileRecord, Scan } from "./profile";

type ScanLocation = { city: string | null; lat: number | null; lng: number | null };

// Twilio trial/unregistered numbers only deliver a small set of pre-cleared
// message bodies; free-text alerts (even with a map link) get filtered.
export const ALERT_BODY = "sms_account_alerts";

async function resolveLocation(
  request: Request,
  lat: number | null,
  lng: number | null,
): Promise<ScanLocation> {
  const city = request.headers.get("x-vercel-ip-city");
  const region = request.headers.get("x-vercel-ip-country-region");
  return {
    city: city ? decodeURIComponent([city, region].filter(Boolean).join(", ")) : null,
    lat,
    lng,
  };
}

function twilioClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token || !process.env.TWILIO_SMS_FROM) return null;
  return twilio(sid, token);
}

// never throws: a failed SMS must not block the read at a crash scene
export async function sendAlerts(contacts: Contact[], body: string): Promise<number> {
  const recipients = contacts.filter((c) => c.notify);
  if (recipients.length === 0) return 0;

  const sms = twilioClient();
  if (!sms) {
    console.warn("[resq] twilio unconfigured, skipping %d alert(s)", recipients.length);
    return 0;
  }

  const results = await Promise.all(
    recipients.map(async (c) => {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          await sms.messages.create({ to: c.phone, from: process.env.TWILIO_SMS_FROM!, body });
          return true;
        } catch (error) {
          console.error("[resq] alert to %s failed (attempt %d):", c.id, attempt + 1, error);
        }
      }
      return false;
    }),
  );
  return results.filter(Boolean).length;
}

export async function recordScan(
  record: ProfileRecord,
  request: Request,
  coords: { lat: number | null; lng: number | null },
): Promise<Scan | null> {
  const location = await resolveLocation(request, coords.lat, coords.lng);
  const { data, error } = await serviceClient()
    .from("scans")
    .insert({
      profile_id: record.profile.id,
      tier: "public",
      ip_city: location.city,
      lat: location.lat,
      lng: location.lng,
      user_agent: request.headers.get("user-agent"),
    })
    .select()
    .single<Scan>();

  if (error || !data) {
    console.error("[resq] scan insert failed:", error);
    return null;
  }

  await sendAlerts(record.contacts, ALERT_BODY);
  return data;
}

// scoped to the profile so a caller-supplied scan id can't stamp an unrelated profile's log
export async function markUnlocked(
  scanId: string,
  code: string,
  profileId: string,
): Promise<void> {
  const { error } = await serviceClient()
    .from("scans")
    .update({ tier: "gated", responder_code: code })
    .eq("id", scanId)
    .eq("profile_id", profileId);
  if (error) console.error("[resq] scan unlock update failed:", error);
}
