import { jsonBody } from "@/lib/owner";
import { requireAdmin, FORBIDDEN } from "@/lib/admin";
import { applyForOrg, listOrgs, type OrgStatus } from "@/lib/responderOrgs";

// no auth needed, applying grants nothing - email ownership is proven via Google sign-in after this, not a mailed link
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

  return Response.json({ id: result.id, status: result.status }, { status: 201 });
}

export async function GET(request: Request) {
  if (!(await requireAdmin(request))) return FORBIDDEN;
  const status = new URL(request.url).searchParams.get("status") as OrgStatus | null;
  const orgs = await listOrgs(status ?? undefined);
  return Response.json({ orgs });
}
