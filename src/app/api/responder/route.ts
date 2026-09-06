import { buildPayload, loadBySlug } from "@/lib/profile";
import { clientKey, rateLimited, verifyCode } from "@/lib/responder";
import { jsonBody } from "@/lib/supabase";
import { markUnlocked } from "@/lib/scan";

const DENIED = { error: "Code not recognized" };

// every failure looks the same from outside
export async function POST(request: Request) {
  if (rateLimited(clientKey(request))) {
    return Response.json(DENIED, { status: 429 });
  }

  const body = await jsonBody(request);
  const slug = typeof body.slug === "string" ? body.slug : "";
  const code = typeof body.code === "string" ? body.code : "";
  if (!slug || !code) return Response.json(DENIED, { status: 401 });

  const [record, orgName] = await Promise.all([loadBySlug(slug), verifyCode(code)]);
  if (!record || !orgName) return Response.json(DENIED, { status: 401 });

  if (typeof body.scanId === "string") await markUnlocked(body.scanId, code.toUpperCase(), record.profile.id);

  return Response.json(
    buildPayload(record.profile, record.fields, record.contacts, "gated", orgName),
  );
}
