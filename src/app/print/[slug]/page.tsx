import { loadBySlug } from "@/lib/profile";
import { PrintTrigger } from "./PrintTrigger";

export default async function PrintCardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const record = await loadBySlug(slug);

  if (!record) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <p>No profile found for this code.</p>
      </div>
    );
  }

  return (
    <div className="rq-print-page">
      <PrintTrigger />
      <div className="rq-print-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="rq-print-qr" src={`/api/qr/${slug}?size=512`} alt="ResQ QR code" />
        <div>
          <p className="rq-print-name">{record.profile.display_name}</p>
          <p className="rq-print-tag">Scan for emergency info</p>
          <p className="rq-print-brand">RESQ</p>
        </div>
      </div>
      <p className="rq-no-print" style={{ textAlign: "center", marginTop: 20, color: "var(--muted)", fontSize: 13 }}>
        Use your browser&rsquo;s print dialog to save as PDF or print on a wallet-card sticker.
      </p>
    </div>
  );
}
