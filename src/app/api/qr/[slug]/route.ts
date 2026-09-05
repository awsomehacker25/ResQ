import QRCode from "qrcode";
import { loadBySlug } from "@/lib/profile";

/** QR PNG for a profile. The payload is a URL, not embedded data, so
 *  editing a profile never invalidates a printed code. */
export async function GET(request: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  if (!(await loadBySlug(slug))) {
    return Response.json({ error: "No profile found" }, { status: 404 });
  }

  const size = Number(new URL(request.url).searchParams.get("size") ?? 512);
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? new URL(request.url).origin;
  const png = await QRCode.toBuffer(`${base}/r/${slug}`, {
    width: Math.min(Math.max(Number.isFinite(size) ? size : 512, 128), 2048),
    margin: 2,
    errorCorrectionLevel: "H", // survives a scuffed sticker or a laminated badge
  });

  return new Response(new Uint8Array(png), {
    headers: { "content-type": "image/png", "cache-control": "public, max-age=3600" },
  });
}
