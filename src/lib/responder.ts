import { serviceClient } from "./supabase";

// ponytail: in-memory limiter, single instance only. Move to Postgres/Upstash if this scales past one lambda.
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

// null for any invalid code - caller must report the same generic failure either way
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
