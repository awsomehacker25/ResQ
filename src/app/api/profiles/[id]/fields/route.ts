import { DEFAULT_CATEGORY, isCategory, rankFor } from "@/lib/profile";
import { jsonBody, ownerDb, UNAUTHORIZED } from "@/lib/supabase";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, ctx: Ctx) {
  const db = ownerDb(request);
  if (!db) return UNAUTHORIZED;
  const { id } = await ctx.params;
  const { data, error } = await db
    .from("fields")
    .select("*")
    .eq("profile_id", id)
    .order("rank")
    .order("created_at");
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ fields: data });
}

export async function POST(request: Request, ctx: Ctx) {
  const db = ownerDb(request);
  if (!db) return UNAUTHORIZED;
  const { id } = await ctx.params;
  const body = await jsonBody(request);

  const label = typeof body.label === "string" ? body.label.trim() : "";
  const value = typeof body.value === "string" ? body.value.trim() : "";
  if (!label || !value) {
    return Response.json({ error: "label and value are required" }, { status: 400 });
  }
  const category = isCategory(body.category) ? body.category : DEFAULT_CATEGORY;

  const { data, error } = await db
    .from("fields")
    .insert({
      profile_id: id,
      key: typeof body.key === "string" && body.key ? body.key : slugKey(label),
      label,
      value,
      // Defaults are suggestions: new facts start gated, the owner opens them.
      tier: body.tier === "public" ? "public" : "gated",
      category,
      rank: rankFor(category), // app-assigned, never user-editable
    })
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json(data, { status: 201 });
}

function slugKey(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}
