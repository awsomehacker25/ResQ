import { requireAdmin, FORBIDDEN } from "@/lib/admin";
import { rejectOrg } from "@/lib/responderOrgs";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin(request))) return FORBIDDEN;
  const { id } = await ctx.params;
  await rejectOrg(id);
  return Response.json({ status: "rejected" });
}
