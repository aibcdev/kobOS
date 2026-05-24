/**
 * Shared Owner-style utility classes for app surfaces (dashboard, login).
 * Keeps tokens in sync with app/globals.css and marketing HomePage patterns.
 */

export const appCardSurface =
  "rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-[var(--spacing-lg)] text-[var(--color-body)]";

export const appBtnPrimary =
  "type-button inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-6 py-3 text-[var(--color-on-primary)] transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-[var(--color-primary-hover)] active:bg-[var(--color-primary-active)] disabled:opacity-50";

export const appBtnSecondary =
  "type-button inline-flex min-h-12 items-center justify-center rounded-[var(--radius-default)] bg-[var(--color-surface-soft)] px-5 py-3 text-[var(--color-ink)] ring-1 ring-inset ring-[var(--color-hairline)] transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-[var(--color-surface-warm)] disabled:opacity-50";

export const appBtnNav =
  "type-button inline-flex min-h-10 items-center justify-center rounded-[var(--radius-default)] bg-[var(--color-ink)] px-5 py-2.5 text-[var(--color-text-warm)] transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-[var(--color-surface-dark-hover)] disabled:opacity-50";

export const appInput =
  "type-body-md mt-1 w-full rounded-[var(--radius-default)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] px-4 py-3 text-[var(--color-ink)] outline-none transition-[box-shadow] duration-[var(--duration-fast)] placeholder:text-[var(--color-muted-medium)] focus:border-[var(--color-hairline)] focus:ring-2 focus:ring-[var(--color-accent)]/30";

export const appPillActive =
  "type-label-md rounded-[var(--radius-pill)] border border-[var(--color-ink)] bg-[var(--color-ink)] px-3 py-1.5 text-[var(--color-text-warm)] transition-colors";

export const appPillInactive =
  "type-label-md rounded-[var(--radius-pill)] border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] px-3 py-1.5 text-[var(--color-muted)] transition-colors hover:border-[var(--color-muted-medium)] hover:text-[var(--color-ink)]";

export const appLinkMuted =
  "type-body-sm text-[var(--color-muted)] underline underline-offset-2 transition-colors hover:text-[var(--color-ink)]";

export const appCodeInline =
  "rounded-[var(--radius-sm)] bg-[var(--color-muted-faint)] px-1.5 py-0.5 font-mono text-[13px] text-[var(--color-ink)]";
