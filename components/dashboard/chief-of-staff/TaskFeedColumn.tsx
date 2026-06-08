"use client";

import type { ChiefOfStaffTaskDto } from "@/lib/chief-of-staff/types";
import { cosCard, cosSectionLabel } from "@/lib/dashboard/chief-of-staff-theme";
import { TaskRow } from "@/components/dashboard/chief-of-staff/TaskRow";
import Link from "next/link";

export function TaskFeedColumn({
  tasks,
  restaurantName,
  onApprove,
  busyId,
  highlightId,
  taskRefs,
}: {
  tasks: ChiefOfStaffTaskDto[];
  restaurantName: string;
  onApprove: (id: string) => void;
  busyId?: string | null;
  highlightId?: string | null;
  taskRefs?: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
}) {
  return (
    <section className={`${cosCard} flex max-h-[calc(100vh-8rem)] flex-col p-5`}>
      <p className={cosSectionLabel}>Tasks</p>
      <p className="mt-1 text-sm text-[#666]">{tasks.filter((t) => t.status === "PENDING").length} awaiting approval</p>
      <div className="mt-4 flex-1 overflow-y-auto pr-1">
        {tasks.length ? (
          tasks.map((t) => (
            <div
              key={t.id}
              ref={(el) => {
                if (taskRefs) taskRefs.current[t.id] = el;
              }}
              className={highlightId === t.id ? "rounded-lg bg-[#f0fdf4] ring-1 ring-[var(--color-primary)]" : undefined}
            >
              <TaskRow task={t} onApprove={onApprove} busy={busyId === t.id} />
            </div>
          ))
        ) : (
          <p className="text-sm text-[#888]">
            No tasks yet.{" "}
            <Link href="/audit" className="font-medium text-[var(--color-primary)] underline underline-offset-2">
              Run a scan for {restaurantName}
            </Link>
          </p>
        )}
      </div>
    </section>
  );
}
