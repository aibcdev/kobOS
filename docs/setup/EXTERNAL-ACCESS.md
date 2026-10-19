# External access tracker

Slow third-party approvals that gate KOB features. Start every item as early as possible; code ships behind
feature flags (`lib/flags.ts`, T-08) with recorded fixtures until each is approved.

Owner for all items: **Akeem** unless noted. Update the table when anything changes. "Decision N" refers to
`KOB_BUILD_SPEC.md` §17 (kept out of this public repo); all eight spec defaults were accepted on 18 Oct 2026.

| # | Item | Gates | Submitted | Status |
|---|------|-------|-----------|--------|
| 1 | Google Business Profile API access | Review replies, hours, posts, performance (`GBP_LIVE`) | — | Not started |
| 2 | Google OAuth app verification (`business.manage`, `calendar.readonly`) | Production GBP + Calendar consent without the "unverified app" screen | — | Not started |
| 2b | Gmail restricted-scope verification + CASA (optional, later) | `GMAIL_ENABLED` in production | — | Deferred (decision 4: invoices use forwarding address) |
| 3 | Meta Business verification, KOB WhatsApp number + display name, App Review (`whatsapp_business_messaging`, `whatsapp_business_management`); Tech Provider later | Owner WhatsApp channel (`WHATSAPP_LIVE`); guest inbox in Phase 5 | — | Not started |
| 4 | Instagram App Review (`instagram_business_content_publish`) | Direct Instagram publishing (`INSTAGRAM_PUBLISH_LIVE`) | — | Not started |
| 5 | Toast partner application | Toast writes beyond today's read access | — | Not started |
| 6 | ICO data protection fee | UK GDPR registration | — | Not started |
| 7 | US A2P 10DLC | US SMS only | — | Not needed in v1 (decision 8) |

---

## 1. Google Business Profile API access

**Why:** quota is 0 for every GBP API until Google approves the Cloud project. Review is about 14 days.

**Do:**
1. Use the Cloud project that owns `GOOGLE_OAUTH_CLIENT_ID`. Note its project number (Cloud Console → Dashboard) and
   set `GOOGLE_CLOUD_PROJECT_NUMBER` / `GOOGLE_CLOUD_PROJECT_ID` in Netlify.
2. Submit the "Business Profile APIs access request" form linked from
   <https://developers.google.com/my-business/content/prereqs>. You need: the project number, a `@trykob.com` email,
   the website (trykob.com), and a Business Profile that is verified and active (the prereqs page has asked for
   60+ days; check the current wording on the form).
3. Use-case text:

   > KOB is a SaaS assistant for independent restaurant owners. With the owner's OAuth consent we read their reviews
   > and post owner-approved replies, keep regular and holiday hours accurate, publish owner-approved posts, and show
   > the owner Performance metrics. We do not manage profiles we are not authorised for.

4. While waiting, enable these APIs in the project: My Business Account Management, My Business Business
   Information, Google My Business API (v4), Business Profile Performance, My Business Notifications, My Business
   Verifications, My Business Place Actions, Cloud Pub/Sub.

**How to check status:** Cloud Console → APIs & Services → each My Business API → Quotas. Quota **> 0** (e.g. 300
requests/minute) means approved. Google also emails the submitting address.

## 2. Google OAuth app verification

**Why:** `business.manage` and `calendar.readonly` need brand + scope verification for production users.

**Do:**
1. OAuth consent screen: app name KOB, `trykob.com` homepage, privacy policy and terms URLs, authorised domain
   `trykob.com`.
2. Add `https://www.googleapis.com/auth/business.manage` and `https://www.googleapis.com/auth/calendar.readonly`.
   Request `business.manage` in its own consent flow so GBP users never see Gmail scopes.
3. Record a demo video (connect Google → pick location → approve a review reply) and submit for verification.
4. Gmail (`gmail.readonly`) is a restricted scope: needs restricted-scope verification **and** an annual CASA
   assessment. Not started; Gmail stays optional behind `GMAIL_ENABLED`.

**How to check status:** Cloud Console → Google Auth Platform → Verification Center shows "Verification status".
"Verified" for brand and each sensitive scope means done.

## 3. Meta / WhatsApp

**Why:** the owner channel is WhatsApp-first; one KOB number (UK +44) for all owners (decision 3).

**Do:**
1. Meta Business Manager → Security Center → start business verification (company documents, trykob.com domain).
2. Create the Meta app (type Business), add the WhatsApp product, register the KOB number and request the display
   name "KOB".
3. App Review for `whatsapp_business_messaging` and `whatsapp_business_management` (screencast of an owner opting in
   and receiving a morning brief template).
4. Phase 5 only: apply for Tech Provider status for per-restaurant guest numbers (Embedded Signup).

Note: WhatsApp Business Solution Terms (from 15 Jan 2026) ban general-purpose AI assistants. KOB on WhatsApp must stay
a restaurant-operations assistant.

**How to check status:** Business Settings → Security Center shows "Verified". WhatsApp Manager → Phone numbers shows
display name status "Approved". App Dashboard → App Review → Permissions shows "Advanced access" for both permissions.

## 4. Instagram App Review

**Do:** in the same Meta app, add Instagram (Instagram Login) and request `instagram_business_basic` +
`instagram_business_content_publish`, with a screencast of an owner approving a draft that is then published. Provide
the data deletion callback URL and privacy policy URL.

**How to check status:** App Dashboard → App Review → Permissions and features: both show "Advanced access".

## 5. Toast partner application

**Do:** apply at the Toast developer/partner portal for API access (orders + menus read). Owner: Akeem.

**How to check status:** Toast emails partner credentials; `TOAST_CLIENT_ID` / `TOAST_CLIENT_SECRET` issued.

## 6. ICO data protection fee

**Do:** register and pay at <https://ico.org.uk/for-organisations/data-protection-fee/>.

**How to check status:** the organisation appears on the ICO register of fee payers
(<https://ico.org.uk/ESDWebPages/Search>) with a registration number. Record it here.

## 7. US A2P 10DLC

Not needed in v1: no US SMS (decision 8). Revisit only if US missed-call text-back ships.

**How to check status:** Twilio Console → Messaging → Regulatory Compliance → A2P 10DLC brand and campaign show
"Approved".
