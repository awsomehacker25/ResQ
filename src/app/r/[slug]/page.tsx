import type { Metadata } from "next";
import { buildPayload, loadBySlug } from "@/lib/profile";
import { ProfileCard } from "@/components/ProfileCard";
import { ShieldIcon } from "@/components/icons";
import { ScanLogger } from "./ScanLogger";

export const metadata: Metadata = { title: "ResQ: Emergency profile" };

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const record = await loadBySlug(slug);

  if (!record) {
    return (
      <div className="rq-center-card">
        <div className="rq-container-narrow">
          <div className="rq-card" style={{ padding: 36, textAlign: "center" }}>
            <div className="rq-empty-shield" style={{ margin: "0 auto 16px" }}>
              <ShieldIcon />
            </div>
            <h1 style={{ fontSize: 19, margin: "0 0 8px" }}>No profile found</h1>
            <p style={{ color: "var(--muted)", fontSize: 14.5, margin: "0 0 22px" }}>
              This ResQ code isn&rsquo;t linked to a profile. It may have been removed.
            </p>
            <a className="rq-btn rq-btn-primary rq-btn-block" href="/">
              Create a ResQ profile
            </a>
          </div>
        </div>
      </div>
    );
  }

  const payload = buildPayload(record.profile, record.fields, record.contacts, "public");

  return (
    <div className="rq-shell" style={{ padding: "36px 16px", justifyContent: "center" }}>
      <ScanLogger slug={slug} />
      <div className="rq-phone-frame">
        <ProfileCard payload={payload} responderHref={`/r/${slug}/full`} />
        <p
          style={{
            textAlign: "center",
            fontSize: 12,
            color: "var(--faint)",
            marginTop: 16,
          }}
        >
          Powered by ResQ · this scan was logged and the profile owner was notified
        </p>
      </div>
    </div>
  );
}
