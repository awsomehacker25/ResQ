import Link from "next/link";
import { BellIcon, LogIcon, ShieldIcon, TiersIcon } from "@/components/icons";

export default function Home() {
  return (
    <div className="rq-shell">
      <header className="rq-nav">
        <Link href="/" className="rq-nav-brand">
          <span className="rq-nav-mark">
            <ShieldIcon size={17} />
          </span>
          ResQ
        </Link>
        <Link href="/dashboard" className="rq-btn rq-btn-dark rq-btn-sm">
          Dashboard
        </Link>
      </header>

      <main style={{ flex: 1 }}>
        <div className="rq-container">
          <div className="rq-hero">
            <span className="rq-hero-eyebrow">
              <ShieldIcon size={14} /> Scan-based emergency ID
            </span>
            <h1>
              What a stranger needs to know
              <br />
              to save your life.
            </h1>
            <p>
              A QR code for your keychain, phone case, or wallet card. Scanning it shows your
              allergies, conditions, and emergency contacts, tiered by who&rsquo;s looking,
              fully controlled by you.
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
            <div className="rq-card rq-feature-card">
              <div className="rq-feature-icon">
                <TiersIcon />
              </div>
              <h3>You choose what&rsquo;s public</h3>
              <p>
                Every field and contact has its own tier. Life-saving basics can be visible
                instantly; anything sensitive stays locked to verified responders.
              </p>
            </div>
            <div className="rq-card rq-feature-card">
              <div className="rq-feature-icon">
                <BellIcon />
              </div>
              <h3>Family is notified on scan</h3>
              <p>
                The moment your code is scanned, the contacts you&rsquo;ve chosen get an SMS with
                a map link: a static card that acts like a system.
              </p>
            </div>
            <div className="rq-card rq-feature-card">
              <div className="rq-feature-icon">
                <LogIcon />
              </div>
              <h3>Every scan is logged</h3>
              <p>
                Timestamp, approximate location, and whether a responder unlocked the full
                record: visible to you in the dashboard, always.
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer style={{ borderTop: "1px solid var(--border)", padding: "18px 0" }}>
        <div
          className="rq-container"
          style={{ fontSize: 12.5, color: "var(--faint)", display: "flex", justifyContent: "space-between" }}
        >
          <span>ResQ</span>
          <span>Not a substitute for medical alert jewelry or emergency services.</span>
        </div>
      </footer>
    </div>
  );
}
