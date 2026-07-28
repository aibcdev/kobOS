#!/usr/bin/env python3
"""Snapshot KOB B2B Ads metrics, then ingest into MarketingFunnelEvent.

Usage:
  python ads/funnel_snapshot.py
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CUSTOMER = "2075308048"
DEFAULT_CAMPAIGN = "24071695854"


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--customer-id", default=DEFAULT_CUSTOMER)
    p.add_argument("--campaign-id", default=DEFAULT_CAMPAIGN)
    args = p.parse_args()
    cid = args.customer_id.replace("-", "")
    camp = args.campaign_id

    raw = subprocess.check_output(
        ["gads", "campaigns", "list", "-c", cid, "-o", "json"],
        text=True,
    )
    rows = json.loads(raw)
    row = next((r for r in rows if str(r.get("campaign.id")) == str(camp)), None)
    if not row:
        print(f"Campaign {camp} not found on {cid}", file=sys.stderr)
        sys.exit(1)

    payload = {
        "customerId": cid,
        "campaignId": camp,
        "campaignName": row.get("campaign.name"),
        "status": row.get("campaign.status"),
        "impressions": int(row.get("metrics.impressions") or 0),
        "clicks": int(row.get("metrics.clicks") or 0),
        "costMicros": int(row.get("metrics.costMicros") or 0),
        "ctr": row.get("metrics.ctr"),
    }
    out = ROOT / "downloads" / "outbound" / "ads-funnel-snapshot.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(payload, indent=2) + "\n")
    print(json.dumps(payload, indent=2))

    ingest = subprocess.run(
        ["npx", "tsx", "scripts/ads-funnel-ingest.ts"],
        cwd=str(ROOT),
    )
    sys.exit(ingest.returncode)


if __name__ == "__main__":
    main()
