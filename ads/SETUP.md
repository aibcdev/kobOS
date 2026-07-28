# KOB Google Ads — share Woods `gads` auth

KOB uses the **same Google Ads API credentials** as Woods (`~/.gads`).

For a **KOB public advertiser name**, use a **dedicated Ads account** under an MCC (not the shared Woods/Agentwood account).

## Landing URL (Ads)

Use this final URL in Search ads:

```
https://trykob.com/go/audit
```

Optional tracked variant:

```
https://trykob.com/go/audit?utm_source=google&utm_medium=cpc&utm_campaign=kob_b2b_audit
```

Aliases `/ads/audit` and `/google/audit` redirect here. Product path `/audit` stays for organic / in-product links.

## Auth (already set up)

```bash
~/.gads/config.yaml
~/.gads/credentials.json

gads account info
gads campaigns list
```

Shared legacy account: `5503152844` (USD).

**Live KOB account:** `207-530-8048` (GBP, Europe/London) — campaign `KOB — B2B Audit Search` id `24071695854`.  
**MCC (subtry):** `853-638-8742` (optional; API user has direct Admin on KOB).

## Dedicated KOB account (required for advertiser name)

Explorer developer tokens **cannot** create accounts via API (`CreateCustomerClient`). Create in UI:

1. Open [Create / open MCC](https://ads.google.com/nav/selectaccount?sf=manager_account)
2. MCC → **Accounts** → **+** → **Create new account**
   - Name: `KOB`
   - Currency: **USD**
   - Time zone: `Europe/London`
3. Copy the new customer ID
4. (Optional) Link old account `550-315-2844` under the same MCC

Then republish:

```bash
cd /Users/akeemojuko/KOB
/Users/akeemojuko/.gemini/antigravity/scratch/Woods/ads/.venv/bin/python \
  ads/republish_kob_to_account.py \
  --customer-id NEW_KOB_ID \
  --login-customer-id MCC_ID \
  --budget 20 --enable
```

That script creates the Search campaign on the new account and pauses the old shared-account campaign.

## Advertiser verification (public name)

On the **KOB** account only:

**Admin → Policy → Advertiser verification**

- With DBA/trade name docs → verify as **KOB** / trykob
- Without DBA → verify as **Drafted AI Inc.** (legal name)

## Launch on shared account (legacy)

```bash
npm run ads:b2b-publish -- --budget 20 --enable
```

Prefer the dedicated-account path above.
