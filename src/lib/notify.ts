import twilio from "twilio";
import type { Contact } from "./types";

export type ScanLocation = { city: string | null; lat: number | null; lng: number | null };

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
}

/**
 * The SMS must be actionable on its own: "someone scanned Jacob's code"
 * tells a family member nothing they can act on.
 * When no location is known the line says so; an absent line reads as a bug.
 */
export function buildAlert(
  displayName: string,
  location: ScanLocation,
  scanId: string,
  at: Date = new Date(),
): string {
  const time = at.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: process.env.RESQ_TZ ?? "America/Chicago",
  });
  const where = location.city ? `near ${location.city}` : "at an unavailable location";
  return (
    `ResQ alert: ${displayName}'s emergency code was just scanned ` +
    `${where} (${time}). Map: ${baseUrl()}/s/${scanId}`
  );
}

/** Browser geolocation when granted, IP-derived city otherwise. */
export async function resolveLocation(
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

function client() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token || !process.env.TWILIO_SMS_FROM) return null;
  return twilio(sid, token);
}

/**
 * Fan out to contacts with notify = true. Never throws: a failed
 * notification must not block the read at a crash scene.
 */
export async function sendAlerts(contacts: Contact[], body: string): Promise<number> {
  const recipients = contacts.filter((c) => c.notify);
  if (recipients.length === 0) return 0;

  const sms = client();
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
