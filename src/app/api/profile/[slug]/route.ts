import { buildPayload, loadBySlug } from "@/lib/profile";

/** Read-only public payload. Logs nothing; POST /api/scan is the scan path. */
export async function GET(_request: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const record = await loadBySlug(slug);
  // Never leak whether a slug previously existed.
  if (!record) return Response.json({ error: "No profile found" }, { status: 404 });
  return Response.json(
    buildPayload(record.profile, record.fields, record.contacts, "public"),
  );
}
