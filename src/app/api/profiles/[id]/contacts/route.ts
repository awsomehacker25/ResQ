import { jsonBody, ownerDb, UNAUTHORIZED } from "@/lib/supabase";
import { allocateDialCode } from "@/lib/voice";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, ctx: Ctx) {
  const db = ownerDb(request);
  if (!db) return UNAUTHORIZED;
  const { id } = await ctx.params;
  const { data, error } = await db
    .from("contacts")
    .select("*")
    .eq("profile_id", id)
    .order("rank")
    .order("created_at");
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ contacts: data });
}

export async function POST(request: Request, ctx: Ctx) {
  const db = ownerDb(request);
  if (!db) return UNAUTHORIZED;
  const { id } = await ctx.params;
  const body = await jsonBody(request);

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  if (!name || !/^\+[1-9]\d{7,14}$/.test(phone)) {
    return Response.json({ error: "name and E.164 phone are required" }, { status: 400 });
  }

  const { data, error } = await db
    .from("contacts")
    .insert({
      profile_id: id,
      name,
      relationship: typeof body.relationship === "string" ? body.relationship : null,
      phone,
      // A call button is useful to a bystander even when medical detail is not.
      tier: body.tier === "gated" ? "gated" : "public",
      notify: body.notify !== false,
      rank: typeof body.rank === "number" ? body.rank : 0,
      dial_code: await allocateDialCode(),
    })
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json(data, { status: 201 });
}
