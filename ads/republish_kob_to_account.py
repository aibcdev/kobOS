#!/usr/bin/env python3
"""Republish KOB B2B campaign into a dedicated Ads account, then pause the old one.

Prereqs (UI — Explorer developer token cannot CreateCustomerClient):
  1. Create / open MCC: https://ads.google.com/nav/selectaccount?sf=manager_account
  2. Under MCC → Accounts → Create new account:
       Name: KOB
       Currency: USD
       Time zone: Europe/London (or America/New_York)
  3. Copy the new 10-digit customer ID

Then:
  python ads/republish_kob_to_account.py \\
    --customer-id NEW_ID \\
    --login-customer-id MCC_ID \\
    --budget 20 --enable

  # Old shared-account campaign 24069925836 is paused by default.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from google.ads.googleads.client import GoogleAdsClient
from google.ads.googleads.errors import GoogleAdsException
from google.protobuf import field_mask_pb2

ROOT = Path(__file__).resolve().parent
PLAN_PATH = ROOT / "kob-b2b-plan.json"
OLD_CUSTOMER_ID = "5503152844"
OLD_CAMPAIGN_ID = "24069925836"


def micros(usd: float) -> int:
    return int(round(usd * 1_000_000))


def build_client(login_customer_id: str | None) -> GoogleAdsClient:
    import yaml

    cfg = yaml.safe_load((Path.home() / ".gads" / "config.yaml").read_text())
    refresh = json.loads((Path.home() / ".gads" / "credentials.json").read_text())[
        "refresh_token"
    ]
    config = {
        "developer_token": cfg["developer_token"],
        "client_id": cfg["client_id"],
        "client_secret": cfg["client_secret"],
        "refresh_token": refresh,
        "use_proto_plus": True,
    }
    login = login_customer_id or cfg.get("login_customer_id")
    if login:
        config["login_customer_id"] = str(login).replace("-", "")
    return GoogleAdsClient.load_from_dict(config)


def pause_old(client: GoogleAdsClient) -> None:
    ga = client.get_service("GoogleAdsService")
    # Old account mutations: if login_customer_id is MCC, still target old customer
    rows = list(
        ga.search(
            customer_id=OLD_CUSTOMER_ID,
            query=f"""
              SELECT campaign.resource_name, campaign.status, campaign.name
              FROM campaign WHERE campaign.id = {OLD_CAMPAIGN_ID}
            """,
        )
    )
    if not rows:
        print(f"Old campaign {OLD_CAMPAIGN_ID} not found on {OLD_CUSTOMER_ID}")
        return
    row = rows[0]
    print(f"Old: {row.campaign.name} status={row.campaign.status.name}")
    if row.campaign.status.name == "PAUSED":
        print("Old campaign already paused")
        return
    svc = client.get_service("CampaignService")
    op = client.get_type("CampaignOperation")
    op.update.resource_name = row.campaign.resource_name
    op.update.status = client.enums.CampaignStatusEnum.PAUSED
    op.update_mask.CopyFrom(field_mask_pb2.FieldMask(paths=["status"]))
    svc.mutate_campaigns(customer_id=OLD_CUSTOMER_ID, operations=[op])
    print(f"Paused old campaign {OLD_CAMPAIGN_ID}")


def create_budget(client: GoogleAdsClient, customer_id: str, amount: float, name: str) -> str:
    svc = client.get_service("CampaignBudgetService")
    op = client.get_type("CampaignBudgetOperation")
    b = op.create
    b.name = f"{name} ${amount:.0f}/day"
    b.amount_micros = micros(amount)
    b.delivery_method = client.enums.BudgetDeliveryMethodEnum.STANDARD
    b.explicitly_shared = False
    return svc.mutate_campaign_budgets(customer_id=customer_id, operations=[op]).results[
        0
    ].resource_name


def create_campaign(
    client: GoogleAdsClient, customer_id: str, budget_rn: str, name: str, *, enabled: bool
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
    c.manual_cpc.enhanced_cpc_enabled = False
    return svc.mutate_campaigns(customer_id=customer_id, operations=[op]).results[0].resource_name


def add_geos(client: GoogleAdsClient, customer_id: str, campaign_rn: str, geos: dict) -> None:
    svc = client.get_service("CampaignCriterionService")
    ops = []
    geo_svc = client.get_service("GeoTargetConstantService")
    for name, geo_id in geos.items():
        op = client.get_type("CampaignCriterionOperation")
        crit = op.create
        crit.campaign = campaign_rn
        crit.location.geo_target_constant = geo_svc.geo_target_constant_path(geo_id)
        ops.append(op)
        print(f"  + geo {name}")
    op = client.get_type("CampaignCriterionOperation")
    crit = op.create
    crit.campaign = campaign_rn
    crit.language.language_constant = client.get_service("GoogleAdsService").language_constant_path(
        1000
    )
    ops.append(op)
    svc.mutate_campaign_criteria(customer_id=customer_id, operations=ops)


def add_negatives(client: GoogleAdsClient, customer_id: str, campaign_rn: str, negatives: list) -> None:
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
    for i in range(0, len(ops), 100):
        svc.mutate_campaign_criteria(customer_id=customer_id, operations=ops[i : i + 100])
    print(f"  + {len(ops)} negatives")


def create_ad_group(
    client: GoogleAdsClient, customer_id: str, campaign_rn: str, name: str, cpc: float
) -> str:
    svc = client.get_service("AdGroupService")
    op = client.get_type("AdGroupOperation")
    ag = op.create
    ag.name = name
    ag.campaign = campaign_rn
    ag.status = client.enums.AdGroupStatusEnum.ENABLED
    ag.type_ = client.enums.AdGroupTypeEnum.SEARCH_STANDARD
    ag.cpc_bid_micros = micros(cpc)
    return svc.mutate_ad_groups(customer_id=customer_id, operations=[op]).results[0].resource_name


def add_keywords(client: GoogleAdsClient, customer_id: str, ad_group_rn: str, keywords: list) -> int:
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
    headlines: list,
    descriptions: list,
    path1: str,
    path2: str,
) -> None:
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
    svc.mutate_ad_group_ads(customer_id=customer_id, operations=[op])


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--customer-id", required=True, help="New KOB Ads account ID")
    parser.add_argument(
        "--login-customer-id",
        default=None,
        help="MCC ID (required when operating through a manager)",
    )
    parser.add_argument("--budget", type=float, default=20.0)
    parser.add_argument("--cpc", type=float, default=1.50)
    parser.add_argument("--enable", action="store_true")
    parser.add_argument("--keep-old", action="store_true", help="Do not pause old campaign")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    plan = json.loads(PLAN_PATH.read_text())
    customer_id = str(args.customer_id).replace("-", "")
    print(f"Target account: {customer_id}")
    print(f"MCC login: {args.login_customer_id or '(none / direct)'}")
    print(f"Budget: ${args.budget}/day  enable={args.enable}")

    if args.dry_run:
        print("Dry run only.")
        return

    client = build_client(args.login_customer_id)

    try:
        budget_rn = create_budget(client, customer_id, args.budget, plan["campaign"])
        print("Budget", budget_rn)
        campaign_rn = create_campaign(
            client, customer_id, budget_rn, plan["campaign"], enabled=args.enable
        )
        print("Campaign", campaign_rn)
        add_geos(client, customer_id, campaign_rn, plan["geos"])
        add_negatives(client, customer_id, campaign_rn, plan["negatives"])
        for group in plan["ad_groups"]:
            ag = create_ad_group(client, customer_id, campaign_rn, group["name"], args.cpc)
            n = add_keywords(client, customer_id, ag, group["keywords"])
            create_rsa(
                client,
                customer_id,
                ag,
                plan["landing"],
                group["headlines"],
                group["descriptions"],
                group["path1"],
                group["path2"],
            )
            print(f"  ✓ {group['name']} — {n} keywords + RSA")

        if not args.keep_old:
            # Rebuild client without forcing MCC if old account is direct-access
            pause_client = build_client(None)
            pause_old(pause_client)

        print("\nDone. New campaign id:", campaign_rn.split("/")[-1])
        print("Next: Admin → Policy → Advertiser verification on the KOB account.")
    except GoogleAdsException as ex:
        for err in ex.failure.errors:
            print(f"ERR {err.error_code}: {err.message}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
