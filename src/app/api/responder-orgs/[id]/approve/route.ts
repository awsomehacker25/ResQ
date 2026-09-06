import { requireAdmin, FORBIDDEN } from "@/lib/supabase";
import { approveOrg } from "@/lib/responder";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin(request))) return FORBIDDEN;
  const { id } = await ctx.params;
  const result = await approveOrg(id);
  if ("error" in result) return Response.json(result, { status: 400 });
  return Response.json(result);
}
