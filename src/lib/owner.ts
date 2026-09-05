import type { SupabaseClient } from "@supabase/supabase-js";
import { bearerToken, userClient } from "./supabase";

/**
 * Owner-scoped client. RLS does the authorization — every query through it
 * sees only rows belonging to the caller, so route handlers never re-check
 * ownership by hand.
 */
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
