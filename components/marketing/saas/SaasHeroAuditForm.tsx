"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { AuditFormAlert } from "@/components/marketing/audit/AuditFormAlert";
import type { AuditUserMessage } from "@/lib/audit/audit-start-errors";
import {
  persistAuditScanSession,
  startAuditFromUrl,
} from "@/lib/marketing/start-audit-from-url";
import { SaasIcon } from "./SaasIcon";

export function SaasHeroAuditForm({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<AuditUserMessage | null>(null);

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setAlert(null);
      setLoading(true);
      try {
        const result = await startAuditFromUrl(websiteUrl);
        if (!result.ok) {
          setAlert(result.message);
          return;
        }
        persistAuditScanSession(result.auditId);
        router.push(`/audit/${result.auditId}/scanning`);
      } finally {
        setLoading(false);
      }
    },
    [router, websiteUrl],
  );

  return (
    <div className={className}>
      <form
        onSubmit={(e) => void onSubmit(e)}
        noValidate
        className="flex items-center gap-2 rounded-full border border-[#2c2c2c]/5 bg-white p-2 shadow-[0_12px_32px_rgba(61,60,60,0.12)] transition-all duration-300 focus-within:ring-2 focus-within:ring-[#088924]"
      >
        <div className="flex flex-1 items-center gap-2.5 pl-4">
          <SaasIcon icon="solar:global-linear" stroke-width="1.5" className="text-xl text-[#2c2c2c]/40" />
          <input
            type="text"
            inputMode="url"
            autoComplete="url"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            placeholder="https://yourrestaurant.co.uk"
            aria-invalid={alert?.code === "validation" ? true : undefined}
            aria-describedby={alert ? "audit-url-error" : undefined}
            className="w-full border-none bg-transparent py-2.5 text-sm text-[#2c2c2c] outline-none placeholder:text-[#2c2c2c]/40"
            required
            disabled={loading}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#094413] px-6 py-3 text-xs font-medium text-[#fbf8f5] shadow-sm transition-all duration-300 hover:bg-black disabled:opacity-60 md:text-sm"
        >
          {loading ? "Starting…" : "Analyze My Site"}
          {!loading ? <SaasIcon icon="solar:arrow-right-linear" className="text-sm" /> : null}
        </button>
      </form>
      {alert ? <AuditFormAlert id="audit-url-error" alert={alert} /> : null}
    </div>
  );
}
