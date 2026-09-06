import { bearerToken, userClient } from "./supabase";

// single-admin allowlist - only RESQ_ADMIN_EMAIL can approve orgs, deliberately not self-serve
export async function requireAdmin(request: Request): Promise<boolean> {
  const adminEmail = process.env.RESQ_ADMIN_EMAIL?.trim().toLowerCase();
  if (!adminEmail) return false;
  const token = bearerToken(request);
  if (!token) return false;
  const { data } = await userClient(token).auth.getUser();
  return data.user?.email?.trim().toLowerCase() === adminEmail;
}

export const FORBIDDEN = Response.json({ error: "Forbidden" }, { status: 403 });
