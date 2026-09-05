import { jsonBody } from "@/lib/owner";
import { requireAdmin, FORBIDDEN } from "@/lib/admin";
import { applyForOrg, listOrgs, sendOrgVerificationEmail, type OrgStatus } from "@/lib/responderOrgs";

/** Public application intake. No auth: anyone can apply, nothing is granted yet. */
export async function POST(request: Request) {
  const body = await jsonBody(request);
  const result = await applyForOrg({
    orgName: typeof body.orgName === "string" ? body.orgName : "",
    orgType: typeof body.orgType === "string" ? body.orgType : "",
    contactEmail: typeof body.contactEmail === "string" ? body.contactEmail : "",
    contactName: typeof body.contactName === "string" ? body.contactName : undefined,
    phone: typeof body.phone === "string" ? body.phone : undefined,
  });
  if ("error" in result) return Response.json({ error: result.error }, { status: 400 });

  await sendOrgVerificationEmail(result.id, result.contact_email);
  return Response.json({ id: result.id, status: result.status }, { status: 201 });
}

/** Admin review queue. */
export async function GET(request: Request) {
  if (!(await requireAdmin(request))) return FORBIDDEN;
  const status = new URL(request.url).searchParams.get("status") as OrgStatus | null;
  const orgs = await listOrgs(status ?? undefined);
  return Response.json({ orgs });
}
