"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { TodayBriefPayload, ChiefOfStaffTaskDto } from "@/lib/chief-of-staff/types";
import type { AiPersonality } from "@prisma/client";
import { ActionCardsColumn } from "@/components/dashboard/chief-of-staff/ActionCardsColumn";
import { CoSToast } from "@/components/dashboard/chief-of-staff/CoSToast";
import { NeedToKnowCard } from "@/components/dashboard/chief-of-staff/NeedToKnowCard";
import { PersonalitySelect } from "@/components/dashboard/chief-of-staff/PersonalitySelect";
import { ReviewDrawer } from "@/components/dashboard/chief-of-staff/ReviewDrawer";
import { SuggestionsCard } from "@/components/dashboard/chief-of-staff/SuggestionsCard";
import { TaskFeedColumn } from "@/components/dashboard/chief-of-staff/TaskFeedColumn";
import { TaskInputBar } from "@/components/dashboard/chief-of-staff/TaskInputBar";
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
  const [reviewTaskId, setReviewTaskId] = useState<string | null>(null);
  const taskRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const reviewTask = useMemo(
    () => (reviewTaskId ? brief.tasks.find((t) => t.id === reviewTaskId) ?? null : null),
    [brief.tasks, reviewTaskId],
  );

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
      // Optimistic: tick the box immediately — don't wait for AI.
      const prevTasks = brief.tasks;
      setBrief((b) => ({
        ...b,
        tasks: b.tasks.map((t) => (t.id === taskId ? { ...t, status: "APPROVED" as const } : t)),
      }));
      setReviewTaskId(null);
      setBusyId(taskId);
      try {
        const res = await fetch(`/api/chief-of-staff/tasks/${taskId}/approve`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ restaurantId }),
        });
        const body = (await res.json()) as { message?: string; nextHref?: string; error?: string };
        if (res.ok) {
          showToast({
            message: body.message ?? "Approved.",
            tone: "success",
            href: body.nextHref,
            hrefLabel: "Content",
          });
        } else {
          setBrief((b) => ({ ...b, tasks: prevTasks }));
          showToast({
            message: body.message ?? body.error ?? "Could not approve.",
            tone: "error",
            href: body.nextHref,
            hrefLabel: "Settings",
          });
        }
      } catch {
        setBrief((b) => ({ ...b, tasks: prevTasks }));
        showToast({ message: "Could not approve — try again.", tone: "error" });
      } finally {
        setBusyId(null);
      }
    },
    [brief.tasks, previewMode, restaurantId, showToast],
  );

  const dismissTask = useCallback(
    async (taskId: string) => {
      if (previewMode) {
        showToast({ message: "Preview mode — dismiss works after sign-in.", tone: "info" });
        return;
      }
      const prevTasks = brief.tasks;
      setBrief((b) => ({ ...b, tasks: b.tasks.filter((t) => t.id !== taskId) }));
      setReviewTaskId(null);
      setBusyId(taskId);
      try {
        const res = await fetch(`/api/chief-of-staff/tasks/${taskId}/dismiss`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ restaurantId }),
        });
        if (res.ok) {
          showToast({ message: "Task dismissed.", tone: "info" });
        } else {
          setBrief((b) => ({ ...b, tasks: prevTasks }));
          showToast({ message: "Could not dismiss the task.", tone: "error" });
        }
      } catch {
        setBrief((b) => ({ ...b, tasks: prevTasks }));
        showToast({ message: "Could not dismiss — try again.", tone: "error" });
      } finally {
        setBusyId(null);
      }
    },
    [brief.tasks, previewMode, restaurantId, showToast],
  );

  const onTaskPending = useCallback((text: string) => {
    const placeholder: ChiefOfStaffTaskDto = {
      id: `pending-${Date.now()}`,
      title: text.slice(0, 80),
      detail: "Preparing your task…",
      category: "OPERATIONS",
      source: "MANUAL",
      status: "PENDING",
      impactLabel: "Your request",
      estimatedMinutes: 5,
      confidenceScore: 0,
      revenueLowGbp: null,
      revenueHighGbp: null,
      requiresIntegration: null,
      auditId: null,
      conversationId: null,
      draft: null,
    };
    setBrief((b) => ({
      ...b,
      tasks: [placeholder, ...b.tasks.filter((t) => !t.id.startsWith("pending-"))],
    }));
    setHighlightId(placeholder.id);
  }, []);

  const onTaskCreated = useCallback(
    (task: ChiefOfStaffTaskDto) => {
      setBrief((b) => ({
        ...b,
        tasks: [task, ...b.tasks.filter((t) => !t.id.startsWith("pending-"))],
        summary: { ...b.summary, taskCount: b.summary.taskCount + 1 },
      }));
      setHighlightId(task.id);
      window.setTimeout(() => setHighlightId(null), 2500);
      if (task.draft) {
        setReviewTaskId(task.id);
        showToast({ message: "Task created — draft ready to review.", tone: "success" });
      } else {
        showToast({ message: "Task added to your list.", tone: "success" });
      }
    },
    [showToast],
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

  const onSuggestionDoIt = useCallback(
    async (suggestion: string) => {
      if (previewMode) {
        showToast({ message: "Preview mode — suggestions work after sign-in.", tone: "info" });
        return;
      }
      const needle = suggestion.toLowerCase();
      const match = brief.tasks.find(
        (t) =>
          t.status === "PENDING" &&
          (t.title.toLowerCase().includes(needle.slice(0, 12)) || needle.includes(t.title.toLowerCase().slice(0, 12))),
      );
      if (match) {
        scrollToTask(match.id);
        return;
      }
      onTaskPending(suggestion);
      showToast({ message: "Creating task…", tone: "info" });
      try {
        const res = await fetch("/api/chief-of-staff/tasks/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ restaurantId, text: suggestion }),
        });
        const body = (await res.json()) as { task?: ChiefOfStaffTaskDto };
        if (res.ok && body.task) {
          onTaskCreated(body.task);
        } else {
          showToast({ message: "Could not create that task.", tone: "error" });
        }
      } catch {
        showToast({ message: "Could not create that task.", tone: "error" });
      }
    },
    [brief.tasks, onTaskCreated, onTaskPending, previewMode, restaurantId, scrollToTask, showToast],
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
        <div className="lg:col-span-8 xl:col-span-9">
          <div className="mx-auto max-w-3xl">
            <ActionCardsColumn
              greeting={brief.greeting}
              summary={brief.summary}
              onApproveHoliday={approveHoliday}
              onApproveTopFix={focusFirstAuditTask}
              holidayBusy={holidayBusy}
            />

            <div className="mt-6">
              <TaskInputBar
                restaurantId={restaurantId}
                previewMode={previewMode}
                onPending={onTaskPending}
                onTaskCreated={onTaskCreated}
                onError={(message) => {
                  setBrief((b) => ({ ...b, tasks: b.tasks.filter((t) => !t.id.startsWith("pending-")) }));
                  showToast({ message, tone: "error" });
                }}
              />
            </div>

            <div className="mt-6">
              <TaskFeedColumn
                tasks={brief.tasks}
                restaurantName={restaurantName}
                onApprove={approveTask}
                onReview={setReviewTaskId}
                busyId={busyId}
                highlightId={highlightId}
                taskRefs={taskRefs}
              />
            </div>

            <div className="mt-5">
              <PersonalitySelect
                value={brief.aiPersonality}
                onChange={onPersonalityChange}
                disabled={previewMode || personalitySaving}
              />
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 xl:col-span-3">
          <aside className="flex flex-col gap-5">
            <NeedToKnowCard items={brief.summary.needToKnow} />
            <SuggestionsCard suggestions={brief.summary.suggestions} onDoIt={onSuggestionDoIt} />
          </aside>
        </div>
      </div>

      {reviewTask ? (
        <ReviewDrawer
          task={reviewTask}
          restaurantId={restaurantId}
          busy={busyId === reviewTask.id}
          onApprove={(id) => void approveTask(id)}
          onDismiss={(id) => void dismissTask(id)}
          onClose={() => setReviewTaskId(null)}
        />
      ) : null}

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
