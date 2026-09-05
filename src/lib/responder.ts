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

type CodeRow = {
  org_name: string;
  active: boolean;
  org_id: string | null;
  responder_orgs: { status: string } | null;
};

/** Returns the org name for an active code, null otherwise. The caller must
 *  report the same generic failure either way, no hint about which codes
 *  are valid.
 *
 *  A code linked to a self-serve org (org_id set) only works while that
 *  org's application is approved; a legacy seeded code (org_id null) has no
 *  org to check and works as long as it is active. */
export async function verifyCode(code: string): Promise<string | null> {
  const { data } = await serviceClient()
    .from("responders")
    .select("org_name, active, org_id, responder_orgs(status)")
    .eq("code", code.trim().toUpperCase())
    .maybeSingle<CodeRow>();
  if (!data?.active) return null;
  if (data.org_id && data.responder_orgs?.status !== "approved") return null;
  return data.org_name;
}

export function clientKey(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}
