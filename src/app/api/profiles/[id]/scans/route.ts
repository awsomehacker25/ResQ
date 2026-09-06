import { ownerDb, UNAUTHORIZED } from "@/lib/supabase";

export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const db = ownerDb(request);
  if (!db) return UNAUTHORIZED;
  const { id } = await ctx.params;
  const { data, error } = await db
    .from("scans")
    .select("id, scanned_at, tier, ip_city, lat, lng, responder_code")
    .eq("profile_id", id)
    .order("scanned_at", { ascending: false })
    .limit(200);
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ scans: data });
}
