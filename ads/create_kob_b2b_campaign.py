#!/usr/bin/env python3
"""Create KOB B2B Audit Search campaign via Google Ads API.

Reuses the same CLI auth as Woods:
  ~/.gads/config.yaml + ~/.gads/credentials.json  (from `gads init`)

Usage:
  # Prefer Woods ads venv (already has google-ads):
  /Users/akeemojuko/.gemini/antigravity/scratch/Woods/ads/.venv/bin/python \\
    ads/create_kob_b2b_campaign.py --dry-run
  /Users/akeemojuko/.gemini/antigravity/scratch/Woods/ads/.venv/bin/python \\
    ads/create_kob_b2b_campaign.py --budget 10 --enable
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

try:
    from google.ads.googleads.client import GoogleAdsClient
    from google.ads.googleads.errors import GoogleAdsException
except ImportError:
    print(
        "Install google-ads first, e.g. use Woods ads venv:\n"
        "  /Users/akeemojuko/.gemini/antigravity/scratch/Woods/ads/.venv/bin/python "
        "ads/create_kob_b2b_campaign.py --dry-run",
        file=sys.stderr,
    )
    sys.exit(1)

ROOT = Path(__file__).resolve().parent
PLAN_PATH = ROOT / "kob-b2b-plan.json"


def micros(usd: float) -> int:
    return int(round(usd * 1_000_000))


def build_client() -> tuple[GoogleAdsClient, str]:
    yaml_path = Path.home() / "google-ads.yaml"
    gads_cfg = Path.home() / ".gads" / "config.yaml"
    gads_creds = Path.home() / ".gads" / "credentials.json"

    if yaml_path.exists():
        import yaml

        client = GoogleAdsClient.load_from_storage(str(yaml_path))
        data = yaml.safe_load(yaml_path.read_text())
        cid = str(data.get("customer_id") or data.get("login_customer_id") or "").replace("-", "")
        if not cid:
            raise SystemExit("Add customer_id to ~/google-ads.yaml")
        return client, cid

    if gads_cfg.exists():
        import yaml

        cfg = yaml.safe_load(gads_cfg.read_text())
        refresh = ""
        if gads_creds.exists():
            refresh = json.loads(gads_creds.read_text()).get("refresh_token", "")
        config = {
            "developer_token": cfg["developer_token"],
            "client_id": cfg["client_id"],
            "client_secret": cfg["client_secret"],
            "refresh_token": refresh,
            "use_proto_plus": True,
        }
        if cfg.get("login_customer_id"):
            config["login_customer_id"] = str(cfg["login_customer_id"]).replace("-", "")
        client = GoogleAdsClient.load_from_dict(config)
        cid = str(cfg["customer_id"]).replace("-", "")
        return client, cid

    raise SystemExit("No credentials. Run `gads init` (same as Woods) — see ads/SETUP.md")


def create_budget(client: GoogleAdsClient, customer_id: str, amount_usd: float, name: str) -> str:
    svc = client.get_service("CampaignBudgetService")
    op = client.get_type("CampaignBudgetOperation")
    budget = op.create
    budget.name = f"{name} ${amount_usd:.0f}/day"
    budget.amount_micros = micros(amount_usd)
    budget.delivery_method = client.enums.BudgetDeliveryMethodEnum.STANDARD
    budget.explicitly_shared = False
    resp = svc.mutate_campaign_budgets(customer_id=customer_id, operations=[op])
    return resp.results[0].resource_name


def create_campaign(
    client: GoogleAdsClient,
    customer_id: str,
    budget_rn: str,
    name: str,
    *,
    enabled: bool,
) -> str:
    svc = client.get_service("CampaignService")
    op = client.get_type("CampaignOperation")
    c = op.create
    c.name = name
    c.advertising_channel_type = client.enums.AdvertisingChannelTypeEnum.SEARCH
    c.status = (
        client.enums.CampaignStatusEnum.ENABLED
        if enabled
        else client.enums.CampaignStatusEnum.PAUSED
    )
    c.campaign_budget = budget_rn
    c.network_settings.target_google_search = True
    c.network_settings.target_search_network = False
    c.network_settings.target_content_network = False
    c.contains_eu_political_advertising = (
        client.enums.EuPoliticalAdvertisingStatusEnum.DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING
    )
    # Manual CPC until Google Ads conversion actions are wired for trykob.
    c.manual_cpc.enhanced_cpc_enabled = False
    resp = svc.mutate_campaigns(customer_id=customer_id, operations=[op])
    return resp.results[0].resource_name


def add_geos(client: GoogleAdsClient, customer_id: str, campaign_rn: str, geos: dict[str, int]) -> None:
    svc = client.get_service("CampaignCriterionService")
    ops = []
    for name, geo_id in geos.items():
        op = client.get_type("CampaignCriterionOperation")
        crit = op.create
        crit.campaign = campaign_rn
        crit.location.geo_target_constant = client.get_service(
            "GeoTargetConstantService"
        ).geo_target_constant_path(geo_id)
        ops.append(op)
        print(f"  + geo {name} ({geo_id})")
    # English
    op = client.get_type("CampaignCriterionOperation")
    crit = op.create
    crit.campaign = campaign_rn
    crit.language.language_constant = client.get_service("GoogleAdsService").language_constant_path(
        1000
    )
    ops.append(op)
    print("  + language English")
    svc.mutate_campaign_criteria(customer_id=customer_id, operations=ops)


def add_negatives(
    client: GoogleAdsClient, customer_id: str, campaign_rn: str, negatives: list[str]
) -> int:
    svc = client.get_service("CampaignCriterionService")
    ops = []
    for n in negatives:
        op = client.get_type("CampaignCriterionOperation")
        crit = op.create
        crit.campaign = campaign_rn
        crit.negative = True
        crit.keyword.text = n
        crit.keyword.match_type = client.enums.KeywordMatchTypeEnum.BROAD
        ops.append(op)
    if not ops:
        return 0
    total = 0
    for i in range(0, len(ops), 100):
        resp = svc.mutate_campaign_criteria(
            customer_id=customer_id, operations=ops[i : i + 100]
        )
        total += len(resp.results)
    return total


def create_ad_group(
    client: GoogleAdsClient, customer_id: str, campaign_rn: str, name: str, cpc_usd: float
) -> str:
    svc = client.get_service("AdGroupService")
    op = client.get_type("AdGroupOperation")
    ag = op.create
    ag.name = name
    ag.campaign = campaign_rn
    ag.status = client.enums.AdGroupStatusEnum.ENABLED
    ag.type_ = client.enums.AdGroupTypeEnum.SEARCH_STANDARD
    ag.cpc_bid_micros = micros(cpc_usd)
    resp = svc.mutate_ad_groups(customer_id=customer_id, operations=[op])
    return resp.results[0].resource_name


def add_keywords(
    client: GoogleAdsClient,
    customer_id: str,
    ad_group_rn: str,
    keywords: list[dict],
) -> int:
    svc = client.get_service("AdGroupCriterionService")
    mt_map = {
        "EXACT": client.enums.KeywordMatchTypeEnum.EXACT,
        "PHRASE": client.enums.KeywordMatchTypeEnum.PHRASE,
        "BROAD": client.enums.KeywordMatchTypeEnum.BROAD,
    }
    ops = []
    for kw in keywords:
        op = client.get_type("AdGroupCriterionOperation")
        crit = op.create
        crit.ad_group = ad_group_rn
        crit.status = client.enums.AdGroupCriterionStatusEnum.ENABLED
        crit.keyword.text = kw["text"]
        crit.keyword.match_type = mt_map[kw["matchType"]]
        ops.append(op)
    total = 0
    for i in range(0, len(ops), 100):
        resp = svc.mutate_ad_group_criteria(
            customer_id=customer_id, operations=ops[i : i + 100]
        )
        total += len(resp.results)
    return total


def create_rsa(
    client: GoogleAdsClient,
    customer_id: str,
    ad_group_rn: str,
    final_url: str,
    headlines: list[str],
    descriptions: list[str],
    path1: str,
    path2: str,
) -> str:
    svc = client.get_service("AdGroupAdService")
    op = client.get_type("AdGroupAdOperation")
    adga = op.create
    adga.ad_group = ad_group_rn
    adga.status = client.enums.AdGroupAdStatusEnum.ENABLED
    ad = adga.ad
    ad.final_urls.append(final_url)
    ad.responsive_search_ad.path1 = path1[:15]
    ad.responsive_search_ad.path2 = path2[:15]
    for h in headlines[:15]:
        asset = client.get_type("AdTextAsset")
        asset.text = h[:30]
        ad.responsive_search_ad.headlines.append(asset)
    for d in descriptions[:4]:
        asset = client.get_type("AdTextAsset")
        asset.text = d[:90]
        ad.responsive_search_ad.descriptions.append(asset)
    resp = svc.mutate_ad_group_ads(customer_id=customer_id, operations=[op])
    return resp.results[0].resource_name


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--budget", type=float, default=20.0)
    parser.add_argument("--cpc", type=float, default=1.50, help="Starting max CPC USD")
    parser.add_argument(
        "--enable",
        action="store_true",
        help="Create campaign ENABLED (default: PAUSED)",
    )
    args = parser.parse_args()
    plan = json.loads(PLAN_PATH.read_text())

    print(f"Campaign: {plan['campaign']}")
    print(f"Ad groups: {len(plan['ad_groups'])}")
    print(f"Keywords: {sum(len(g['keywords']) for g in plan['ad_groups'])}")
    print(f"Budget: ${args.budget}/day")
    print(f"Geos: {', '.join(plan['geos'])}")
    print(f"Landing: {plan['landing']}")
    print(f"Status: {'ENABLED' if args.enable else 'PAUSED'}")

    if args.dry_run:
        for g in plan["ad_groups"]:
            print(f"  • {g['name']}: {len(g['keywords'])} kws, {len(g['headlines'])} headlines")
        print("Dry run only — no API calls.")
        return

    client, customer_id = build_client()
    print(f"Customer: {customer_id} (shared with Woods / Agentwood / Shortwood)")

    try:
        budget_rn = create_budget(client, customer_id, args.budget, plan["campaign"])
        print(f"Budget: {budget_rn}")
        campaign_rn = create_campaign(
            client, customer_id, budget_rn, plan["campaign"], enabled=args.enable
        )
        print(f"Campaign: {campaign_rn}")
        add_geos(client, customer_id, campaign_rn, plan["geos"])
        n_neg = add_negatives(client, customer_id, campaign_rn, plan["negatives"])
        print(f"  + {n_neg} negatives")

        for group in plan["ad_groups"]:
            ag_rn = create_ad_group(client, customer_id, campaign_rn, group["name"], args.cpc)
            n = add_keywords(client, customer_id, ag_rn, group["keywords"])
            create_rsa(
                client,
                customer_id,
                ag_rn,
                plan["landing"],
                group["headlines"],
                group["descriptions"],
                group["path1"],
                group["path2"],
            )
            print(f"  ✓ {group['name']} — {n} keywords + RSA")

        cid = campaign_rn.split("/")[-1]
        print("\nDone.")
        if args.enable:
            print(f"LIVE: campaign {cid} at ${args.budget}/day")
        else:
            print("Campaign is PAUSED. Enable with:")
            print(f"  gads campaigns enable {cid}")
        print("  gads campaigns list")
    except GoogleAdsException as ex:
        print("Google Ads API error:", file=sys.stderr)
        for err in ex.failure.errors:
            print(f"  {err.error_code}: {err.message}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
