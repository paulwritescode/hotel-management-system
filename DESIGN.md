## Overview

MiniMax stages itself as a Chinese AI infrastructure brand with a sophisticated dual identity. Marketing surfaces and platform pages anchor in stark white canvas with deep-black typographic emphasis — the brand voice is confident, technical, almost editorial. But each model release gets its own vibrant gradient identity card: M2.7 in volcanic coral-red, Music 2.6 in magenta-pink, Hailuo in deep blue, Speech 2.8 in saturated orange-purple. Together these vibrant tiles read like album covers laid out on the homepage — each one declaring its own product personality.

DM Sans anchors every surface from oversized 80px hero displays down to 12px micro labels. The geometric, slightly humanist character of the face suits both the dense documentation surfaces (where 14px body type carries 1.5 line-height for long-form prose) and the high-impact marketing displays (where -2px letter-spacing tightens 80px headlines). Buttons are universally pill-shaped (`rounded-full`) with a sharp two-tier system: black-pill primary (the dominant CTA) and outline-pill secondary. Cards split into two distinct families: vibrant gradient product showcases (32px corner softening) and quiet white documentation cards (16px corner softening).

**Key Characteristics:**

- Stark monochrome palette — black ({colors.primary}) and white ({colors.canvas}) — broken open by saturated brand-color gradient cards
- Distinct product-color encoding: each model line has its own vibrant brand color (coral M2.7, magenta Music 2.6, blue Hailuo, orange Speech 2.8)
- DM Sans across the entire system; Inter as fallback
- Pill-shaped buttons ({rounded.full}) and pill-shaped tabs everywhere; rectangular forms only inside data tables and dense docs
- Hero typography uses tight 1.10 line-height with -2px letter-spacing for impact
- Documentation surfaces use a 3-column layout: left sidebar nav, center prose body, right table-of-contents
- Black promo banners ({colors.primary}) above the nav for time-bound brand moments

## Colors

> Source pages: minimax.io/ (homepage), /models/text/m27 (product showcase), platform.minimax.io/docs/guides/models-intro (documentation), /subscribe/token-plan (pricing). Token coverage was identical across all four pages.

### Brand & Accent

- **Brand Coral** ({colors.brand-coral}): Signature high-impact accent. Used on M2.7 product card, "Token Plan" hero band, promo CTA strips, and "NEW" badges. Carries the brand's most attention-grabbing energy.
- **Brand Magenta** ({colors.brand-magenta}): Secondary product-card identity (Music 2.6); used for music/audio product encoding.
- **Brand Blue** ({colors.brand-blue}): Hailuo video product identity; primary blue accent across the system.
- **Brand Blue Deep** ({colors.brand-blue-deep}): Form-control activation, link emphasis.
- **Brand Blue 700** ({colors.brand-blue-700}): Documentation tag and reference text color.
- **Brand Cyan** ({colors.brand-cyan}): Atmospheric blue for product gradients and decorative wash.
- **Brand Blue 200** ({colors.brand-blue-200}): Code badges, info-tag backgrounds.
- **Brand Purple** ({colors.brand-purple}): Speech 2.8 and minor purple-product identity; gradient mate for magenta cards.

### Surface

- **Canvas White** ({colors.canvas}): Primary page background and card surface.
- **Surface** ({colors.surface}): Subtle section backgrounds, search-pill rest, sidebar-nav active state.
- **Surface Soft** ({colors.surface-soft}): Quieter section divisions.
- **Hairline** ({colors.hairline}): 1px input border and primary divider.
- **Hairline Soft** ({colors.hairline-soft}): Quieter table-row divider and secondary section break.

### Text

- **Ink** ({colors.ink}): Primary headline and CTA text — the brand's near-black anchor.
- **Ink Strong** ({colors.ink-strong}): Pure black used in promo banners and hero displays for maximum contrast.
- **Charcoal** ({colors.charcoal}): Body text on light surfaces.
- **Slate** ({colors.slate}): Secondary text, metadata.
- **Steel** ({colors.steel}): Tertiary text, table headers, sidebar inactive items.
- **Stone** ({colors.stone}): Muted captions and tab inactive labels.
- **Muted** ({colors.muted}): Footer link text and de-emphasized labels.

### Semantic

- **Success Background** ({colors.success-bg}): Pale-green wash for success badges and confirmations.
- **Success Text** ({colors.success-text}): Deep-green ink for success badge labels.
- Error tones derive from a `#d45656` red used in input border error states (not extracted as a top-level system token).

## Typography

### Font Family

**DM Sans** (primary): Geometric variable sans-serif. Used across every surface, every role. Fallbacks: Inter, Helvetica Neue, Helvetica, Arial.

DM Sans was chosen for its dual fluency: it scales cleanly from 80px hero displays (where -2px letter-spacing creates magazine-grade tightness) down to 12px micro labels (where the slightly humanist counters maintain legibility). The face has no italic variant in the brand's deployment — emphasis comes from weight (500/600/700) instead.

### Hierarchy

| Token | Size | Weight | Line Height | Letter Spacing | Use |
|---|---|---|---|---|---|
| `{typography.hero-display}` | 80px | 600 | 1.10 | -2px | Homepage hero ("MiniMax Music 2.6") |
| `{typography.display-lg}` | 56px | 600 | 1.10 | -1.5px | Section openers, major page heroes |
| `{typography.heading-lg}` | 40px | 600 | 1.20 | -1px | Sub-page headlines ("Token Plan", "Models Overview") |
| `{typography.heading-md}` | 32px | 600 | 1.25 | -0.5px | Subsection headers ("Full-Stack Model Matrix") |
| `{typography.heading-sm}` | 24px | 600 | 1.30 | 0 | Card titles, feature headers |
| `{typography.card-title}` | 20px | 600 | 1.40 | 0 | Product-card titles, feature-tile headers |
| `{typography.subtitle}` | 18px | 500 | 1.50 | 0 | Section subtitles, lead body |
| `{typography.body-md}` | 16px | 400 | 1.50 | 0 | Primary body text |
| `{typography.body-md-bold}` | 16px | 700 | 1.50 | 0 | Body emphasis |
| `{typography.body-sm}` | 14px | 400 | 1.50 | 0 | Secondary body, table cells, navigation |
| `{typography.body-sm-medium}` | 14px | 500 | 1.50 | 0 | Active sidebar nav, button labels |
| `{typography.caption}` | 13px | 400 | 1.70 | 0 | Documentation captions, fine print |
| `{typography.caption-bold}` | 13px | 600 | 1.50 | 0 | Badge labels, table-header text |
| `{typography.micro}` | 12px | 400 | 1.50 | 0 | Footer microcopy, chip labels |
| `{typography.button-md}` | 14px | 600 | 1.40 | 0 | Pill button labels |

### Principles

- **Tight hero leading** (1.10) and aggressive negative letter-spacing on display sizes create a magazine-quality typographic display unique to MiniMax.
- **Generous body leading** (1.50) keeps long-form documentation comfortable; captions push to 1.70 for scientific-paper-grade clarity.
- **Weight discipline:** 400 (body), 500 (medium emphasis), 600 (headings/buttons), 700 (strong inline emphasis). Heavier weights are not used.
- **Single typeface** strategy — never mix DM Sans with another sans-serif. Code samples (when shown) use a system monospace fallback, but no second typeface enters the brand canvas.

## Layout

### Spacing System

- **Base unit**: 4px (8px primary increment).
- **Tokens**: `{spacing.xxs}` (4px) · `{spacing.xs}` (8px) · `{spacing.sm}` (12px) · `{spacing.md}` (16px) · `{spacing.lg}` (20px) · `{spacing.xl}` (24px) · `{spacing.xxl}` (32px) · `{spacing.xxxl}` (40px) · `{spacing.section-sm}` (48px) · `{spacing.section}` (64px) · `{spacing.section-lg}` (80px) · `{spacing.hero}` (96px).
- **Section rhythm**: Marketing pages separate at `{spacing.hero}` (96px) above-fold, then `{spacing.section-lg}` (80px) below; documentation tightens to `{spacing.section}` (64px); table rows compress to `{spacing.md}` (16px).
- **Card internal padding**: Vibrant product cards use `{spacing.xxl}` (32px); documentation cards use `{spacing.lg}–{spacing.xl}` (20–24px); promo strips expand to `{spacing.section}` (64px).

### Grid & Container

- Marketing pages use a 1280px max-width with 32px gutters.
- Homepage product matrix renders as a 4-column row of 32px-rounded gradient cards, each ~280–320px wide.
- AI Product Matrix below uses a 4-column grid with 16px-rounded white cards.
- Documentation surfaces use a 3-column layout: left sidebar nav (~220px), center prose body (~720px max-width), right TOC (~180px). Sidebar persists on desktop; collapses to drawer below 1024px.
- Token Plan / pricing pages use 2-column tabs above a 3-column tier card grid.

### Whitespace Philosophy

Marketing pages give product photography and color cards generous breathing room — `{spacing.hero}` (96px) above-the-fold creates visual oxygen for the 80px hero display. Inside documentation, whitespace tightens dramatically: section gaps drop to `{spacing.xxl}` (32px), table rows pack down to `{spacing.md}` (16px), and the sidebar nav uses `{spacing.xs}` (8px) vertical rhythm.

## Elevation & Depth

The system runs predominantly flat. Elevation is reserved for sticky panels, dropdowns, and the rare floating CTA.

| Level | Treatment | Use |
|---|---|---|
| 0 (flat) | No shadow; `{colors.hairline}` border | Default cards, table rows, form inputs |
| 1 (subtle) | `rgba(0, 0, 0, 0.04) 0px 1px 2px 0px` | Card-recommendation, hover-elevated tiles |
| 2 (card) | `rgba(0, 0, 0, 0.08) 0px 4px 6px 0px` | Standard feature cards, dropdowns |
| 3 (atmospheric) | `rgba(0, 0, 0, 0.08) 0px 0px 22px 0px` | Diffuse glow on featured product cards |
| 4 (modal) | `rgba(36, 36, 36, 0.08) 0px 12px 16px -4px` | Modals, confirmation dialogs, sticky panels |

### Decorative Depth

- The vibrant gradient product cards carry their own atmospheric depth via internal radial gradients and silhouette imagery — no shadow needed; the color does the work.
- Brand-tinted shadows (`rgba(44, 30, 116, 0.16) 0px 0px 15px`) appear under purple-themed cards for subtle ambient lift.
- Dotted/grain textures occasionally appear inside product cards as photographic-content decoration; these are not formalized as system tokens.

## Shapes

### Border Radius Scale

| Token | Value | Use |
|---|---|---|
| `{rounded.xs}` | 4px | Code chips, micro-controls |
| `{rounded.sm}` | 6px | Compact controls, table cells |
| `{rounded.md}` | 8px | Inputs, secondary buttons, search pill |
| `{rounded.lg}` | 12px | Documentation cards, recommendation tiles |
| `{rounded.xl}` | 16px | Standard feature cards, AI product tiles |
| `{rounded.xxl}` | 20px | Larger feature panels |
| `{rounded.xxxl}` | 24px | AI product tile feature variants |
| `{rounded.hero}` | 32px | Vibrant gradient product cards, promo CTA strip |
| `{rounded.full}` | 9999px | All buttons, all pill tabs, badges |

### Photography Geometry

- Vibrant product cards use 32px corner softening — distinct from the 16px used on quiet white cards. The doubled radius is the visual signature of "this is a featured product moment."
- Product imagery inside cards is treated as photographic content (silhouettes, dark portrait studio lighting) without rounded internal frames.
- Avatar circles (rare, in testimonials) are `{rounded.full}` — perfect circles.

## Components

> Per the no-hover policy, hover states are NOT documented. Default and pressed/active states only.

### Buttons

- **`button-primary`** — Black pill primary CTA, the dominant action across all surfaces. Background `{colors.primary}`, text `{colors.on-primary}`, typography `{typography.button-md}`, padding `11px 24px`, rounded `{rounded.full}`. Pressed `button-primary-pressed` lifts to `{colors.charcoal}`. Disabled `button-primary-disabled` uses `{colors.hairline}` background and `{colors.muted}` text.
- **`button-secondary`** — Outlined pill secondary action, paired with primary in dual-CTA hero patterns. Background transparent, text `{colors.ink}`, border `1px solid {colors.ink}`, rounded `{rounded.full}`.
- **`button-tertiary`** — White-fill quieter pill. Background `{colors.canvas}`, text `{colors.ink}`, border `1px solid {colors.hairline}`, rounded `{rounded.full}`.
- **`button-link`** — Inline text link styled as a subtle button. Underline appears on activation.
- **`button-icon-circular`** — 36×36px circular utility button. Background `{colors.canvas}`, border `1px solid {colors.hairline}`, rounded `{rounded.full}`.

### Vibrant Product Cards

- **`product-card-coral`** — M2.7 / Token Plan signature card. Background `{colors.brand-coral}`, text `{colors.on-dark}`, rounded `{rounded.hero}` (32px), padding `{spacing.xxl}`.
- **`product-card-magenta`** — Music 2.6 showcase. Background `{colors.brand-magenta}`.
- **`product-card-blue`** — Hailuo Video showcase. Background `{colors.brand-blue}`.
- **`product-card-purple`** — Speech 2.8 / variant showcase. Background `{colors.brand-purple}`.
- **`product-card-photo`** — Dark portrait product card. Background `{colors.primary}` with overlaid photo.

### Cards & Containers

- **`card-base`** — Standard doc/feature card. Background `{colors.canvas}`, rounded `{rounded.xl}`, padding `{spacing.xl}`, border `1px solid {colors.hairline}`.
- **`card-feature`** — Quieter panel on light gray. Background `{colors.surface}`, rounded `{rounded.xl}`, padding `{spacing.xxl}`.
- **`card-recommendation`** — "Recommended Reading" tile. Background `{colors.canvas}`, rounded `{rounded.lg}`, padding `{spacing.lg}`, border `1px solid {colors.hairline}`.
- **`promo-cta-card`** — Bright coral promo strip with embedded white CTA pill. Background `{colors.brand-coral}`, rounded `{rounded.hero}`, padding `{spacing.section}`.
- **`ai-product-tile`** — White card in the AI Product Matrix. Background `{colors.canvas}`, rounded `{rounded.xxxl}`, padding `{spacing.xl}`, border `1px solid {colors.hairline}`.

### Inputs & Forms

- **`text-input`** — Background `{colors.canvas}`, text `{colors.ink}`, border `1px solid {colors.hairline}`, rounded `{rounded.md}`, padding `{spacing.sm} {spacing.md}`, height 40px.
- **`text-input-focused`** — Border switches to `2px solid {colors.brand-blue-deep}`.
- **`text-input-error`** — Border `1px solid #d45656`; error label below in matching red.
- **`search-pill`** — Background `{colors.surface}`, text `{colors.steel}`, rounded `{rounded.md}`, height 36px, border `1px solid {colors.hairline}`.

### Tabs

- **`segmented-tab` / `segmented-tab-active`** — Underline-style tab nav. Inactive: text `{colors.steel}`, transparent bg. Active: text `{colors.ink}`, 2px bottom border in `{colors.ink}`.
- **`pill-tab` / `pill-tab-active`** — Inactive: bg `{colors.canvas}`, text `{colors.steel}`, border `1px solid {colors.hairline}`, rounded `{rounded.full}`. Active: bg `{colors.primary}`, text `{colors.on-primary}`.

### Badges & Status

- **`badge-success`** — Bg `{colors.success-bg}`, text `{colors.success-text}`, rounded `{rounded.full}`, padding `4px 10px`.
- **`badge-new`** — Coral "NEW"/"Live" pill. Bg `{colors.brand-coral}`, text `{colors.on-dark}`.
- **`badge-beta`** — Pale-blue informational pill. Bg `{colors.brand-blue-200}`, text `{colors.brand-blue-deep}`.
- **`badge-code`** — Inline code chip. Bg `{colors.brand-blue-200}`, text `{colors.brand-blue-deep}`, rounded `{rounded.sm}`, padding `2px 6px`.
- **`promo-banner`** — Sticky black strip above the top nav. Bg `{colors.primary}`, text `{colors.on-primary}`, padding `{spacing.sm} {spacing.lg}`.

### Data Tables

- **`data-table`** — Bg `{colors.canvas}`, text `{colors.ink}`, rounded `{rounded.md}`, border `1px solid {colors.hairline}`.
- **`data-table-header`** — Bg `{colors.surface}`, text `{colors.steel}`, padding `{spacing.sm} {spacing.md}`.
- **`data-table-row`** — Bg `{colors.canvas}`, text `{colors.ink}`, padding `{spacing.md}`, bottom border `1px solid {colors.hairline-soft}`.

### Navigation

- **Top Navigation (Marketing)** — Sticky white bar, height ~64px, bottom border `1px solid {colors.hairline-soft}`. Left: wordmark + link list. Right: black-pill "Contact Us" + outlined-pill "Login".
- **Top Navigation (Docs/Platform)** — Compressed nav ~56px with center search-pill and right-side account/upgrade CTAs.
- **`sidebar-nav-item` / `sidebar-nav-item-active`** — Inactive: transparent, text `{colors.charcoal}`, rounded `{rounded.sm}`, padding `{spacing.xs} {spacing.md}`. Active: bg `{colors.surface}`, text `{colors.ink}`.
- **`doc-toc-item`** — Right-rail TOC links. Transparent, text `{colors.steel}`; active shifts to `{colors.ink}`.

### Signature Components

- **`hero-band-marketing`** — Centered 80px display + dual-CTA pair (`button-primary` + `button-secondary`).
- **`product-matrix-grid`** — 4-column row of vibrant gradient product cards; uniform ~360–400px heights; scrolls horizontally on mobile.
- **`ai-product-matrix`** — 4-column grid of white product tiles below the vibrant matrix.
- **`docs-prose-block`** — Max-width ~720px, centered; body `{typography.body-md}` line-height 1.6; inline code with `{colors.surface}` bg and `{rounded.xs}`.
- **`models-comparison-table`** — Documentation `data-table` comparing model sizes/features.
- **`testimonial-stat-row`** — Horizontal row of 4 stat cells with a large number in `{typography.heading-lg}` and label below.
- **`footer-region`** — Dense black-canvas multi-column footer; 4-column link grid.
- **`footer-link`** — Transparent, text `{colors.muted}`; only opacity shifts on activation.

## Do's and Don'ts

### Do

- Use `{colors.primary}` (black) as the dominant CTA — the brand's most recognizable interactive element.
- Reserve product brand colors (coral, magenta, blue, purple) ONLY for product-identity moments — never for general buttons or text.
- Pair `{rounded.hero}` (32px) gradient cards with `{rounded.xl}` (16px) white cards in the same viewport — the radius contrast is the visual signature.
- Apply `{rounded.full}` to every button, every pill tab, every badge.
- Use `{typography.hero-display}` (80px) with -2px letter-spacing for hero displays.
- Treat each model/product line as a distinct color identity.

### Don't

- Don't use brand-coral or brand-magenta on body text or large surfaces.
- Don't soften corners on buttons (anything less than `{rounded.full}`); the pill is a brand signature.
- Don't introduce a second display typeface; DM Sans handles every role.
- Don't reduce hero leading below 1.10.
- Don't apply heavy shadows on white cards; flat-with-borders is the documentation default.
- Don't put gradient backgrounds on standard buttons.

## Responsive Behavior

### Breakpoints

| Name | Width | Key Changes |
|---|---|---|
| Mobile (small) | < 480px | Single column. Hero drops to 40px. Pill nav collapses to hamburger. Product matrix horizontal-scroll. Footer 1-column accordion. |
| Mobile (large) | 480 – 767px | Same as small but AI product matrix renders 2-up. |
| Tablet | 768 – 1023px | 2-column AI product matrix. Pill-tab nav returns. Documentation sidebar collapses to drawer. |
| Desktop | 1024 – 1279px | Full 4-column product matrix; 3-column docs grid (sidebar / body / TOC). |
| Wide Desktop | ≥ 1280px | Wider hero gutters, larger product photography, fixed 220px sidebar. |

### Touch Targets

- Pill buttons render at 38–40px effective height — bumps to 44px on mobile via padding override.
- Circular icon buttons: 36×36px desktop → 44×44px on mobile.
- Form inputs render at 40px height; bumps to 44px on mobile.
- Sidebar nav items render at ~32px tall — bumps to 44px on mobile drawers.

### Collapsing Strategy

- **Promo banner** stays full-width; collapses to single line at < 480px with truncation.
- **Top nav** below 1024px collapses to hamburger; horizontal links move into drawer.
- **Documentation grid**: 3-column desktop → sidebar-drawer at < 1024px → single-column with collapsible sidebar at < 768px.
- **Product matrix**: 4-column desktop → horizontal-scroll at < 1024px.
- **AI Product Matrix**: 4-column → 2-column at tablet → 1-column at mobile.
- **Hero typography**: 80px → 56px at < 1024px → 40px at < 768px → 32px at < 480px.
- **Stats strip**: 4-column → 2×2 at < 768px → 1-column at < 480px.

### Image Behavior

- Product card imagery uses photographic content with internal gradient overlays; lazy-loaded below the fold.
- AI product tile illustrations are SVG-based; remain crisp at all breakpoints.
- Avatar imagery in testimonials uses 1:1 aspect ratio with `{rounded.full}` masking.

## Known Gaps

- Specific dark-mode token values are not surfaced; the brand has not yet shipped a published dark-mode palette.
- Animation/transition timings are not extracted; recommend 150–200ms ease for state transitions.
- Form validation success state is not explicitly captured beyond defaults.
- Code syntax highlighting palette inside docs is not formalized.

---

## Application notes for this repository

This is an operational restaurant console, not a marketing/docs site, so the MiniMax language is adapted rather than copied literally:

- Black (`--hf-primary` = `#0a0a0a`) is the dominant CTA; brand colors are reserved for identity/status (landing role tiles, order-active accents, badges).
- DM Sans is loaded via Google Fonts with an Inter fallback and drives every surface.
- The dense dashboard scale is preserved; the 80px hero scale applies only to the public landing/login surfaces.
- Tokens live as CSS variables in `apps/web/app/globals.css`; Tailwind exposes matching color and radius scales in `apps/web/tailwind.config.ts`.
