import { requireAdmin, FORBIDDEN } from "@/lib/supabase";
import { rejectOrg } from "@/lib/responder";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin(request))) return FORBIDDEN;
  const { id } = await ctx.params;
  await rejectOrg(id);
  return Response.json({ status: "rejected" });
}
