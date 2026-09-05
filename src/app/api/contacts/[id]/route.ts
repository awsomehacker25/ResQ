import { jsonBody, ownerDb, pick, UNAUTHORIZED } from "@/lib/owner";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const db = ownerDb(request);
  if (!db) return UNAUTHORIZED;
  const { id } = await ctx.params;
  // dial_code is server-allocated and stays put: printed codes must not move.
  const patch = pick(await jsonBody(request), [
    "name",
    "relationship",
    "phone",
    "tier",
    "notify",
    "rank",
  ]);
  const { data, error } = await db.from("contacts").update(patch).eq("id", id).select().single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json(data);
}

export async function DELETE(request: Request, ctx: Ctx) {
  const db = ownerDb(request);
  if (!db) return UNAUTHORIZED;
  const { id } = await ctx.params;
  const { error } = await db.from("contacts").delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return new Response(null, { status: 204 });
}
