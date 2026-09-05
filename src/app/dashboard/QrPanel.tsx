"use client";

import { useState } from "react";
import { QrIcon } from "@/components/icons";

export function QrPanel({ slug, onScan }: { slug: string; onScan?: () => void }) {
  const [copied, setCopied] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const publicUrl = `${origin}/r/${slug}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard API unavailable — nothing to fall back to silently
    }
  }

  /**
   * Conference wifi fails and phone cameras do not always reach the network,
   * so the demo needs a scan path that runs from this page. Same endpoint the
   * real scan uses: it logs the row and fires the SMS fan-out.
   */
  async function simulateScan() {
    setSimulating(true);
    try {
      await fetch("/api/scan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug, lat: null, lng: null }),
      });
      onScan?.();
    } finally {
      setSimulating(false);
    }
  }

  return (
    <div className="rq-card rq-panel">
      <p className="rq-panel-title">
        <QrIcon size={15} /> QR code
      </p>
      <p className="rq-panel-sub">Points at the public profile — editing it never breaks the code.</p>
      <div className="rq-qr-box">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="rq-qr-img" src={`/api/qr/${slug}?size=512`} alt="ResQ QR code" />
        <p className="rq-link-pill">{publicUrl}</p>
        <div style={{ display: "flex", gap: 8, width: "100%" }}>
          <button className="rq-btn rq-btn-ghost rq-btn-sm" style={{ flex: 1 }} onClick={copyLink}>
            {copied ? "Copied!" : "Copy link"}
          </button>
          <a
            className="rq-btn rq-btn-ghost rq-btn-sm"
            style={{ flex: 1 }}
            href={`/api/qr/${slug}?size=1024`}
            download={`resq-${slug}.png`}
          >
            Download PNG
          </a>
        </div>
        <a
          className="rq-btn rq-btn-dark rq-btn-block rq-btn-sm"
          href={`/print/${slug}`}
          target="_blank"
          rel="noreferrer"
        >
          Print wallet card
        </a>
        <button
          className="rq-btn rq-btn-ghost rq-btn-block rq-btn-sm"
          onClick={simulateScan}
          disabled={simulating}
        >
          {simulating ? <span className="rq-spinner rq-spinner-dark" /> : null}
          Simulate a scan
        </button>
      </div>
    </div>
  );
}
