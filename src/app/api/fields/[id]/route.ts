import { isCategory, rankFor } from "@/lib/profile";
import { jsonBody, ownerDb, pick, UNAUTHORIZED } from "@/lib/supabase";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const db = ownerDb(request);
  if (!db) return UNAUTHORIZED;
  const { id } = await ctx.params;

  const body = await jsonBody(request);
  const patch = pick(body, ["label", "value", "tier", "category"] as const);
  // rank follows category; a client cannot set it directly.
  if (isCategory(patch.category)) patch.rank = rankFor(patch.category);
  else delete patch.category;

  const { data, error } = await db.from("fields").update(patch).eq("id", id).select().single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json(data);
}

export async function DELETE(request: Request, ctx: Ctx) {
  const db = ownerDb(request);
  if (!db) return UNAUTHORIZED;
  const { id } = await ctx.params;
  const { error } = await db.from("fields").delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return new Response(null, { status: 204 });
}
