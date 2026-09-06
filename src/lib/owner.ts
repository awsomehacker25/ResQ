import type { SupabaseClient } from "@supabase/supabase-js";
import { bearerToken, userClient } from "./supabase";

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
