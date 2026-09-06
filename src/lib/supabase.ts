import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var ${name}`);
  return value;
}

// server-only - bypasses RLS, never import from client code
export function serviceClient(): SupabaseClient {
  return createClient(
    required("NEXT_PUBLIC_SUPABASE_URL"),
    required("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export function userClient(accessToken: string): SupabaseClient {
  return createClient(
    required("NEXT_PUBLIC_SUPABASE_URL"),
    required("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    },
  );
}

export function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header?.toLowerCase().startsWith("bearer ")) return null;
  return header.slice(7).trim() || null;
}

// ---------- request helpers shared by every owner-facing API route ----------

// RLS does the authorization here - every query only sees rows the caller owns
export function ownerDb(request: Request): SupabaseClient | null {
  const token = bearerToken(request);
  return token ? userClient(token) : null;
}

export const UNAUTHORIZED = Response.json({ error: "Unauthorized" }, { status: 401 });

export function pick(
  body: Record<string, unknown>,
  keys: readonly string[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of keys) if (key in body) out[key] = body[key];
  return out;
}

export async function jsonBody(request: Request): Promise<Record<string, unknown>> {
  return (await request.json().catch(() => ({}))) as Record<string, unknown>;
}

// ---------- admin gate for the responder-org review queue ----------

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
