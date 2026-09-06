import Link from "next/link";
import { ShieldIcon } from "@/components/icons";
import { ProfileCard } from "@/components/ProfileCard";
import { buildPayload, loadBySlug } from "@/lib/profile";

const DEMO_SLUG = "jk4m2xq9";

const FEATURES = [
  {
    title: "You choose what's public",
    desc: "Each field has its own tier. Sensitive details stay locked to responders.",
  },
  {
    title: "Family is notified on scan",
    desc: "Your chosen contacts get an SMS with a map link the moment it's scanned.",
  },
  {
    title: "Every scan is logged",
    desc: "Time, location, and unlock status: visible in your dashboard, always.",
  },
];

export default async function Home() {
  const demo = await loadBySlug(DEMO_SLUG).catch(() => null);
  const demoPayload = demo ? buildPayload(demo.profile, demo.fields, demo.contacts, "public") : null;

  return (
    <div className="rq-shell">
      <header className="rq-nav">
        <div className="rq-nav-inner">
          <Link href="/" className="rq-nav-brand">
            <span className="rq-nav-mark">
              <ShieldIcon size={15} />
            </span>
            ResQ
          </Link>
          <Link href="/dashboard" className="rq-btn rq-btn-dark rq-btn-sm">
            Dashboard
          </Link>
        </div>
      </header>

      <main style={{ flex: 1 }}>
        <div className="rq-container">
          <div className="rq-hero-row">
            <div className="rq-hero">
              <span className="rq-hero-eyebrow">Scan-based emergency ID</span>
              <h1>What a stranger needs to know to save your life.</h1>
              <p>A QR code for your keychain or wallet card, tiered by who&rsquo;s looking.</p>
              <div className="rq-hero-actions">
                <Link href="/dashboard" className="rq-btn rq-btn-primary">
                  Create your profile
                </Link>
                <Link href={`/r/${DEMO_SLUG}`} className="rq-btn rq-btn-ghost">
                  View a live demo profile
                </Link>
              </div>

              <div className="rq-feature-list">
                {FEATURES.map((f) => (
                  <div className="rq-checklist-item" key={f.title}>
                    <span className="rq-checklist-mark" data-done="true">
                      ✓
                    </span>
                    <span className="rq-checklist-text">
                      <strong className="rq-feature-list-title">{f.title}</strong>
                      <span className="rq-feature-list-desc">{f.desc}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {demoPayload && (
              <div>
                <p className="rq-hero-preview-label">What a bystander sees</p>
                <div className="rq-phone-frame" style={{ margin: 0 }}>
                  <ProfileCard payload={demoPayload} responderHref={`/r/${DEMO_SLUG}/full`} />
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer style={{ borderTop: "1px solid var(--border)", padding: "18px 0" }}>
        <div
          className="rq-container"
          style={{
            fontSize: 12.5,
            color: "var(--faint)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <span>© 2026 ResQ</span>
          <span>Every second counts.</span>
          <Link href="/responders/apply" className="rq-hint">
            First responder org? Register here
          </Link>
        </div>
      </footer>
    </div>
  );
}
