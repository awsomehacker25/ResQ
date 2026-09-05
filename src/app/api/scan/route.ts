import { buildPayload, loadBySlug } from "@/lib/profile";
import { jsonBody } from "@/lib/owner";
import { recordScan } from "@/lib/scan";

function coord(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * The scan path. Renders the public tier, records the scan, notifies
 * contacts. Notification and logging failures never block the payload.
 */
export async function POST(request: Request) {
  const body = await jsonBody(request);
  const slug = typeof body.slug === "string" ? body.slug : "";
  const record = await loadBySlug(slug);
  if (!record) return Response.json({ error: "No profile found" }, { status: 404 });

  const payload = buildPayload(record.profile, record.fields, record.contacts, "public");
  const scan = await recordScan(record, request, { lat: coord(body.lat), lng: coord(body.lng) });
  return Response.json({ ...payload, scanId: scan?.id ?? null });
}
