import { serviceClient } from "./supabase";

export type OrgStatus = "pending" | "approved" | "rejected";

export type ResponderOrg = {
  id: string;
  org_name: string;
  org_type: string;
  contact_name: string | null;
  contact_email: string;
  phone: string | null;
  status: OrgStatus;
  created_at: string;
  approved_at: string | null;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ApplyInput = {
  orgName: string;
  orgType: string;
  contactEmail: string;
  contactName?: string;
  phone?: string;
};

export async function applyForOrg(input: ApplyInput): Promise<ResponderOrg | { error: string }> {
  const orgName = input.orgName.trim();
  const orgType = input.orgType.trim();
  const contactEmail = input.contactEmail.trim().toLowerCase();
  if (!orgName || !orgType) return { error: "Org name and type are required" };
  if (!EMAIL_RE.test(contactEmail)) return { error: "A valid contact email is required" };

  const { data, error } = await serviceClient()
    .from("responder_orgs")
    .insert({
      org_name: orgName,
      org_type: orgType,
      contact_email: contactEmail,
      contact_name: input.contactName?.trim() || null,
      phone: input.phone?.trim() || null,
    })
    .select()
    .single<ResponderOrg>();

  if (error) {
    // unique violation on contact_email
    if (error.code === "23505") return { error: "An application for this email already exists" };
    return { error: error.message };
  }
  return data;
}

export type ResponderOrgWithCode = ResponderOrg & { code: string | null };

export async function listOrgs(status?: OrgStatus): Promise<ResponderOrgWithCode[]> {
  let query = serviceClient()
    .from("responder_orgs")
    .select("*, responders(code)")
    .order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  const { data } = await query.returns<(ResponderOrg & { responders: { code: string }[] })[]>();
  return (data ?? []).map(({ responders, ...org }) => ({ ...org, code: responders[0]?.code ?? null }));
}

const CODE_ALPHABET = "0123456789";

function prefixFromName(name: string): string {
  const letters = name
    .split(/\s+/)
    .map((w) => w.replace(/[^A-Za-z]/g, "")[0])
    .filter(Boolean)
    .join("")
    .toUpperCase();
  return (letters || "ORG").slice(0, 4);
}

// Allocates a globally unique "PREFIX-1234" code, mirroring allocateDialCode.
async function allocateResponderCode(orgName: string): Promise<string> {
  const db = serviceClient();
  const prefix = prefixFromName(orgName);
  for (let attempt = 0; attempt < 20; attempt++) {
    const digits = Array.from(
      crypto.getRandomValues(new Uint8Array(4)),
      (b) => CODE_ALPHABET[b % 10],
    ).join("");
    const code = `${prefix}-${digits}`;
    const { data } = await db.from("responders").select("code").eq("code", code).maybeSingle();
    if (!data) return code;
  }
  throw new Error("Could not allocate a responder code");
}

export async function approveOrg(orgId: string): Promise<{ code: string } | { error: string }> {
  const db = serviceClient();
  const { data: org } = await db
    .from("responder_orgs")
    .select("*")
    .eq("id", orgId)
    .maybeSingle<ResponderOrg>();
  if (!org) return { error: "Not found" };

  const code = await allocateResponderCode(org.org_name);
  const { error: insertError } = await db
    .from("responders")
    .insert({ code, org_name: org.org_name, active: true, org_id: orgId });
  if (insertError) return { error: insertError.message };

  await db
    .from("responder_orgs")
    .update({ status: "approved", approved_at: new Date().toISOString() })
    .eq("id", orgId);

  return { code };
}

export async function rejectOrg(orgId: string): Promise<void> {
  await serviceClient().from("responder_orgs").update({ status: "rejected" }).eq("id", orgId);
}
