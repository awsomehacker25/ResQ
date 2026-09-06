"use client";

import { useEffect } from "react";

// geolocation is best-effort, never blocks - denied/slow permission still reports via IP location
export function ScanLogger({ slug }: { slug: string }) {
  useEffect(() => {
    let cancelled = false;

    function report(lat: number | null, lng: number | null) {
      fetch("/api/scan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug, lat, lng }),
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!cancelled && data?.scanId) {
            sessionStorage.setItem(`resq:scan:${slug}`, data.scanId);
          }
        })
        .catch(() => {});
    }

    if (!navigator.geolocation) {
      report(null, null);
      return;
    }

    const timer = setTimeout(() => report(null, null), 2500);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(timer);
        report(position.coords.latitude, position.coords.longitude);
      },
      () => {
        clearTimeout(timer);
        report(null, null);
      },
      { timeout: 2400, maximumAge: 0 },
    );

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [slug]);

  return null;
}
