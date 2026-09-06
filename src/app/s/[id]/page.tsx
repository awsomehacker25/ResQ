import type { Metadata } from "next";
import { serviceClient } from "@/lib/supabase";

export const metadata: Metadata = { title: "ResQ: Scan alert" };

type ScanDetail = {
  scanned_at: string;
  tier: "public" | "gated";
  ip_city: string | null;
  lat: number | null;
  lng: number | null;
  responder_code: string | null;
  profiles: { display_name: string; slug: string } | null;
};

// scan id is the only credential here, must not leak the medical record
export default async function ScanAlertPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // A malformed id would make Postgres error on the uuid comparison.
  const valid = /^[0-9a-f-]{36}$/i.test(id);
  const { data } = valid
    ? await serviceClient()
        .from("scans")
        .select("scanned_at, tier, ip_city, lat, lng, responder_code, profiles(display_name, slug)")
        .eq("id", id)
        .maybeSingle<ScanDetail>()
    : { data: null };

  if (!data?.profiles) {
    return (
      <div className="rq-center-card">
        <div className="rq-container-narrow">
          <div className="rq-card" style={{ padding: 36, textAlign: "center" }}>
            <div className="rq-empty-shield" style={{ margin: "0 auto 16px" }} />
            <h1 style={{ fontSize: 19, margin: "0 0 8px" }}>Alert not found</h1>
            <p style={{ color: "var(--muted)", fontSize: 14.5, margin: 0 }}>
              This alert link is no longer valid.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { display_name: name, slug } = data.profiles;
  const place = data.ip_city ?? "Location unavailable";
  const mapHref =
    data.lat != null && data.lng != null
      ? `https://www.google.com/maps/search/?api=1&query=${data.lat},${data.lng}`
      : data.ip_city
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.ip_city)}`
        : null;

  return (
    <div className="rq-center-card">
      <div className="rq-container-narrow">
        <div className="rq-card" style={{ padding: 28 }}>
          <p className="rq-hint" style={{ marginBottom: 14 }}>ResQ alert</p>
          <h1 style={{ fontSize: 20, margin: "0 0 6px" }}>
            {name}&rsquo;s emergency code was scanned
          </h1>
          <p style={{ color: "var(--muted)", fontSize: 14, margin: "0 0 22px", lineHeight: 1.5 }}>
            Someone opened this profile. If you can, try reaching {name} directly.
          </p>

          <div className="rq-section">
            <div className="rq-fact-row">
              <span className="rq-fact-label">When</span>
              <span className="rq-fact-value">{new Date(data.scanned_at).toLocaleString()}</span>
            </div>
            <div className="rq-fact-row">
              <span className="rq-fact-label">Where</span>
              <span className="rq-fact-value">
                {data.lat != null && data.lng != null
                  ? `${place} (${data.lat.toFixed(4)}, ${data.lng.toFixed(4)})`
                  : place}
              </span>
            </div>
            <div className="rq-fact-row">
              <span className="rq-fact-label">Opened by</span>
              <span className="rq-fact-value">
                <span
                  className={`rq-badge${data.tier === "gated" ? " rq-badge-critical" : ""}`}
                >
                  {data.tier === "gated"
                    ? `First responder${data.responder_code ? ` · ${data.responder_code}` : ""}`
                    : "Bystander"}
                </span>
              </span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 20 }}>
            {mapHref && (
              <a
                className="rq-btn rq-btn-primary rq-btn-block"
                href={mapHref}
                target="_blank"
                rel="noreferrer"
              >
                Open in Maps
              </a>
            )}
            <a className="rq-btn rq-btn-ghost rq-btn-block" href={`/r/${slug}`}>
              View {name}&rsquo;s emergency profile
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
