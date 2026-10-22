---
workflow: product-launch-video
flow: automation
storyboard: yes
message: "KOB does the restaurant admin work. You just approve. Nothing goes live without your OK."
destination: youtube
aspect: 1920x1080
language: en-GB
audience: "Independent restaurant owners/managers (1–5 sites) in UK, IE, US, CA, AU, NZ, IN, ZA who clicked a cold-email link from Tim at KOB. Busy, sceptical, on a phone, often muted."
length: 60s
angle: product-demo
voice: "ElevenLabs George (JBFqnCBsd6RMkjVDRZzb), calm warm British"
---

## Intent

A 60-second product demo for KOB (trykob.com), the approve-only restaurant manager. Viewer should understand in 60s exactly what KOB does, that nothing happens without their approval, and that it saves them time every week. No hard sell; end on the website.

Style is locked to the user's reference film (`/Users/akeemojuko/Downloads/xdyee7qdKl-WltqC.mp4`, a "Crumbs" fintech promo) "but of course with KobOS branding":
- Kinetic typography, word-by-word reveals with a slight stagger/baseline offset, centred, sentence-case, tight tracking.
- Alternating grounds: clean white / off-white scenes and full-bleed brand-colour flood scenes (theirs green → ours KOB lime `#a8ff2e`) with white or ink type.
- Logo-mark pop as a punctuation beat between sections.
- iOS-style notification cards that slide in and stack ("now" timestamps).
- An iPhone frame centred on white with the real product UI scrolling inside; a short brand-colour phrase set beside the phone.
- Huge all-caps one-word slams near the end, then "This is KOB" → logo end card.
- Calm, premium, Apple-film-meets-Linear; soft springs, no flashy transitions, no stock footage, no AI faces.

Follow the user's spec storyboard (KOB_60s_demo_video_prompt.md, saved as `user_script.txt`) for the 8 scenes and timings, re-expressed in the reference style.

## Assets

- components/kob-home/green-orb.tsx + app/globals.css — KOB mark is the lime 3D "green orb" plus the "KOB" wordmark; brand tokens: bright-green #a8ff2e, forest/ink #111111, accent #2f9e5f, canvas #f4f4f2, surface #ffffff.
- Real kobOS UI to recreate inside the phone: Today home (components/kob-talk/today-home.tsx), ApprovalCard, GBP review reply flow (Posting → Checking Google → Done ✓), /app/roi weekly report ("Your week" / "KOB's work" / "Value from KOB (verified)").

## Customizations

- Voiceover: ElevenLabs, calm warm British (George). Key in ~/.config/kob/elevenlabs.env (never in repo).
- Music bed (light, modern) under VO + subtle UI tap and "Done" tick SFX.
- Captions on screen for every key point (must work on mute).
- Extra outputs after the main render: 1080x1920 vertical cut, 1200x675 poster PNG, 6s approve→Done loop GIF.

## Notes

Honesty rules (non-negotiable):
- Only show: Google review reply drafting with approve → post → read-back verify → Done; Google listing/website issue detection with a ready-made fix; the weekly Your week / KOB's work / Value from KOB (verified) report; the Today approvals screen; the free audit.
- No AI phone host, direct ordering, win-back, delivery savings or POS data as working features. At most a final 2s "Coming soon: phone host, direct ordering" line.
- No invented stats/testimonials or £ savings. Numbers only as example data inside the fictional demo restaurant.
- Allowed claims: "approve-only", "nothing goes live without your OK", "7-day free trial, no card", "180+ restaurant sites".
- Trial length: the spec said "free 3-day trial", but the codebase (`getStripeTrialDays()` returns 7) and trykob.com both say 7-day — the film uses "7-day free trial · no card". Flagged to user.
- Demo restaurant: "The Juniper", 1-site neighbourhood restaurant in Peckham, owner "Priya". Fictional. Reviews and first names only. No lorem ipsum.
- British English spelling.
