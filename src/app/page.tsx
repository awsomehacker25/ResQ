import Link from "next/link";
import { ShieldIcon } from "@/components/icons";

export default function Home() {
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
          <div className="rq-hero">
            <span className="rq-hero-eyebrow">Scan-based emergency ID</span>
            <h1>What a stranger needs to know to save your life.</h1>
            <p>
              A QR code for your keychain, phone case, or wallet card, showing your allergies,
              conditions, and emergency contacts, tiered by who&rsquo;s looking.
            </p>
            <div className="rq-hero-actions">
              <Link href="/dashboard" className="rq-btn rq-btn-primary">
                Create your profile
              </Link>
              <Link href="/r/jk4m2xq9" className="rq-btn rq-btn-ghost">
                View a live demo profile
              </Link>
            </div>
          </div>

          <div className="rq-feature-grid">
            <div className="rq-feature-card">
              <h3>You choose what&rsquo;s public</h3>
              <p>Each field has its own tier. Sensitive details stay locked to responders.</p>
            </div>
            <div className="rq-feature-card">
              <h3>Family is notified on scan</h3>
              <p>Your chosen contacts get an SMS with a map link the moment it&rsquo;s scanned.</p>
            </div>
            <div className="rq-feature-card">
              <h3>Every scan is logged</h3>
              <p>Time, location, and unlock status: visible in your dashboard, always.</p>
            </div>
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
          <span>ResQ</span>
          <span>Not a substitute for medical alert jewelry or emergency services.</span>
          <Link href="/responders/apply" className="rq-hint">
            First responder org? Register here
          </Link>
        </div>
      </footer>
    </div>
  );
}
