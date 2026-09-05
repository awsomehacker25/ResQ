import { bearerToken, userClient } from "@/lib/supabase";
import { verifyOrgEmail } from "@/lib/responderOrgs";

const DENIED = Response.json({ error: "Could not verify this email against the application" }, { status: 401 });

/**
 * Called by the applicant's own browser right after the magic-link redirect.
 * Their Supabase session proves inbox ownership; it does not grant approval.
 */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const token = bearerToken(request);
  if (!token) return DENIED;
  const { data } = await userClient(token).auth.getUser();
  const email = data.user?.email;
  if (!email) return DENIED;

  const { id } = await ctx.params;
  const org = await verifyOrgEmail(id, email);
  if (!org) return DENIED;
  return Response.json({ status: org.status, emailVerified: Boolean(org.email_verified_at) });
}
