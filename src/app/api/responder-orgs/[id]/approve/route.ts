import { requireAdmin, FORBIDDEN } from "@/lib/admin";
import { approveOrg } from "@/lib/responderOrgs";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin(request))) return FORBIDDEN;
  const { id } = await ctx.params;
  const result = await approveOrg(id);
  if ("error" in result) return Response.json(result, { status: 400 });
  return Response.json(result);
}
