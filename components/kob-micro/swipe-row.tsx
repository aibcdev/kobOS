"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/kob/utils";

type SwipeAction = {
  id: string;
  label: string;
  tone?: "primary" | "danger" | "muted";
};

type SwipeRowProps = {
  children: React.ReactNode;
  actions: SwipeAction[];
  onAction: (id: string) => void;
  className?: string;
};

const swipeQuery = "(max-width: 767px) and (prefers-reduced-motion: no-preference)";
function subscribe(callback: () => void) {
  const media = window.matchMedia(swipeQuery);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
const getSnapshot = () => window.matchMedia(swipeQuery).matches;
const getServerSnapshot = () => false;

/** Mobile swipe enhancement; every action always has a visible button fallback. */
export function SwipeRow(props: SwipeRowProps) {
  const enabled = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  // Reset the gesture and open state when the viewport or motion preference changes.
  return <SwipeRowContent key={String(enabled)} {...props} enabled={enabled} />;
}

function SwipeRowContent({ children, actions, onAction, className, enabled }: SwipeRowProps & { enabled: boolean }) {
  const [offset, setOffset] = useState(0);
  const tray = useRef<HTMLDivElement>(null);
  const gesture = useRef<{ id: number; x: number; y: number; horizontal: boolean } | null>(null);
  const suppressClick = useRef(false);
  const canSwipe = enabled && actions.length > 0 && actions.length <= 2;
  const open = offset > 0;

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOffset(0);
        gesture.current = null;
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  function select(id: string) {
    setOffset(0);
    onAction(id);
  }

  return (
    <div className={className}>
      <div className="relative overflow-hidden rounded-2xl">
        {canSwipe ? (
          <div ref={tray} className="absolute inset-y-0 right-0 flex max-w-full" aria-hidden={!open} inert={!open}>
            {actions.map((action) => (
              <button key={action.id} type="button" tabIndex={open ? 0 : -1}
                className={cn("min-h-11 w-24 min-w-0 break-words px-2 text-xs font-medium focus-visible:outline-2 focus-visible:outline-offset-[-4px]", action.tone === "muted" ? "bg-bone text-espresso" : "bg-espresso text-paper")}
                onClick={() => select(action.id)}>
                {action.label}
              </button>
            ))}
          </div>
        ) : null}
        <div className={cn("relative z-[1] rounded-2xl bg-paper", canSwipe && "select-none")}
          style={{ transform: `translateX(-${offset}px)`, transition: canSwipe ? "transform 220ms ease-out" : "none", touchAction: canSwipe ? "pan-y pinch-zoom" : "auto" }}
          onPointerDown={(event) => {
            suppressClick.current = false;
            if (!canSwipe || !event.isPrimary || event.button !== 0) return;
            if ((event.target as HTMLElement).closest("button, a, input, textarea, select")) return;
            gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, horizontal: false };
          }}
          onPointerMove={(event) => {
            const current = gesture.current;
            if (!current || current.id !== event.pointerId) return;
            const dx = event.clientX - current.x;
            const dy = event.clientY - current.y;
            if (!current.horizontal) {
              if (Math.abs(dy) > 10 && Math.abs(dy) >= Math.abs(dx)) {
                gesture.current = null;
                return;
              }
              if (Math.abs(dx) < 10 || Math.abs(dx) <= Math.abs(dy)) return;
              current.horizontal = true;
              event.currentTarget.setPointerCapture(event.pointerId);
              suppressClick.current = true;
            }
          }}
          onPointerUp={(event) => {
            const current = gesture.current;
            if (!current || current.id !== event.pointerId) return;
            if (current.horizontal) {
              const dx = event.clientX - current.x;
              if (dx < -48) setOffset(tray.current?.getBoundingClientRect().width ?? 0);
              if (dx > 24) setOffset(0);
            }
            gesture.current = null;
          }}
          onPointerCancel={() => { gesture.current = null; }}
          onLostPointerCapture={() => { gesture.current = null; }}
          onClickCapture={(event) => {
            if (suppressClick.current) {
              event.preventDefault();
              event.stopPropagation();
              suppressClick.current = false;
            }
          }}>
          {children}
        </div>
      </div>
      {actions.length ? (
        <div className="mt-3 flex flex-wrap gap-2 px-1">
          {actions.map((action) => (
            <button key={action.id} type="button"
              className={cn("min-h-11 rounded-full px-3.5 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2", action.tone === "muted" ? "border border-line bg-paper text-espresso" : "bg-espresso text-paper")}
              onClick={() => select(action.id)}>
              {action.label}
            </button>
          ))}
          {canSwipe ? <p className="w-full text-[0.65rem] text-muted">Or swipe left on the card</p> : null}
        </div>
      ) : null}
    </div>
  );
}
