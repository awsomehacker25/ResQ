import { serviceClient } from "./supabase";

/**
 * ponytail: in-memory limiter, single instance only. Move to a Postgres
 * table or Upstash if this ever runs on more than one Vercel lambda.
 */
const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 5;

export function rateLimited(key: string, now = Date.now()): boolean {
  const entry = attempts.get(key);
  if (!entry || now > entry.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_ATTEMPTS;
}

/** Returns the org name for an active code, null otherwise. The caller must
 *  report the same generic failure either way, no hint about which codes
 *  are valid. */
export async function verifyCode(code: string): Promise<string | null> {
  const { data } = await serviceClient()
    .from("responders")
    .select("org_name, active")
    .eq("code", code.trim().toUpperCase())
    .maybeSingle<{ org_name: string; active: boolean }>();
  return data?.active ? data.org_name : null;
}

export function clientKey(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}
