import { serviceClient } from "./supabase";
import { buildAlert, resolveLocation, sendAlerts } from "./notify";
import type { ProfileRecord } from "./profile";
import type { Scan } from "./types";

/**
 * Records a public-tier scan and notifies contacts.
 *
 * Notification fires on the public scan, not the gated one: a bystander
 * scanning at a crash scene is exactly when family most needs to know.
 */
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

  await sendAlerts(record.contacts, buildAlert(record.profile.display_name, location, data.id));
  return data;
}

/** Marks an existing scan as having reached the gated tier. */
export async function markUnlocked(scanId: string, code: string): Promise<void> {
  const { error } = await serviceClient()
    .from("scans")
    .update({ tier: "gated", responder_code: code })
    .eq("id", scanId);
  if (error) console.error("[resq] scan unlock update failed:", error);
}
