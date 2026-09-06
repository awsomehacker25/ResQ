import { generateSlug } from "@/lib/profile";
import { jsonBody, ownerDb, UNAUTHORIZED } from "@/lib/owner";

export async function GET(request: Request) {
  const db = ownerDb(request);
  if (!db) return UNAUTHORIZED;
  const { data, error } = await db
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ profiles: data });
}

export async function POST(request: Request) {
  const db = ownerDb(request);
  if (!db) return UNAUTHORIZED;

  const body = await jsonBody(request);
  const displayName = typeof body.display_name === "string" ? body.display_name.trim() : "";
  if (!displayName) return Response.json({ error: "display_name is required" }, { status: 400 });

  const { data: user } = await db.auth.getUser();
  if (!user.user) return UNAUTHORIZED;

  // Slugs are random; a collision just means trying again.
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await db
      .from("profiles")
      .insert({
        user_id: user.user.id,
        slug: generateSlug(),
        display_name: displayName,
        photo_url: typeof body.photo_url === "string" ? body.photo_url : null,
      })
      .select()
      .single();
    if (!error) return Response.json(data, { status: 201 });
    if (error.code !== "23505") return Response.json({ error: error.message }, { status: 400 });
  }
  return Response.json({ error: "Could not allocate a slug" }, { status: 500 });
}
