"use client";

type ScanRow = {
  id: string;
  scanned_at: string;
  tier: "public" | "gated";
  ip_city: string | null;
  lat: number | null;
  lng: number | null;
  responder_code: string | null;
};

export function ScanLog({ scans }: { scans: ScanRow[] }) {
  if (scans.length === 0) {
    return (
      <p className="rq-hint">
        No scans yet. Scan the QR code, or use &ldquo;Simulate a scan&rdquo; beside it.
      </p>
    );
  }

  return (
    <div className="rq-scroll-x">
      <table className="rq-table">
        <thead>
          <tr>
            <th>When</th>
            <th>Location</th>
            <th>Tier reached</th>
            <th>Responder</th>
          </tr>
        </thead>
        <tbody>
          {scans.map((scan) => (
            <tr key={scan.id}>
              <td>{new Date(scan.scanned_at).toLocaleString()}</td>
              <td>{scan.ip_city ?? "Location unavailable"}</td>
              <td>
                <span className={`rq-badge ${scan.tier === "gated" ? "rq-badge-critical" : "rq-badge-public"}`}>
                  {scan.tier}
                </span>
              </td>
              <td>{scan.responder_code ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
