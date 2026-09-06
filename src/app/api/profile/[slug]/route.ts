import { buildPayload, loadBySlug } from "@/lib/profile";

// read-only, no scan log entry - POST /api/scan is the scan path
export async function GET(_request: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const record = await loadBySlug(slug);
  if (!record) return Response.json({ error: "No profile found" }, { status: 404 });
  return Response.json(
    buildPayload(record.profile, record.fields, record.contacts, "public"),
  );
}
