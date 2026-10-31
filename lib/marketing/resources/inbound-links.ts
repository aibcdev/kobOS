import { listResourceArticles } from "./index";
import { articlePath } from "./types";

export type InboundLink = { href: string; anchor: string };

/** Guides that asked to be linked from `path` (their linkFrom), so a ranking page can pass readers on. */
export function getInboundLinks(path: string): InboundLink[] {
  return listResourceArticles().flatMap((a) =>
    (a.linkFrom ?? []).filter((l) => l.path === path).map((l) => ({ href: articlePath(a.slug), anchor: l.anchor })),
  );
}
