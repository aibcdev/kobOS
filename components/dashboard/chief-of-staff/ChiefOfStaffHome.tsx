"use client";

import { useCallback, useRef, useState } from "react";
import type { TodayBriefPayload } from "@/lib/chief-of-staff/types";
import type { AiPersonality } from "@prisma/client";
import { ActionCardsColumn } from "@/components/dashboard/chief-of-staff/ActionCardsColumn";
import { CoSToast } from "@/components/dashboard/chief-of-staff/CoSToast";
import { InsightsSidebar } from "@/components/dashboard/chief-of-staff/InsightsSidebar";
import { PersonalitySelect } from "@/components/dashboard/chief-of-staff/PersonalitySelect";
import { TaskFeedColumn } from "@/components/dashboard/chief-of-staff/TaskFeedColumn";
import { cosCanvas } from "@/lib/dashboard/chief-of-staff-theme";

type ToastState = {
  message: string;
  tone: "info" | "success" | "error";
  href?: string;
  hrefLabel?: string;
};

export function ChiefOfStaffHome({
  restaurantId,
  restaurantName,
  initial,
  previewMode,
  welcome,
}: {
  restaurantId: string;
  restaurantName: string;
  initial: TodayBriefPayload;
  previewMode?: boolean;
  welcome?: boolean;
}) {
  const [brief, setBrief] = useState(initial);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [holidayBusy, setHolidayBusy] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [personalitySaving, setPersonalitySaving] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const taskRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const showToast = useCallback((t: ToastState) => {
    setToast(t);
    window.setTimeout(() => setToast(null), 6000);
  }, []);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/chief-of-staff/today?restaurantId=${encodeURIComponent(restaurantId)}`, {
      cache: "no-store",
    });
    if (res.ok) setBrief((await res.json()) as TodayBriefPayload);
  }, [restaurantId]);

  const approveTask = useCallback(
    async (taskId: string) => {
      if (previewMode) {
        showToast({ message: "Preview mode — approve works after sign-in.", tone: "info" });
        return;
      }
      setBusyId(taskId);
      try {
        const res = await fetch(`/api/chief-of-staff/tasks/${taskId}/approve`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ restaurantId }),
        });
        const body = (await res.json()) as { message?: string; nextHref?: string; error?: string };
        if (res.ok) {
          setBrief((b) => ({
            ...b,
            tasks: b.tasks.map((t) => (t.id === taskId ? { ...t, status: "APPROVED" } : t)),
          }));
          showToast({
            message: body.message ?? "Approved.",
            tone: "success",
            href: body.nextHref,
            hrefLabel: "View",
          });
        } else {
          showToast({
            message: body.message ?? body.error ?? "Could not approve.",
            tone: "error",
            href: body.nextHref,
            hrefLabel: "Settings",
          });
        }
      } finally {
        setBusyId(null);
      }
    },
    [previewMode, restaurantId, showToast],
  );

  const approveHoliday = useCallback(async () => {
    if (previewMode) {
      showToast({ message: "Preview mode — approve works after sign-in.", tone: "info" });
      return;
    }
    setHolidayBusy(true);
    try {
      const res = await fetch("/api/chief-of-staff/tasks/approve-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId, category: "HOLIDAY" }),
      });
      const body = (await res.json()) as { message?: string; nextHref?: string };
      if (res.ok) {
        await refresh();
        showToast({ message: body.message ?? "Holiday campaigns approved.", tone: "success", href: body.nextHref, hrefLabel: "Content" });
      } else {
        showToast({ message: "Could not approve holiday tasks.", tone: "error" });
      }
    } finally {
      setHolidayBusy(false);
    }
  }, [previewMode, restaurantId, refresh, showToast]);

  const regenerate = useCallback(async () => {
    if (previewMode) return;
    setRegenerating(true);
    try {
      const res = await fetch("/api/chief-of-staff/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId }),
      });
      if (res.ok) {
        setBrief((await res.json()) as TodayBriefPayload);
        showToast({ message: "Brief refreshed.", tone: "success" });
      } else {
        showToast({ message: "Could not refresh brief.", tone: "error" });
      }
    } finally {
      setRegenerating(false);
    }
  }, [previewMode, restaurantId, showToast]);

  const onPersonalityChange = useCallback(
    async (p: AiPersonality) => {
      const prev = brief.aiPersonality;
      setBrief((b) => ({ ...b, aiPersonality: p }));
      if (previewMode) return;
      setPersonalitySaving(true);
      try {
        const res = await fetch("/api/restaurant/personality", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ restaurantId, aiPersonality: p }),
        });
        if (!res.ok) {
          setBrief((b) => ({ ...b, aiPersonality: prev }));
          showToast({ message: "Could not save tone.", tone: "error" });
        } else {
          showToast({ message: "AI tone saved.", tone: "success" });
        }
      } finally {
        setPersonalitySaving(false);
      }
    },
    [brief.aiPersonality, previewMode, restaurantId, showToast],
  );

  const scrollToTask = useCallback((taskId: string) => {
    setHighlightId(taskId);
    taskRefs.current[taskId]?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => setHighlightId(null), 2000);
  }, []);

  const focusFirstAuditTask = useCallback(() => {
    const t = brief.tasks.find((x) => x.source === "AUDIT" && x.status === "PENDING");
    if (t) scrollToTask(t.id);
  }, [brief.tasks, scrollToTask]);

  const onSuggestionClick = useCallback(
    (suggestion: string) => {
      const needle = suggestion.toLowerCase();
      const match = brief.tasks.find(
        (t) => t.title.toLowerCase().includes(needle.slice(0, 12)) || needle.includes(t.title.toLowerCase().slice(0, 12)),
      );
      if (match) scrollToTask(match.id);
      else showToast({ message: suggestion, tone: "info" });
    },
    [brief.tasks, scrollToTask, showToast],
  );

  return (
    <div className={`-mx-4 -mt-2 min-h-[calc(100vh-4rem)] px-4 py-6 sm:-mx-6 sm:px-6 ${cosCanvas}`}>
      {welcome ? (
        <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Welcome — your daily helper is ready for {restaurantName}.
        </p>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          disabled={regenerating || previewMode}
          onClick={() => void regenerate()}
          className="rounded-full border border-[#ddd] bg-white px-4 py-2 text-xs font-medium text-[#444] disabled:opacity-50"
        >
          {regenerating ? "Refreshing…" : "Refresh brief"}
        </button>
      </div>

      <div className="mx-auto grid max-w-[90rem] gap-6 lg:grid-cols-12">
        <div className="lg:col-span-4 xl:col-span-3">
          <TaskFeedColumn
            tasks={brief.tasks}
            restaurantName={restaurantName}
            onApprove={approveTask}
            busyId={busyId}
            highlightId={highlightId}
            taskRefs={taskRefs}
          />
        </div>
        <div className="lg:col-span-5 xl:col-span-6">
          <ActionCardsColumn
            greeting={brief.greeting}
            summary={brief.summary}
            onApproveHoliday={approveHoliday}
            onApproveTopFix={focusFirstAuditTask}
            holidayBusy={holidayBusy}
          />
          <div className="mt-5">
            <PersonalitySelect
              value={brief.aiPersonality}
              onChange={onPersonalityChange}
              disabled={previewMode || personalitySaving}
            />
          </div>
        </div>
        <div className="lg:col-span-3">
          <InsightsSidebar summary={brief.summary} onSuggestionClick={onSuggestionClick} />
        </div>
      </div>

      {toast ? (
        <CoSToast
          message={toast.message}
          tone={toast.tone}
          href={toast.href}
          hrefLabel={toast.hrefLabel}
          onDismiss={() => setToast(null)}
        />
      ) : null}
    </div>
  );
}
