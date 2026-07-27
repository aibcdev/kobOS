#!/usr/bin/env python3
"""Open-source DuckDuckGo/Bing search via `ddgs` — no Browserbase/Serper required.

Usage:
  python scripts/ddgs-search.py "Restaurant Name City Instagram"
Prints JSON: [{ "title", "href", "body" }, ...]
"""
from __future__ import annotations

import json
import sys


def main() -> int:
    query = " ".join(sys.argv[1:]).strip()
    if not query:
        print("[]")
        return 0

    try:
        from ddgs import DDGS
    except ImportError:
        print(
            "Missing dependency: pip install ddgs\n"
            "Or: python3 -m venv .venv-ig && .venv-ig/bin/pip install ddgs",
            file=sys.stderr,
        )
        return 2

    # Prefer html/lite DuckDuckGo backends; fall back to auto (may use Bing).
    backends = ["html", "lite", "auto"]
    last_err: Exception | None = None
    for backend in backends:
        try:
            results = list(
                DDGS().text(
                    query,
                    region="uk-en",
                    safesearch="off",
                    max_results=10,
                    backend=backend,
                )
            )
            if results:
                out = [
                    {
                        "title": r.get("title") or "",
                        "href": r.get("href") or r.get("link") or "",
                        "body": r.get("body") or r.get("description") or "",
                    }
                    for r in results
                ]
                print(json.dumps(out, ensure_ascii=False))
                return 0
        except Exception as e:  # noqa: BLE001 — try next backend
            last_err = e
            continue

    if last_err:
        print(f"ddgs failed: {last_err}", file=sys.stderr)
        return 1
    print("[]")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
