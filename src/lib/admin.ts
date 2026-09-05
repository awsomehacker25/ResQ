import { bearerToken, userClient } from "./supabase";

/**
 * Single-admin allowlist via env var. Org approval unlocks the ability to
 * read someone's medical record, so this is intentionally not self-serve:
 * only the operator configured in RESQ_ADMIN_EMAIL can approve or reject.
 */
export async function requireAdmin(request: Request): Promise<boolean> {
  const adminEmail = process.env.RESQ_ADMIN_EMAIL?.trim().toLowerCase();
  if (!adminEmail) return false;
  const token = bearerToken(request);
  if (!token) return false;
  const { data } = await userClient(token).auth.getUser();
  return data.user?.email?.trim().toLowerCase() === adminEmail;
}

export const FORBIDDEN = Response.json({ error: "Forbidden" }, { status: 403 });
