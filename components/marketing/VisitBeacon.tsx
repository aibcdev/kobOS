"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/** True until the first view of this page load is sent; later views are clicks within the site. */
let firstView = true;

/** Counts a page view (lib/marketing/visits.ts). Sends no cookie or id, and skips automated browsers. */
export function VisitBeacon() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || navigator.webdriver) return;
    const entry = firstView;
    firstView = false;
    const body = JSON.stringify({
      path: pathname,
      entry,
      referrer: entry ? document.referrer : "",
      utmSource: entry ? new URLSearchParams(window.location.search).get("utm_source") : null,
    });
    try {
      const sent = navigator.sendBeacon?.("/api/visit", new Blob([body], { type: "text/plain" }));
      if (!sent) void fetch("/api/visit", { method: "POST", body, keepalive: true, headers: { "content-type": "text/plain" } });
    } catch {
      /* counting never breaks the page */
    }
  }, [pathname]);

  return null;
}
