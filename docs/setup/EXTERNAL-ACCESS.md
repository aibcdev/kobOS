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
| 7 | US A2P 10DLC | US SMS only | — | Start now for Spec 2 phone host (see §S2-1); US SMS stays off until approved |

### Spec 2 (connected features) day-1 items

Source: `KOB_BUILD_SPEC_2_FEATURES.md` §2 and §16.1 (also kept out of this repo). Connectors ship behind
`<NAME>_LIVE` flags with recorded fixtures; each flag flips only after its row says Approved.

| # | Item | Gates | Lead time | Status |
|---|------|-------|-----------|--------|
| S2-1 | Twilio regulatory bundles (UK, IE, AU, NZ, CA) + US A2P 10DLC brand and campaign | Phone host numbers (`TWILIO_LIVE`); US order-link SMS | UK 1–3 days; 10DLC 1–3 weeks | Not started |
| S2-2 | Stripe Connect platform profile | Direct ordering for non-Square venues (`STRIPE_CONNECT_LIVE`) | Days | Not started |
| S2-3 | ResDiary API access (`consumer_api`) | Live bookings from the phone host (`RESDIARY_LIVE`) | Days–weeks | Not started |
| S2-4 | Tock API request (US venues, read only) | Booking/guest import (`TOCK_LIVE`) | Weeks | Not started |
| S2-5 | Klaviyo app (optional) | CRM sync (`KLAVIYO_LIVE`) | Self-serve; review only for listing | Optional |
| S2-6 | Xero app, Plus tier budget (AUD 245/mo for up to 1,000 connections) | Supplier bills (`XERO_LIVE`) | Self-serve | Not started |
| S2-7 | QuickBooks Online production keys questionnaire | Supplier bills (`QBO_LIVE`) | Days | Not started |
| S2-8 | TikTok Content Posting API audit | Public TikTok posts (`TIKTOK_LIVE`); private-only until then | Weeks | Not started |
| S2-9 | Clover developer account + app approval | Clover POS read (`CLOVER_LIVE`) | Weeks | Not started |
| S2-10 | Toast partner application (writes) | Toast price/86 writes; until then price changes are an owner checklist | Months | Later (row 5 covers read) |
| S2-11 | Lightspeed K-Series partner application | Lightspeed POS (`LIGHTSPEED_LIVE`) | Months | Later |
| S2-12 | OpenTable, SevenRooms, Resy partner forms | Live bookings on those platforms; until then request-to-book + guest CSV import | Months; low odds | Later |
| S2-13 | Ticketmaster Discovery key; Met Office DataHub; Open-Meteo commercial plan | Quiet-night filler signals | Self-serve | Not started |
| S2-14 | Tripadvisor Content API key; Yelp Places paid plan | Review read for Tripadvisor/Yelp (no reply API on either) | Self-serve | Not started |

Self-serve now with no KOB approval (owner pastes a key or does OAuth): Square (incl. Bookings), Epos Now, Zettle,
Toast Standard API Access (read only), Deputy, Planday, 7shifts company token, Purple WiFi, Mailchimp.

Partner-only, so imports first: Deliveroo, Uber Eats, DoorDash Marketplace and Just Eat (owner uploads statements
for the "saved vs delivery apps" figure); OpenTable, SevenRooms and Resy (booking request + guest CSV); Dext (read
bills from Xero/QBO instead).

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
