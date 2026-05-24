---
version: alpha
name: "Owner.com"
description: "A confident restaurant-tech SaaS landing page built on a mint-green canvas with near-black ink typography, deep forest-green brand voltage on conversion surfaces, and aggressively rounded component geometry throughout the hero-to-dashboard preview flow."

colors:
  # Brand
  primary: "#094413"
  primary-active: "#06330e"
  primary-hover: "#0c5518"
  accent: "#088924"
  accent-active: "#066b1b"

  # Surface
  canvas: "#c2edce"
  surface-soft: "#ffffff"
  surface-warm: "#fbf8f5"
  surface-beige: "#f6eee5"
  surface-cream: "#f9f3ed"
  surface-elevated: "#ffffff"

  # Text / Ink
  ink: "#2c2c2c"
  body: "#2c2c2c"
  body-black: "#000000"
  muted: "rgba(44, 44, 44, 0.85)"
  muted-medium: "rgba(44, 44, 44, 0.5)"
  muted-soft: "rgba(44, 44, 44, 0.1)"
  muted-faint: "rgba(44, 44, 44, 0.05)"
  on-primary: "#ffffff"
  on-dark: "#ffffff"
  on-surface: "#2c2c2c"
  text-inverse: "#ffffff"
  text-inverse-muted: "rgba(255, 255, 255, 0.85)"
  text-inverse-soft: "rgba(255, 255, 255, 0.5)"
  text-warm: "#f9f3ed"

  # Hairlines & Borders
  hairline: "rgba(44, 44, 44, 0.1)"
  border-soft: "rgba(44, 44, 44, 0.05)"
  border-inset: "rgba(44, 44, 44, 0.1)"

  # Semantic
  error: "#c13515"
  success: "#088924"
  warning: "#d97706"
  info: "#2563eb"

typography:
  display-xl:
    fontFamily: "STKBureauSans, Arial, sans-serif"
    fontSize: "88px"
    fontWeight: "600"
    lineHeight: "83.6px"
    letterSpacing: "-3.52px"
  display-lg:
    fontFamily: "STKBureauSans, Arial, sans-serif"
    fontSize: "48px"
    fontWeight: "600"
    lineHeight: "48px"
    letterSpacing: "-1.44px"
  title-md:
    fontFamily: "STKBureauSans, Arial, sans-serif"
    fontSize: "24px"
    fontWeight: "600"
    lineHeight: "1.25"
    letterSpacing: "-0.02em"
  title-sm:
    fontFamily: "STKBureauSans, Arial, sans-serif"
    fontSize: "20px"
    fontWeight: "600"
    lineHeight: "1.3"
    letterSpacing: "-0.01em"
  body-md:
    fontFamily: "Helvetica, Arial, 'Hiragino Sans GB', STXihei, 'Microsoft YaHei', 'WenQuanYi Micro Hei', Hind, 'MS Gothic', 'Apple SD Gothic Neo', NanumBarunGothic, sans-serif"
    fontSize: "16px"
    fontWeight: "400"
    lineHeight: "16px"
    letterSpacing: "normal"
  body-sm:
    fontFamily: "Helvetica, Arial, 'Hiragino Sans GB', STXihei, 'Microsoft YaHei', 'WenQuanYi Micro Hei', Hind, 'MS Gothic', 'Apple SD Gothic Neo', NanumBarunGothic, sans-serif"
    fontSize: "14px"
    fontWeight: "400"
    lineHeight: "1.4"
    letterSpacing: "0"
  caption:
    fontFamily: "Helvetica, Arial, 'Hiragino Sans GB', STXihei, 'Microsoft YaHei', 'WenQuanYi Micro Hei', Hind, 'MS Gothic', 'Apple SD Gothic Neo', NanumBarunGothic, sans-serif"
    fontSize: "13px"
    fontWeight: "400"
    lineHeight: "1.38"
    letterSpacing: "0"
  button:
    fontFamily: "STKBureauSans, Arial, sans-serif"
    fontSize: "16px"
    fontWeight: "600"
    lineHeight: "1.25"
    letterSpacing: "0"
  label-md:
    fontFamily: "STKBureauSans, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: "500"
    lineHeight: "1.4"
    letterSpacing: "0"

rounded:
  sm: "12px"
  DEFAULT: "16px"
  md: "24px"
  lg: "32px"
  xl: "64px"
  pill: "9999px"
  full: "9999px"

spacing:
  xxs: "2px"
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "40px"
  xxl: "104px"
  section: "80px"

extensions:
  shadows:
    inset-hairline: "inset 0 -1px 0 0 rgba(44, 44, 44, 0.1)"
    card-elevated: "0 12px 24px 0 rgba(61, 60, 60, 0.2)"
    none: "none"
  motion:
    duration-fast: "300ms"
    duration-medium: "350ms"
    duration-slow: "450ms"
    duration-slower: "600ms"
    easing-standard: "cubic-bezier(0.38, 0.005, 0.215, 1)"
    easing-decelerate: "cubic-bezier(0.215, 0.61, 0.355, 1)"
    easing-bounce: "cubic-bezier(0.625, 0.05, 0, 1)"
    level: "moderate"
  icons: "custom"
  framework: "unknown"
  mode: "light"
  fontPairings:
    - head: "STK Bureau Sans"
      sub: "SuisseIntl"
      body: "System UI Stack (Helvetica/Arial)"

components:
  top-nav:
    backgroundColor: "{colors.surface-soft}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    height: "72px"
  nav-logo:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.title-sm}"
  nav-link:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.DEFAULT}"
    padding: "8px 16px"
  nav-link-text:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.DEFAULT}"
  button-primary-nav:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.text-warm}"
    typography: "{typography.button}"
    rounded: "{rounded.DEFAULT}"
    padding: "16px 24px"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: "16px 28px"
  button-primary-active:
    backgroundColor: "{colors.primary-active}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
  button-accent:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: "16px 28px"
  button-accent-active:
    backgroundColor: "{colors.accent-active}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
  button-secondary:
    backgroundColor: "{colors.surface-soft}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.DEFAULT}"
    padding: "16px 24px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: "8px 20px"
  text-input:
    backgroundColor: "{colors.surface-soft}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.lg}"
    padding: "18px 24px"
    height: "56px"
  text-input-focus:
    backgroundColor: "{colors.surface-soft}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
  hero-band:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.display-xl}"
    padding: "{spacing.section} {spacing.md} 140px"
  hero-headline:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.display-xl}"
  hero-rating:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    typography: "{typography.caption}"
  hero-input-group:
    backgroundColor: "{colors.surface-soft}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "{spacing.xs}"
  phone-mockup:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.text-inverse}"
    rounded: "{rounded.xl}"
    width: "320px"
  phone-mockup-header:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.text-inverse}"
    typography: "{typography.body-md}"
    rounded: "{rounded.xl}"
  score-card:
    backgroundColor: "{colors.surface-warm}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
  score-value:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.display-lg}"
  score-label:
    backgroundColor: "transparent"
    textColor: "{colors.muted-medium}"
    typography: "{typography.body-sm}"
  avatar-circle:
    backgroundColor: "{colors.hairline}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    size: "48px"
  card-surface:
    backgroundColor: "{colors.surface-soft}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "{spacing.lg}"
  card-elevated:
    backgroundColor: "{colors.surface-elevated}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "{spacing.lg}"
  footer:
    backgroundColor: "{colors.surface-soft}"
    textColor: "{colors.muted}"
    typography: "{typography.body-sm}"
    padding: "{spacing.xl} {spacing.md}"
  badge-star:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.caption}"
  icon-button-close:
    backgroundColor: "transparent"
    textColor: "{colors.body-black}"
    rounded: "{rounded.full}"
    size: "40px"
  cookie-banner:
    backgroundColor: "{colors.surface-soft}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "0"
---

# Owner.com Design System

## Overview

Owner.com presents itself as a confidently modern restaurant technology platform, using a distinctive mint-green (`{colors.canvas}`) as its hero-stage canvas rather than the expected sterile white. This choice immediately signals freshness and growth — appropriate for a product promising to fix online sales leakage through AI analysis. The visual language balances warmth (cream and beige surface tones like `{colors.surface-cream}` and `{colors.surface-beige}`) against the authority of deep forest green (`{colors.primary}`) applied selectively to conversion-critical elements.

Brand voltage concentrates in three precise locations: the primary CTA buttons throughout the page (`{component.button-primary}`, `{component.button-primary-nav}`), the "Get my AI report" action within the hero input group (`{component.button-accent}`), and the progress-ring accent inside the phone mockup's score visualization. Everywhere else, the system relies on near-black ink (`{colors.ink}`) set against generous white or warm-toned surfaces, creating high readability without chromatic competition.

The typography move defining this system is aggressive size contrast married to modest weight discipline. The display headline hits 88px at semibold weight (`{typography.display-xl}`), while body copy remains a neutral 400-weight system stack (`{typography.body-md}`). There is no use of heavy (700+) weights anywhere — even the boldest moments stop at 600. Letter-spacing is distinctly negative on large type (-3.52px on the h1), giving headlines a tightened, editorial feel reminiscent of premium print advertising.

Shape language is unapologetically rounded. Every interactive element uses at least `{rounded.DEFAULT}` (16px), with input containers and feature cards pushing into `{rounded.lg}` (32px) territory. The phone mockup itself carries `{rounded.xl}` (64px) with a custom top-only treatment of `64px 64px 0px 0px`. This creates a soft, approachable aesthetic that counters the urgency of the headline message ("You're losing sales") with visual comfort.

Key Characteristics:
- Mint-green hero canvas (`{colors.canvas}`) establishes immediate differentiation from typical SaaS whitespace
- Deep forest-green primary (`{colors.primary}#094413`) reserved exclusively for conversion actions, never decorative
- Display typography at 88px (`{typography.display-xl}`) with -3.52px letter-spacing creates editorial tension
- System font fallback chain for body ensures cross-platform consistency without web-font overhead
- Aggressive corner rounding ({`rounded.lg}` 32px) on all input groups, cards, and mockups
- Two-tier CTA hierarchy: `{component.button-primary-nav}` (dark ink + warm text) vs. `{component.button-primary}` (brand green)
- Warm surface palette (`{colors.surface-warm}`, `{colors.surface-cream}`) softens data-dense sections like the score card
- Motion system built on cubic-bezier curves favoring deceleration (`{extensions.motion.easing-decelerate}`)
- Phone mockup as hero anchor creates concrete product visualization before abstract benefit claims

## Colors

### Brand & Accent

- **Primary** (`{colors.primary}` — #094413): Deep forest green used on all primary conversion CTAs, the main "Get a free demo" nav button, and as the dominant brand signal. Appears almost black-green, ensuring maximum contrast with white text.
- **Primary Active** (`{colors.primary-active}` — #06330e): Darkened forest green for pressed/active states on primary buttons.
- **Primary Hover** (`{colors.primary-hover}` — #0c5518): Slightly lightened forest green for hover states.
- **Accent** (`{colors.accent}` — #088924): Brighter mid-green used specifically on the inline "Get my AI report" button within the hero search group — distinct enough from primary to indicate a different action type (report generation vs. demo scheduling).
- **Accent Active** (`{colors.accent-active}` — #066b1b): Darkened accent for pressed states.

### Surface

- **Canvas** (`{colors.canvas}` — #c2edce): The signature mint-green background of the hero section. Not a subtle tint — a fully saturated stage color that defines the brand's first impression.
- **Surface Soft** (`{colors.surface-soft}` — #ffffff): Pure white used for the navigation bar, card backgrounds, input fields, and most container surfaces. The default "paper" of the system.
- **Surface Warm** (`{colors.surface-warm}` — #fbf8f5): Very slightly warm off-white appearing inside the phone mockup's score card area, providing subtle depth against pure white.
- **Surface Beige** (`{colors.surface-beige}` — #f6eee5): Warmer beige tone for secondary surface differentiation, likely used in pricing or feature comparison areas below fold.
- **Surface Cream** (`{colors.surface-cream}` — #f9f3ed): Cream tone used specifically as text color on the dark nav CTA (`{component.button-primary-nav}`) — a warm inverse to the cool green brand palette.
- **Surface Elevated** (`{colors.surface-elevated}` — #ffffff): White surface with elevation shadow treatment for floating cards and dropdowns.

### Text / Ink

- **Ink** (`{colors.ink}` — #2c2c2c): Near-black primary text color. Used for headlines, body copy, nav links, and all primary reading content. Not pure #000 — softened to reduce harshness on the bright canvas.
- **Body Black** (`{colors.body-black}` — #000000): Pure black reserved for specific instances requiring maximum weight (close buttons, cookie banner icons).
- **Muted** (`{colors.muted}` — rgba(44, 44, 44, 0.85)): 85% opacity ink for secondary text such as review counts and metadata labels.
- **Muted Medium** (`{colors.muted-medium}` — rgba(44, 44, 44, 0.5)): 50% opacity ink for tertiary text like score denominators ("/100") and placeholder hints.
- **Muted Soft** (`{colors.muted-soft}` — rgba(44, 44, 44, 0.1)): 10% opacity used for subtle borders, dividers, and background tints.
- **Muted Faint** (`{colors.muted-faint}` — rgba(44, 44, 44, 0.05)): 5% opacity for the faintest surface treatments.
- **On Primary** (`{colors.on-primary}` — #ffffff): White text on brand-green backgrounds, meeting AA contrast requirements against `{colors.primary}`.
- **On Dark** (`{colors.on-dark}` — #ffffff): White text for any dark surface context.
- **On Surface** (`{colors.on-surface}` — #2c2c2c): Alias for ink when referencing surface-text relationships explicitly.
- **Text Inverse** (`{colors.text-inverse}` — #ffffff): White text for dark backgrounds generally.
- **Text Inverse Muted** (`{colors.text-inverse-muted}` — rgba(255, 255, 255, 0.85)): 85% white for secondary text on dark surfaces.
- **Text Inverse Soft** (`{colors.text-inverse-soft}` — rgba(255, 255, 255, 0.5)): 50% white for tertiary text on dark surfaces.
- **Text Warm** (`{colors.text-warm}` — #f9f3ed): Warm cream-colored text used specifically on the dark nav CTA button to create tonal harmony with the overall warm-neutral palette.

### Hairlines & Borders

- **Hairline** (`{colors.hairline}` — rgba(44, 44, 44, 0.1)): Standard 10% opacity border for subtle dividers between list items or card edges.
- **Border Soft** (`{colors.border-soft}` — rgba(44, 44, 44, 0.05)): Fainter 5% opacity for the most subtle separation needs.
- **Border Inset** (`{colors.border-inset}` — rgba(44, 44, 44, 0.1)): Same value as hairline, named separately for the specific inset shadow usage on certain components.

### Semantic

- **Error** (`{colors.error}` — #c13515): Red-orange for validation errors and destructive actions.
- **Success** (`{colors.success}` — #088924): Green matching the accent family for confirmations and positive indicators.
- **Warning** (`{colors.warning}` — #d97706): Amber for caution states.
- **Info** (`{colors.info}` — #2563eb): Blue for informational messages.

## Typography

### Font Family

The Owner.com system operates on a dual-typeface architecture. Headlines, navigation elements, buttons, and all branded UI text use **STK Bureau Sans**, a proprietary geometric grotesk with strong horizontal proportions and excellent legibility at display sizes. This face carries the personality of the brand — modern, direct, slightly technical but approachable.

Body text, descriptions, captions, and all long-form content fall back to a **comprehensive system font stack**: `Helvetica, Arial, 'Hiragino Sans GB', STXihei, 'Microsoft YaHei', 'WenQuanYi Micro Hei', Hind, 'MS Gothic', 'Apple SD Gothic Neo', NanumBarunGothic, sans-serif`. This chain prioritizes Helvetica on macOS, covers Chinese/Japanese/Korean systems with native fonts, includes Hind for Indian script support, and terminates in a reliable sans-serif fallback. The choice avoids loading a separate web font for body copy, keeping performance lean while ensuring native rendering quality everywhere.

Additionally, **SuisseIntl** is loaded via @font-face declarations across weights 100–700 (including italics). This appears to be available for future use or specific sub-components not visible in the hero viewport, potentially serving as a refined alternative to STK Bureau Sans in editorial or data-visualization contexts within the app dashboard shown in the phone mockup.

### Hierarchy

| Token | Size | Weight | Line Height | Letter Spacing | Use |
|---|---|---|---|---|---|
| `{typography.display-xl}` | 88px | 600 | 83.6px | -3.52px | Hero H1 headline — single-line impact statement |
| `{typography.display-lg}` | 48px | 600 | 48px | -1.44px | Section headlines, score values, major subheadings |
| `{typography.title-md}` | 24px | 600 | ~30px | -0.02em | Card titles, feature names, modal headers |
| `{typography.title-sm}` | 20px | 600 | ~26px | -0.01em | Navigation logo, small feature titles |
| `{typography.body-md}` | 16px | 400 | 16px | normal | Body copy, nav links, input text, standard paragraphs |
| `{typography.body-sm}` | 14px | 400 | ~19.6px | 0 | Supporting text, metadata, score labels |
| `{typography.caption}` | 13px | 400 | ~17.94px | 0 | Review counts, timestamps, legal text |
| `{typography.button}` | 16px | 600 | 20px | 0 | All button labels, CTA text, nav CTA |
| `{typography.label-md}` | 14px | 500 | ~19.6px | 0 | Form labels, table headers, tag text |

### Principles

The typographic hierarchy relies almost entirely on **size differential rather than weight escalation**. The jump from `{typography.body-md}` (16px) to `{typography.display-xl}` (88px) represents a 5.5x scale factor — enormous by conventional standards — yet both sit within a narrow weight band (400–600). This prevents the visual noise that comes from mixing regular, medium, semibold, and bold indiscriminately. When emphasis is needed, the system scales up before it weights up.

Negative letter-spacing is a **signature moment** reserved exclusively for display type. At 88px, the -3.52px tracking pulls characters together into a cohesive wordmark-like block, increasing perceived authority and reducing the "airy" feeling that超大 sizes can introduce on screen. This tightens to -1.44px at the 48px level, then disappears entirely for anything smaller — you will never see negative tracking on body copy or buttons.

Line heights are notably **tight**: 83.6px leading on 88px type gives a ratio of just 0.95 (less than 1:1!), while the 48px headline has exactly 1:1 leading. This is intentional for display type where each line is expected to be short (the hero headline breaks into two lines of 7–8 words each). Body copy at 16px/16px (1:1) is tighter than the web-standard 1.5–1.6, suggesting the design assumes short paragraph lengths and prefers the density of print over the spaciousness of conventional web accessibility guidelines.

There is **no italic usage** in the hero viewport, and no uppercase transformations beyond what's inherent in the copy (proper nouns, acronyms). The voice is conversational-direct: sentence case everywhere, even on buttons.

### Note on Font Substitutes

**STK Bureau Sans** is a proprietary typeface without a public Google Fonts equivalent. For open-source reimplementation, the closest matches are:
- **DM Sans** (Google Fonts) — similar geometric structure, good weight range (400–700), slightly wider proportions
- **Manrope** (Google Fonts) — modern grotesk with excellent readability at large sizes, supports extended Latin well
- **Plus Jakarta Sans** (Google Fonts) — contemporary alternative with similar geometric DNA

Define CSS variables for easy swapping:
```css
--font-head: 'DM Sans', 'STK Bureau Sans', Arial, sans-serif;
--font-body: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
```

## Layout

### Spacing System

- **Base unit:** 4px (implied by the spacing tokens: 2, 4, 8, 16, 24, 32, 40, 80, 104).
- **Tokens:** 
  - `{spacing.xxs}` (2px) — micro-adjustments, hairline offsets
  - `{spacing.xs}` (4px) — icon padding internal gaps, smallest element spacing
  - `{spacing.sm}` (8px) — input left-padding, compact internal gaps
  - `{spacing.md}` (16px) — standard element gap, card internal padding baseline
  - `{spacing.lg}` (24px) — comfortable block spacing, card-to-card gaps
  - `{spacing.xl}` (40px) — section-internal major spacing, hero vertical rhythm
  - `{spacing.xxl}` (104px) — very large section breaks, hero bottom clearance
  - `{spacing.section}` (80px) — vertical padding for standard content sections
- **Section padding (vertical):** `{spacing.section}` (80px) — applied to `<section>` elements per extracted container styles; hero section uses additional bottom clearance of ~140px for the phone mockup overlap zone.
- **Card internal padding:** `{spacing.lg}` (24px) for standard cards (`{component.card-surface}`); `{spacing.xl}` (40px) for prominent containers.
- **Gutters:** Content sits within a 1440px max-width container (per `main` and `nav` selectors) with implicit auto margins centering. No fixed gutter token observed; padding appears contextual based on component nesting.

### Grid & Container

Max content width is **1440px** for both the main content area and the navigation container, suggesting a widescreen-first layout targeting desktop dashboard users (restaurant owners working at laptops). This is significantly wider than the 1200px or 1280px common in consumer SaaS, reinforcing Owner.com's positioning toward power users who need information density.

The hero section employs a **two-column asymmetric split**: the left column (roughly 55–60% width) contains the trust signal (star rating), headline, subheadline, and input group stacked vertically; the right column (40–45%) holds the overlapping phone mockup positioned to break out of the standard flow. This is not a rigid grid — it's a flex-based composition where the mockup's absolute or relative positioning creates visual layering.

No explicit 12-column or 6-column grid classes were detected in the extracted CSS. Layout appears to use Webflow's native flex/container system with percentage-based widths and manual breakpoint adjustments.

### Whitespace Philosophy

Owner.com practices **generous-but-purposeful whitespace** in the hero, allowing the mint-green canvas to breathe around the headline and input group. However, it does not embrace "Swiss-style" extreme minimalism — the phone mockup intrudes into the lower hero space creating density and product concreteness. The philosophy is: *white space sells the headline, product imagery sells the solution*. Sections below the hero (not visible but inferable from the pattern) likely compress spacing to deliver feature information efficiently to time-pressed restaurant operators.

### Header Architecture

```
+------------------------------------------------------------------+
| [Logo]          Product v  Pricing  How it works  Company     Login | [Get a free demo] |
|                  Resources v                                      |
+------------------------------------------------------------------+
| ^1440px max-width, centered, white background, ~72px height       |
+------------------------------------------------------------------+
```

The navigation uses a **flush-left logo, distributed center menu items, flush-right utility cluster** pattern. Dropdown indicators (v) appear on "Product", "Company", and "Resources" indicating mega-menu or dropdown behavior. The "Login" link sits immediately left of the primary CTA, following the utility-before-convention convention. The entire bar sits on `{colors.surface-soft}` (pure white) with no visible border or shadow — it floats cleanly over whatever content passes beneath (though in practice the hero's mint background starts below the nav).

### Hero Section

```
+------------------------------------------------------------------+
|                          [NAV BAR - 72px]                         |
+------------------------------------------------------------------+
|                                                                  |
|              4.8 ★★★★★ across 1,000+ reviews                    |
|                                                                  |
|     You're losing sales online.                                  |
|     Use AI to see what to fix.                                   |
|                                                                  |
|     +--------------------------------------------+  +--------+   |
|     | [Find your restaurant name____] [Get my ▲] |  |        |   |
|     +--------------------------------------------+  | PHONE  |   |
|                                                    | MOCKUP |   |
|                                                    |        |   |
|                                                    +--------+   |
|  [mint-green canvas continues behind mockup]                     |
+------------------------------------------------------------------+
| ^80px top pad, ~140px bottom pad, centered content               |
+------------------------------------------------------------------+
```

The hero centers all text content horizontally within the 1440px constraint. The star rating sits above the headline as a **trust pre-header** in small caption type. The headline breaks across two lines with the verb phrase ("Use AI to see what to fix.") carrying equal visual weight to the problem statement. Below, the input group forms a **single rounded rectangle** (`{rounded.lg}` / 32px) containing the text input and button fused together with only `{spacing.xs}` (4px) internal gap. The phone mockup overlaps the bottom-right quadrant, breaking the container boundary to create depth.

### Phone Mockup Component Structure

```
+---------------------------+
| 9:41         [dynamic]    |  <- Status bar (black bg)
+---------------------------+
| 🍽️ Your restaurant        |  <- Header row with avatar circle
+---------------------------|
|                           |
|      ╭─────────╮          |
|      │         │ 36       |  <- Score ring + value
|      │   ◠     │ /100     |
|      │         │          |
|      ╰─────────╯          |
|                           |
+---------------------------+
| ^rounded: 64px 64px 0 0   |
| ^bg: near-black           |
+---------------------------+
```

The phone mockup serves as the **hero's visual anchor** — it's not decoration but proof-of-concept. Inside, the score visualization uses a circular progress indicator (orange arc on light track) surrounding the large numeric score rendered in `{typography.display-lg}` (48px). An `{component.avatar-circle}` with a restaurant food image sits left of the "Your restaurant" header text. The entire phone frame uses `{colors.ink}` as its background with the distinctive `{rounded.xl}` top-radius-only treatment.

## Elevation & Depth

| Level | Treatment | Use |
|---|---|---|
| 0 — Flat | No shadow, solid background | Nav bar, hero canvas, flat cards |
| 1 — Inset | `{extensions.shadows.inset-hairline}` | Subtle top-edge inset on press states |
| 2 — Raised | `{extensions.shadows.card-elevated}` (0 12px 24px rgba(61,60,60,0.2)) | Floating phone mockup, elevated cards |
| 3 — Modal | (Not detected) | Likely used for modals/dropdowns below fold |

The elevation philosophy here is **layered but restrained**. Unlike SaaS products that stack cards on cards with progressive shadow depths, Owner.com keeps most surfaces flat (Level 0) and reserves the single elevated treatment for the phone mockup — making it literally pop off the canvas. The shadow on the mockup is neutral-toned (no blue or green tint), with 20% opacity at the blur edge, creating a realistic "object resting on surface" effect rather than a digital glow.

There are **no colored drop shadows, no gradient overlays, and no glassmorphism effects** in the hero viewport. Depth comes from two sources only: the physical-layering shadow on the phone, and the color-block distinction between mint canvas → white input group → black phone → warm interior card. This material honesty aligns with the product's promise of transparent, actionable data (no smoke and mirrors).

### Decorative Depth

Beyond literal elevation, the hero achieves atmospheric depth through **background-color blocking**: the mint `{colors.canvas}` fills the entire viewport behind the hero, creating a saturated "pool" of color that makes the white input group and black phone read as objects floating in colored space. Below the fold (inferable), the system likely alternates between white, cream, and possibly light-gray bands to create sectional rhythm without relying on shadows.

## Shapes

### Border Radius Scale

| Token | Value | Use |
|---|---|---|
| `{rounded.sm}` | 12px | Small badges, tags, inner elements |
| `{rounded.DEFAULT}` | 16px | Buttons (nav CTA, ghost buttons), nav links |
| `{rounded.md}` | 24px | Primary CTA buttons, feature cards, standard containers |
| `{rounded.lg}` | 32px | Input groups, hero input container, score card |
| `{rounded.xl}` | 64px | Phone mockup (top corners), large feature panels |
| `{rounded.pill}` / `{rounded.full}` | 9999px | Icon buttons (close widgets), avatar circles |

The shape vocabulary is **aggressively rounded** compared to industry norms. Where many B2B SaaS products cap at 8–12px, Owner.com's floor is 12px and its mode is 24–32px. This creates a friendly, consumer-grade feel despite the business-targeted messaging. The only sharp-cornered elements in the viewport are the phone mockup's bottom corners (intentionally cut at 0px to simulate a real device extending beyond frame) and text inputs' internal focus rings.

### Photography Geometry

The hero viewport contains **one photographic element**: the small circular avatar inside the phone mockup showing a dish of food. This uses `{component.avatar-circle}` with `{rounded.full}` (perfect circle), approximately 48×48px, filled with what appears to be a photographed meal (possibly pasta or a composed plate). The image is contained within the circle with no overflow, suggesting `object-fit: cover` or `border-radius: 50%` clipping.

The phone mockup itself could be considered a **product visualization/render** rather than photography — it's a clean UI representation of the app interface. If the site contains lifestyle imagery below the fold (restaurant interiors, happy staff, food spreads), those would likely follow the same rounded-container treatment (16–24px radius on image wrappers) to maintain shape consistency.

## Components

> **No hover states documented.** Hover behavior is unreliable to extract from a single screenshot. State variants live as separate entries in the `components:` frontmatter (e.g., `{component.button-primary-active}`, `{component.text-input-focus}`); add hover styling at implementation time per your stack's conventions.

### Buttons

**`{component.top-nav}`** — The persistent top navigation bar spanning the full viewport width. Background `{colors.surface-soft}` (pure white), text defaults to `{colors.ink}`, sitting at 72px tall within the 1440px constrained container. Contains the logo, menu links, login utility, and primary CTA. No visible border or shadow — it rests cleanly above the hero canvas.

**`{component.nav-logo}`** — "Owner" wordmark in the top-left of the navigation bar. Transparent background with `{colors.ink}` text, rendered in `{typography.title-sm}` (20px, weight 600). Uses the STK Bureau Sans typeface for brand recognition.

**`{component.nav-link}`** — Standard navigation menu item ("Product", "Pricing", "How it works", "Company", "Resources"). Transparent background, `{colors.ink}` text in `{typography.body-md}`, with `{rounded.DEFAULT}` (16px) padding of 8px horizontal × 16px vertical. Dropdown indicators (chevron-down icons) accompany items with nested menus. These function as hit areas larger than the text alone.

**`{component.nav-link-text}`** — The "Login" utility link positioned immediately right of the menu cluster. Styled similarly to nav-links but using `{typography.button}` weight (600) to elevate it visually above standard navigation while keeping it subordinate to the primary CTA.

**`{component.button-primary-nav}`** — The "Get a free demo" button in the navigation bar's far-right position. Background `{colors.ink}` (near-black) with `{colors.text-warm}` (cream #f9f3ed) text — note this is NOT the brand green, but an inverted scheme that signals importance while reserving green for in-content CTAs. Typography `{typography.button}` (16px/600), rounded `{rounded.DEFAULT}` (16px), padding 16px × 24px. This is often called a "filled neutral" or "dark button" pattern.

**`{component.button-primary}`** — The canonical primary call-to-action in brand green (`{colors.primary}` #094413). White text (`{colors.on-primary}`), `{typography.button}`, heavily rounded at `{rounded.md}` (24px), generous padding of 16px × 28px. Used for the highest-conversion actions: demo requests, sign-up flows, primary submission points.

**`{component.button-primary-active}`** — Pressed/active state of the primary button, shifting background to `{colors.primary-active}` (#06330e) — a perceptibly darker forest green providing tactile feedback on click/touch.

**`{component.button-primary-hover}`** — Hover state (to be implemented) using `{colors.primary-hover}` (#0c5518) — slightly lifted brightness suggesting interactivity without departing the green family.

**`{component.button-accent}`** — The bright green variant (`{colors.accent}` #088924) used specifically for the "Get my AI report" inline action within the hero input group. Distinguished from `{component.button-primary}` to signal a different conversion path (instant report generation vs. scheduled demo). Same dimensions and typography as primary.

**`{component.button-accent-active}`** — Active state for accent button, darkening to `{colors.accent-active}` (#066b1b).

**`{component.button-secondary}`** — Outlined or light-background button variant. White background (`{colors.surface-soft}`) with `{colors.ink}` text, `{typography.button}`, `{rounded.DEFAULT}` (16px), 16px × 24px padding. Used for secondary actions where primary would be too commanding.

**`{component.button-ghost}`** — Minimal transparent button with `{colors.ink}` text only, `{rounded.pill}` shape, 8px × 20px padding. Used for dismissive actions, filter toggles, or low-emphasis selections.

**`{component.icon-button-close}`** — Circular close/dismiss button (40×40px, `{rounded.full}`) with transparent background and `{colors.body-black}` icon. Used for cookie banner dismissal, modal closes, and overlay exits. Contains an × SVG icon centered within the touch target.

### Cards & Containers

**`{component.hero-band}`** — The full-width hero section container. Background `{colors.canvas}` (mint #c2edce), text `{colors.ink}`, typography anchored by `{typography.display-xl}`. Padding is 80px top, ~16px horizontal (within the 1440px centering), and approximately 140px bottom to accommodate the phone mockup overhang. This is the signature "color band" of the entire page.

**`{component.hero-headline}`** — The h1 text element itself ("You're losing sales online. Use AI to see what to fix."). Transparent background, `{colors.ink}` text in `{typography.display-xl}` (88px/600/-3.52px tracking). Centered within the hero's left column. Line height of 83.6px creates slight overlap between the two lines, enhancing the "block" feeling.

**`{component.hero-rating}`** — The trust signal above the headline: "4.8 ★★★★★ across 1,000+ reviews". Transparent background, `{colors.muted}` text (85% opacity ink), `{typography.caption}` (13px). Stars are likely individual SVG icons or a Unicode character sequence. Positioned as a pre-header to establish credibility before the claim.

**`{component.hero-input-group}`** — The combined input-and-button container forming the hero's primary conversion point. White background (`{colors.surface-soft}`), `{rounded.lg}` (32px) creating a pill-like capsule, containing the `{component.text-input}` and `{component.button-accent}` side-by-side with minimal internal gap (~4px). May carry a subtle shadow or border in some implementations; extracted CSS shows clean white background.

**`{component.phone-mockup}`** — The smartphone device frame in the hero's lower-right quadrant. Background `{colors.ink}` (near-black), white text for status-bar contents, `{rounded.xl}` (64px) on top corners with 0px on bottom (creating the "device extending downward" illusion). Width approximately 320px (iPhone-scale). Carries `{extensions.shadows.card-elevated}` for lift-off effect. Contains the app UI preview.

**`{component.phone-mockup-header}`** — The status bar area within the phone mockup showing "9:41" and system icons (signal, wifi, battery). Black background, white text, same top-rounded treatment as parent.

**`{component.score-card}`** — The interior card within the phone mockup displaying the restaurant's health score. Background `{colors.surface-warm}` (#fbf8f5) — noticeably warmer than pure white to suggest an "app interior" material, `{colors.ink}` text, `{rounded.lg}` (32px), `{spacing.lg}` (24px) internal padding. Houses the circular progress indicator and numeric score.

**`{component.score-value}`** — The large "36" number displayed in the center of the score ring. Transparent background, `{colors.ink}` text in `{typography.display-lg}` (48px/600). Paired with `/100` in `{component.score-label}` below it.

**`{component.score-label}`** — The "/100" denominator beneath the score value. Transparent background, `{colors.muted-medium}` text (50% opacity), `{typography.body-sm}` (14px). Establishes the scoring scale without competing with the primary number.

**`{component.avatar-circle}`** — Circular image container (48×48px, `{rounded.full}`) holding the restaurant's featured dish photo. `{colors.hairline}` background fallback if image fails to load, `{colors.ink}` placeholder text/icon. Positioned left of "Your restaurant" label in the phone mockup header row.

**`{component.card-surface}`** — Standard content card for features, testimonials, or pricing tiers (inferred from patterns). White background (`{colors.surface-soft}`), `{colors.ink}` text, `{rounded.md}` (24px), `{spacing.lg}` (24px) internal padding. Flat (no shadow) at Level 0 elevation.

**`{component.card-elevated}`** — Elevated variant for highlighted or hovered cards. Same white background but with `{extensions.shadows.card-elevated}` shadow treatment. Used for featured pricing tier, hovered testimonial, or sticky-positioned elements.

**`{component.footer}`** — Page footer container (position inferred). White background (`{colors.surface-soft}`), `{colors.muted}` text color, `{typography.body-sm}` (14px) for legal/copyright text, generous `{spacing.xl}` (40px) vertical padding. Likely multi-column with links organized by category.

**`{component.badge-star}`** — Individual star icon or rating badge within the hero rating line. Transparent background, `{colors.ink}` fill color, `{typography.caption}` sizing. Part of the 5-star visual array.

### Inputs & Forms

**`{component.text-input}`** — Standard text input field. White background (`{colors.surface-soft}`), `{colors.ink}` text in `{typography.body-md}` (16px), `{rounded.lg}` (32px) inheriting the container's capsule shape, padding 18px × 24px, height 56px. Placeholder text reads "Find your restaurant name" in muted tone. Border is 0px (relies on background contrast + radius for definition).

**`{component.text-input-focus}`** — Focus state for text input (documented separately per state-variant policy). Maintains white background and ink text color; implementation should add a focus ring (likely `{colors.accent}` or `{colors.primary}` outline at 2px, offset by 2px) following platform conventions.

### Navigation

Navigation components are covered above under Buttons (`{component.top-nav}`, `{component.nav-logo}`, `{component.nav-link}`, `{component.nav-link-text}`). Additional navigation patterns likely include:

- Sticky scroll behavior (nav remains pinned at top on hero exit)
- Mobile hamburger menu (collapsed at tablet/breakpoint)
- Mega-menu dropdowns on "Product", "Company", "Resources" (indicated by chevron icons)

### Sub-Systems

**Cookie Consent Banner** — Detected in DOM as `.osano-cm-dialog`. Third-party (Osano) component with `{colors.surface-soft}` background, `{colors.ink}` text, `{typography.body-sm}`. Includes `{component.icon-button-close}` for dismissal. Styling is partially controlled by external script; custom overrides should match Owner.com's radius and font preferences.

## Do's and Don'ts

### Do

- Do use `{colors.canvas}` (mint #c2edce) as the hero section background — it's the brand's most recognizable visual signature and differentiates Owner.com from every white-canvas SaaS competitor.
- Do reserve `{colors.primary}` (forest green #094413) exclusively for primary conversion CTAs — never use it for decorative elements, borders, or non-action text.
- Do apply `{rounded.lg}` (32px) or greater to the hero input group container — the capsule shape is a key interaction landmark that users associate with the report-generation flow.
- Do maintain the 88px display headline size (`{typography.display-xl}`) with -3.52px letter-spacing for the primary hero message — this aggressive sizing is what creates the "editorial ad" impact.
- Do use `{colors.text-warm}` (#f9f3ed) as the text color on dark/inverted buttons like `{component.button-primary-nav}` — the warm cream tone harmonizes with the overall palette better than stark white would.
- Do implement the phone mockup with `{rounded.xl}` (64px) on top corners only (bottom at 0px) to simulate a real device extending beyond the frame — this detail sells the "real app" authenticity.
- Do keep body copy at weight 400 (`{typography.body-md}`) even for emphasized passages — let size and color carry hierarchy, not bolding.
- Do apply the 1440px max-width container for main content sections — Owner.com targets widescreen laptop viewing by restaurant operators, not mobile-first consumers.
- Do use `{colors.surface-warm}` (#fbf8f5) for interior/app-preview surfaces (like inside the phone mockup's score card) to differentiate "screen content" from "page content."
- Do include the star-rating trust signal above the headline in `{typography.caption}` (13px) with `{colors.muted}` opacity — social proof should precede the claim, not follow it.

### Don't

- Don't substitute `{colors.ink}` (#2c2c2c) with pure black (#000000) for body text — the slight softness reduces eye strain on the bright mint canvas and is an intentional choice.
- Don't round corners less than `{rounded.sm}` (12px) on any user-facing component — the minimum radius in this system is higher than industry norms; sharper corners will look foreign.
- Don't use `{typography.display-xl}` (88px) for anything other than the single hero headline — it's a special-case size, not a general heading level.
- Don't add gradient washes or color overlays to the hero canvas — the mint `{colors.canvas}` is a flat, confident solid; layering would undermine the clarity.
- Don't apply shadows to standard content cards (`{component.card-surface}`) — they sit flat at Level 0; reserve elevation for the phone mockup and truly floating elements only.
- Don't mix font families beyond the head/body split — STK Bureau Sans for all branded/UI text, system stack for all body/reading text; don't introduce a third face without clear purpose.
- Don't expand the color palette beyond the 35+ tokens documented — especially avoid adding blues, purples, or teals that aren't in the semantic set; the brand owns green and neutral-warm only.
- Don't let the phone mockup sit fully within the hero container bounds — it must overlap/lower-break the section to create the layered depth effect visible in the reference.
- Don't use letter-spacing tighter than -3.52px on any text — that value is calibrated specifically for the 88px size; applying it to smaller type will cause character collisions.
- Don't implement hover states without consulting the active/pressed variants first (`{component.button-primary-active}`, etc.) — the state system expects a coherent progression from default → hover → active.

## Motion & Animation

### Transition Tokens

```css
/* Standard UI transitions (buttons, links, color changes) */
--transition-ui: background-color 0.3s cubic-bezier(0.38, 0.005, 0.215, 1),
                 color 0.3s cubic-bezier(0.38, 0.005, 0.215, 1),
                 opacity 0.3s cubic-bezier(0.38, 0.005, 0.215, 1),
                 border-color 0.3s cubic-bezier(0.38, 0.005, 0.215, 1),
                 transform 0.3s cubic-bezier(0.38, 0.005, 0.215, 1),
                 padding 0.3s cubic-bezier(0.38, 0.005, 0.215, 1);

/* Elevated element transitions (cards, modals, dropdowns) */
--transition-elevated: transform 0.35s cubic-bezier(0.215, 0.61, 0.355, 1),
                      box-shadow 0.45s cubic-bezier(0.215, 0.61, 0.355, 1),
                      border-color 0.45s cubic-bezier(0.215, 0.61, 0.355, 1),
                      color 0.45s cubic-bezier(0.215, 0.61, 0.355, 1),
                      opacity 0.45s cubic-bezier(0.215, 0.61, 0.355, 1),
                      background-color 0.45s cubic-bezier(0.215, 0.61, 0.355, 1);

/* Specialized motion */
--transition-bounce: transform 0.6s cubic-bezier(0.625, 0.05, 0, 1);
--transition-fade: opacity 0.45s cubic-bezier(0.215, 0.61, 0.355, 1);
--transition-cookie: opacity 0.3s linear, visibility 0.3s linear;
```

### Keyframe Animations

- **`delay-overflow`** — Utility animation for managing CSS overflow property timing during reveal sequences.
- **`osano-load-scale`** — Cookie consent widget entrance animation (third-party, not customizable).
- **`spin`** — Rotation animation, likely used for loading indicators or the score ring's progress sweep.
- **`grow-marquee`** — Horizontal scrolling marquee animation for testimonial/review ticker strips (common in SaaS landing pages).
- **`translateX`** / **`translateXRev`** — Bidirectional horizontal translation for slide-reveal effects on scroll-triggered elements.

### Interaction Patterns

- **Scroll-triggered fade-up**: Content blocks (features, testimonials, pricing) likely animate from opacity-0 + translate-y(20px) to full visibility as they enter the viewport, using IntersectionObserver or a library equivalent.
- **Phone mockup parallax**: The hero phone probably moves at a slower scroll rate than the background text, creating subtle depth parallax during page scroll.
- **Input focus expansion**: The hero input field may widen slightly or lift on focus (using `{--transition-elevated}` timing) to emphasize interactivity.
- **Button press scale**: Primary buttons likely apply `transform: scale(0.97)` on active/pressed state with the bounce easing (`cubic-bezier(0.625, 0.05, 0, 1)`).
- **Score ring animation**: The circular progress indicator in the phone mockup animates its stroke-dashoffset from 0 to the target value (36%) on load, using the `spin` or a custom draw-animation keyframe.
- **Marquee testimonial strip**: A continuously scrolling row of review snippets or customer logos using `grow-marquee` + `translateX`, looping seamlessly.
- **Cookie banner slide-up**: The Osano consent banner rises from the bottom of the viewport with a fade + translate-y transition.

## Imagery Style

- **Product visualization优先**: The hero's central image is a clean UI mockup (phone frame with app interface), not lifestyle photography. This reflects a B2B SaaS strategy of showing the product over showing people using it.
- **Food photography in micro-context**: The sole photographic element (avatar inside phone) shows prepared food — connecting emotionally to the restaurant-operator audience. It's tightly cropped into a 48px circle, implying larger food imagery may exist elsewhere on the site (menu showcases, success stories).
- **No human faces in viewport**: The hero avoids stock photos of smiling restaurant staff or customers, opting for the credibility of data (score visualization) and social proof (star rating) instead.
- **Flat, clean render style**: The phone mockup uses vector-clean UI rendering with no texture, grain, or photographic effects. Shadows are algorithmic (CSS box-shadow), not composited from photos.
- **Color treatment of imagery**: Images are contained within shaped containers (circles, rounded rectangles) with no filters, duotones, or color overlays. They sit naturally against warm or neutral backgrounds.
- **Likely below-fold imagery patterns**: Based on category norms, expect: restaurant interior shots (warm lighting, shallow depth of field), food close-ups (appetizing, professional food-photography style), screenshot arrays of the actual dashboard UI (showing reports, analytics, ordering interfaces), and possibly illustrated diagrams explaining the AI analysis process.

## Icon System

- **Library:** Custom SVG icons (no detected third-party library like Lucide or Heroicons in the framework scan). Icons are likely hand-crafted or sourced from a custom set matching the brand's geometric aesthetic.
- **Specific icons observed:**
  - Owner logo mark (location-pin or abstract O-shape glyph beside "Owner" wordmark)
  - Star/rating icons (5-pointed solid stars in the hero rating line)
  - Chevron-down (dropdown indicators on nav items: Product, Company, Resources)
  - Arrow-up/right (arrow icon inside "Get my AI report" button, pointing up/right suggesting forward action)
  - Close/X (dismiss icon on cookie consent banner)
  - Cookie/widget toggle (Osano privacy widget icon, bottom-left positioned)
  - Status bar icons (signal bars, WiFi, battery) inside phone mockup
- **Treatment:** Stroke-based for outlined icons (chevrons, arrows), fill-based for solid icons (stars, logo mark). Color is typically `currentColor` inheriting from parent text color. Sizes range from 12px (inline chevrons) to 20px (button icons) to 24px (standalone marks).
- **Alignment:** Icons center vertically with adjacent text using flexbox alignment. Button icons have ~8px gap from text. Nav chevrons sit 4–6px to the right of menu item text.

## Recommended Frontend Stack

```
- Framework:      Next.js 14+ (React-based SSR/SSG for landing-page performance; matches Webflow-export patterns)
- Styling:        Tailwind CSS v4 (utility-first maps cleanly to the token system; or CSS Modules if preserving exact class names from export)
- Fonts:          Self-host STK Bureau Sans via @font-face (or substitute DM Sans from Google Fonts);
                   body text uses system stack (no external request needed)
- Animation:      Framer Motion (for scroll-triggered reveals, parallax, and layout animations matching the cubic-bezier specs)
- Icons:          Custom SVG sprite (inline React components or SVG <use> spritesheet)
- Component lib:  Radix UI primitives (for accessible dropdowns, dialogs, tooltips underlying the custom-styled surfaces)
- Deployment:     Vercel (native Next.js hosting; edge-cached for global restaurant-operator audiences)
```

## Responsive Behavior

### Breakpoints

| Name | Width | Key Changes |
|---|---|---|
| Mobile | ≤639px | Single-column everything; hero stacks vertically (text → input → phone); nav collapses to hamburger; phone mockup scales to ~280px width |
| Tablet | 640px–1023px | Two-column hero begins (text left, phone right) but compressed; nav links may hide behind "Menu" toggle; input group narrows |
| Desktop | 1024px–1439px | Full layout restored; 1440px container applies but with margin compression; phone mockup at full ~320px |
| Wide | ≥1440px | Maximum container width engaged; generous horizontal padding; phone mockup may enlarge slightly or gain parallax amplitude |

### Touch Targets

- `{component.button-primary}`: 56px+ effective height (16px padding top/bottom + text height + border) — exceeds WCAG AAA 44×44px minimum comfortably.
- `{component.button-primary-nav}`: ~52px height — meets minimum, adequate for thumb access.
- `{component.text-input}`: 56px declared height — excellent touch target for mobile form entry.
- `{component.nav-link}`: ~40px height with 16px horizontal padding — acceptable; tap area extends beyond text bounds due to padding.
- `{component.icon-button-close}`: 40×40px — meets minimum exactly; consider enlarging to 44px for strict AAA compliance on mobile.
- Hero input group combined: The fused input+button creates a single large tap zone (~56px tall × full viewport width minus margins), ideal for mobile thumb reach.

### Collapsing Strategy

- **Navigation**: At tablet and below, the horizontal nav links collapse into a hamburger-menu drawer sliding from the right or a full-screen overlay. The "Get a free demo" CTA likely remains visible (either in the drawer or as a standalone mobile-header button). Logo stays fixed left.
- **Hero columns**: On mobile, the two-column asymmetrical layout becomes a single vertical stack: (1) rating, (2) headline, (3) input group, (4) phone mockup centered below. The phone may shift from right-overlap to full-width centered placement.
- **Typography scaling**: `{typography.display-xl}` (88px) likely reduces to 48–56px on mobile (matching `{typography.display-lg}` desktop size) to prevent single-word line breaks and excessive scrolling. Letter-spacing scales proportionally or removes entirely below 48px.
- **Input group**: On narrow screens, the fused input+button may stack vertically (input on top, full-width button below) or the button text may shorten to just "Get report" with icon retained.
- **Phone mockup sizing**: Scales from 320px (desktop) to ~280px (tablet) to ~260px (mobile), maintaining aspect ratio. Shadow depth may reduce on smaller screens to prevent overwhelming the viewport.
- **Section padding**: Vertical `{spacing.section}` (80px) likely compresses to 40–48px on mobile, and `{spacing.xxl}` (104px) reduces to 56–64px.

### Image Behavior

- **Phone mockup**: Uses `width: 100%; max-width: 320px; object-fit: contain` pattern, scaling down proportionally on smaller viewports. The bottom-corner-cut (64px 64px 0 0) radius maintains regardless of size.
- **Avatar image**: Circular crop preserved at all breakpoints via `border-radius: 50%`; may shrink from 48px to 36px on mobile.
- **Below-fold images (anticipated)**: Restaurant/food photography likely uses `aspect-ratio: 16/9` or `3/2` containers with `object-fit: cover` and `{rounded.md}` (24px) consistent with the card system. Lazy-loaded with IntersectionObserver.

## Iteration Guide

1. Build the landing page shell using Next.js with App Router (or your preferred React framework). Set the `<html>` background to `{colors.canvas}` (mint #c2edce) so the hero band requires no wrapper div for its background color.
2. Define CSS custom properties for every token in the YAML frontmatter following the `{category.token-name}` naming convention (e.g., `--color-primary: #094413`, `--radius-lg: 32px`). Reference these variables in all component styles — never hard-code a hex or pixel value that has a token.
3. Implement the dual-typeface system by importing STK Bureau Sans (or DM Sans substitute) for the `--font-head` variable and setting the system stack as `--font-body`. Apply `font-family: var(--font-head)` to all `h1`–`h4`, `button`, `nav a`, and `.label` elements; apply `var(--font-body)` to `p`, `li`, `input`, and `.caption`.
4. Construct the hero section first: mint background, centered 1440px inner container, left-column text stack (rating → h1 → subhead → input-group), right-column absolutely-positioned phone mockup with `{extensions.shadows.card-elevated}` and `{rounded.xl}` top-only radius. Validate the headline renders at 88px with -3.52px letter-spacing.
5. Build every component in the `components:` frontmatter as a discrete React/Preact/Vanilla module, accepting className props for composition. Each component must have Default, Hover (add per convention), Active/Pressed, Disabled (where applicable), and Focus (for inputs/buttons) state variants.
6. Implement the navigation bar as a sticky-positioned element (position: sticky; top: 0; z-index: 100) with the white background, 72px height, and the five-part internal layout (logo | menu-cluster | login | cta). Add a mobile hamburger toggle at ≤1023px using a slide-out drawer.
7. Apply the motion tokens from the Extensions section: use `{extensions.motion.easing-standard}` (cubic-bezier(0.38, 0.005, 0.215, 1)) for all color/opacity transitions at 300ms, and `{extensions.motion.easing-decelerate}` (cubic-bezier(0.215, 0.61, 0.355, 1)) for transform/shadow transitions at 350–450ms. Add scroll-triggered fade-up animations for below-fold sections using Framer Motion's `whileInView`.
8. For the phone mockup interior, build a nested component tree: outer phone-frame (black, rounded-top) → status-bar → content-area → score-card (warm-bg, rounded) → score-ring-svg + score-number + denominator-text. Ensure the score ring uses an orange stroke (`#d97706` or similar from `{colors.warning}` family) against a light gray track.
9. Test responsive behavior at 375px (mobile), 768px (tablet), 1024px (small-desktop), and 1440px (full). Verify the hero stacks correctly, typography scales down (h1 to ~48px mobile), input group remains usable, and the phone mockup doesn't overflow horizontally.
10. Run accessibility audit: verify `{colors.primary}` (#094413) + `{colors.on-primary}` (#ffffff) exceeds 4.5:1 contrast ratio (it does — calculated ~10.5:1), check all interactive elements meet 44×44px touch target, ensure the star rating has proper aria-label for screen readers, and confirm the phone mockup is decorated with `aria-hidden="true"` or `role="img"` with alt text.

**Font Setup**: If STK Bureau Sans is unavailable, substitute with DM Sans from Google Fonts:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
```
CSS variable override: `--font-head: 'DM Sans', 'STK Bureau Sans', Arial, sans-serif;`

## Known Gaps

- **Hover state styling**: Per the no-hover policy, hover backgrounds, border-color shifts, and subtle lifts on cards/buttons are not documented. Implementation teams should derive hover states from the active/pressed variants using lighter treatments (e.g., 50% of the active color shift, or overlay of `rgba(255,255,255,0.1)`).
- **Loading/skeleton states**: No loading skeletons, spinners (beyond the generic `spin` keyframe name), or pending-state treatments were extractable from the static screenshot. Recommend implementing skeleton shapes using `{colors.muted-soft}` (10% ink) backgrounds with `{rounded.lg}` pulse animations.
- **Form validation states**: Beyond the `{component.text-input-focus}` variant, no error (`{colors.error}`), warning (`{colors.warning}`), or success (`{colors.success}`) input border/background treatments are documented. Design these following the existing radius and shadow language.
- **Dashboard/app surfaces**: The phone mockup shows a glimpse of the actual application UI (score card), but full dashboard surfaces (tables, charts, sidebar navigation, settings panels) are outside the landing-page viewport scope and require separate design documentation.
- **Dark mode**: The entire system is documented for `{extensions.mode}: "light"` only. No dark-mode token equivalents (inverted surfaces, adjusted text colors, desaturated brand greens) are provided. If dark mode is needed, generate inverted pairs systematically.
- **Sub-brand or enterprise palettes**: Owner.com may serve different segments (single-location vs. multi-location chains) with differentiated color treatments or "Enterprise" badges. These are not present in the hero viewport.
- **Exact shadow values for undetected components**: Only two shadow values were extracted (`inset-hairline` and `card-elevated`). Dropdown menus, tooltips, and popover surfaces likely need intermediate shadow levels not captured here.
- **Third-party cookie banner customization**: The Osano cookie consent widget detected in the DOM ships with its own styling that partially conflicts with Owner.com's design language (different radius, timing). Document whether this should be skinned to match, or accepted as-is.
- **Marquee/testimonial strip implementation details**: While `grow-marquee` and `translateX` keyframes are detected, the exact content, speed, and pause-on-hover behavior of any scrolling review/logo strip cannot be determined from a single viewport.
- **Interactive phone mockup behavior**: Whether the phone mockup is a static image, a CSS/SVG construction, or an embedded iframe/Lottie animation is unclear. The extracted DOM suggests it may be a complex HTML/CSS construction rather than a raster image.