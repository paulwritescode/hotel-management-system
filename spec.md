#+TITLE: Heavenly Foods — AI-Powered Restaurant Management System
#+SUBTITLE: System & Technical Specification
#+CLIENT: Heavenly Foods Restaurant
#+VENDOR: Biasharawatch Technologies (a part of Samchi Digital)
#+VERSION: 1.0.0
#+DATE: 2026-07-22
#+SCOPE: MVP — single restaurant, live demo
#+STATUS: SPEC FROZEN — implementation may begin
#+AGENT_ENTRYPOINT: ./BUILD.lisp

---

# 0. How to read this document

This spec is the **single source of truth** for the Heavenly Foods build. It is
paired with `BUILD.lisp`, which is the machine-readable instruction layer the
coding agent executes. Where the two disagree, **this document wins** and
`BUILD.lisp` must be corrected.

Conventions used throughout:

| Marker | Meaning |
|---|---|
| `[MVP]` | Must exist in the demo build. Non-negotiable. |
| `[P2]` | Phase 2. Spec'd here so the shape is known. Agent must NOT build it. |
| `[STUB]` | Build the interface and a trivial implementation only. |
| `MUST` / `MUST NOT` | Hard requirement (RFC 2119 sense). |
| `SHOULD` | Strong default; deviation requires a written reason in the PR. |

**Build posture:** this is an hours-scale MVP, not an 11-week engagement. The
original proposal's 8-week development window is compressed by deferring OCR,
rostering, broadcast messaging, and the analytics cold store. Everything marked
`[MVP]` below is achievable in a single focused session because the data model
is small, the hosting is serverless, and the realtime layer is provided by
Convex rather than hand-rolled.

---

# 1. Project overview

## 1.1 What this system is

A restaurant operations platform for a single physical restaurant, where the
**customer-facing ordering channel is WhatsApp** and the **staff-facing surface
is a web dashboard**. A diner sits at a table, scans a QR code, is dropped into
a WhatsApp chat with the restaurant's bot, browses the live menu, orders, and
the order appears instantly on the counter dashboard. Staff mark items
available or unavailable in real time and the bot immediately stops offering
them.

## 1.2 What this system is not

- Not a delivery platform. Ordering is in-house only; every order is bound to a
  physical table number.
- Not a payments system. Payment is settled at the counter as it is today.
  No M-Pesa, card, or wallet integration in MVP.
- Not multi-tenant in MVP. One restaurant, one WABA number, one Convex
  deployment. The schema carries a `restaurantId` on every row so multi-tenancy
  is a later configuration change rather than a migration.

## 1.3 Actors

| Actor | Surface | Auth |
|---|---|---|
| Diner | WhatsApp | Phone number (implicit, from WhatsApp) |
| Counter staff | Web dashboard `/counter` | Staff PIN |
| Waiter | Web dashboard `/waiter` | Staff PIN |
| Manager | Web dashboard `/manager` | Staff PIN (elevated role) |

## 1.4 Success criteria for the demo

The demo is successful if, in front of the client, this sequence works end to
end without intervention:

1. Manager opens `/manager`, adds a dish, sets it available.
2. Diner scans the table QR, lands in WhatsApp, sees the dish in the menu.
3. Diner orders it, gives their name, confirms.
4. Order appears on `/counter` within two seconds without a page refresh.
5. Counter marks the dish unavailable.
6. A second diner opens the menu and the dish is gone.
7. Counter marks the order served; the diner receives a WhatsApp feedback
   prompt; the rating lands on `/manager` analytics.

---

# 2. Feature specification

Each feature below traces back to a line item in the client proposal dated
21 July 2026. Proposal section numbers are given in parentheses.

## 2.1 Inventory & menu management (Proposal §2.I, §2.II)

### 2.1.1 Manual item entry `[MVP]`

The manager can create, edit, and archive menu items. This is the primary
onboarding path for the demo and replaces bulk import entirely for a single
restaurant with a modest menu.

Fields on a menu item:

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | yes | Displayed to diner verbatim |
| `nameSwahili` | string | no | Shown when diner's session language is `sw` |
| `description` | string | no | One line, shown in menu detail |
| `category` | enum | yes | See category list below |
| `priceKes` | integer | yes | Whole KES. No decimals. Kenya prices are integral. |
| `available` | boolean | yes | Defaults true |
| `quantityOnHand` | integer | no | Optional counter; null means "not tracked" |
| `unit` | string | no | `kg`, `pcs`, `bundle`, `plate`, `L` |
| `archived` | boolean | yes | Soft delete. Archived items never appear anywhere. |

Categories (fixed enum in MVP, extensible later):
`staple`, `vegetable`, `meat`, `bread`, `drink`, `dessert`, `side`.

Rules:

- `priceKes` MUST be a positive integer. Reject `0` and negatives at the
  validation layer, not just the UI.
- Editing a price MUST NOT retroactively change the price on any existing
  order. Orders snapshot the price at the moment of ordering (see §2.3.6).
- Archiving an item MUST NOT delete it. Historical orders reference it.

### 2.1.2 CSV / Excel import `[MVP]`

For a restaurant that already keeps a digital list. Accepts `.csv` and `.xlsx`.

Flow:

1. Manager uploads the file at `/manager/inventory/import`.
2. Client-side parse (no server round trip needed for preview).
3. System infers a column mapping and shows it for confirmation. Inference
   matches on lowercased, whitespace-stripped header names against a synonym
   table (`item`/`name`/`dish` → `name`; `price`/`bei`/`cost` → `priceKes`;
   `qty`/`quantity`/`idadi` → `quantityOnHand`).
4. Manager can override any mapping via a dropdown per column.
5. Live preview table shows the first 20 parsed rows with per-row validation
   errors inline.
6. Rows failing validation are excluded and listed separately. The manager can
   proceed with the valid subset.
7. Manager approves; rows are inserted in a single Convex mutation.

Rules:

- The import MUST be idempotent on re-upload of the same file: match on
  `name` + `category` and update rather than duplicate.
- The manager MUST be able to retain original column names as a stored mapping
  profile, so the second import of the same spreadsheet format needs no
  re-mapping. Store the profile on the restaurant document.
- Import MUST be atomic. Either the whole approved batch lands or none of it
  does.

### 2.1.3 Handwritten book OCR `[P2]`

**The agent MUST NOT build this.** Deferred to Phase 2 by explicit client
decision. Specified here only so that the import pipeline is designed with the
right seam.

Intended shape when built: image upload → Cloudflare R2 → vision model extracts
a table → same preview/correct/approve UI as §2.1.2 → same bulk insert
mutation. Because §2.1.2 already separates *parsing* from *preview* from
*commit*, adding OCR later is a new parser behind the existing
`ParsedInventoryBatch` interface and nothing downstream changes.

The seam the agent MUST create today: define the type

```ts
type ParsedInventoryBatch = {
  source: 'manual' | 'csv' | 'xlsx' | 'ocr'
  rows: ParsedInventoryRow[]
  warnings: string[]
}
```

and have the CSV parser produce it. The OCR parser will produce the same type.

### 2.1.4 Stock availability toggle `[MVP]`

The single most-used control in the system. Counter staff and managers can flip
an item between available and unavailable with one tap.

Rules:

- The toggle MUST be optimistic in the UI and reconciled against the server
  result. A failed write MUST revert the toggle visibly and show a toast.
- Toggling MUST propagate to every connected dashboard within two seconds
  without a refresh. This is free via Convex reactive queries.
- An item toggled unavailable MUST immediately stop appearing in the WhatsApp
  menu. The bot reads live state on every menu render; there is no cached menu.
- If a diner has an unavailable item already in their in-progress cart, the bot
  MUST tell them at confirmation time and offer to remove it, rather than
  silently dropping it or failing the whole order.

### 2.1.5 Quantity depletion `[MVP, minimal]`

When `quantityOnHand` is non-null, confirming an order decrements it by the
ordered quantity. When it reaches zero, the item auto-toggles to unavailable
and a notice appears on the counter dashboard.

Rules:

- Decrement MUST happen inside the same Convex mutation that creates the order,
  so it cannot be lost to a partial failure.
- The system MUST NOT allow the counter to go negative. If the decrement would
  go below zero, the order confirmation fails with a clear message and the
  diner is told the item just ran out.

## 2.2 QR code table entry (Proposal §2.III)

### 2.2.1 QR generation `[MVP]`

Manager can generate and print a QR code per table from `/manager/tables`.

The QR encodes a WhatsApp deep link:

```
https://wa.me/<PHONE_NUMBER_ID_MSISDN>?text=Table%20<TABLE_NUMBER>
```

Scanning opens WhatsApp with the message pre-filled. The diner taps send. The
bot receives `Table 7`, extracts the table number, and binds the session.

Rules:

- The pre-filled text MUST be parseable by a strict regex on the bot side:
  `/^table\s*(\d{1,3})$/i`. Anything else falls through to the generic greeting
  flow which asks for the table number explicitly.
- QR codes MUST be generated client-side (no server round trip, no external QR
  service) and MUST be printable at a size legible from 40cm.
- Each table's QR MUST be distinct. Do not use a single generic QR that asks
  for the table number — that defeats the anti-scam timestamping in §2.3.5.

## 2.3 WhatsApp ordering bot (Proposal §2.III)

The heart of the system. Everything else exists to serve this flow.

### 2.3.1 Transport `[MVP]`

Meta WhatsApp Cloud API (Graph API v21.0), real provisioned WABA number.

Inbound: Meta POSTs to `POST /webhooks/whatsapp` on the Hono worker.
Outbound: worker POSTs to `https://graph.facebook.com/v21.0/{PHONE_NUMBER_ID}/messages`.

### 2.3.2 Webhook verification handshake `[MVP]`

Meta performs a GET verification when the webhook URL is first registered.

```
GET /webhooks/whatsapp
  ?hub.mode=subscribe
  &hub.verify_token=<VERIFY_TOKEN>
  &hub.challenge=<random>
```

The handler MUST compare `hub.verify_token` against the `VERIFY_TOKEN`
environment variable using a **constant-time comparison**, and on match return
`hub.challenge` as a bare `text/plain` body with status 200. On mismatch return
403 with an empty body. It MUST NOT echo the challenge on mismatch and MUST NOT
log the received token.

### 2.3.3 Signature validation `[MVP]`

Every inbound POST carries `X-Hub-Signature-256: sha256=<hex>`, an HMAC-SHA256
of the **raw request body** keyed by the Meta app secret.

The handler MUST:

- Read the raw body as text **before** parsing JSON. Re-serializing parsed JSON
  produces a different byte sequence and the signature will never match.
- Compute HMAC-SHA256 using `crypto.subtle` (available in the Workers runtime).
- Compare in constant time against the header value.
- Return 401 and process nothing on mismatch.
- Return 200 quickly on match — Meta retries aggressively on non-2xx, and
  retries for up to 24 hours.

### 2.3.4 Idempotency `[MVP]`

Meta may deliver the same message more than once. Every inbound message carries
a unique `id` (the WAMID).

The handler MUST record processed WAMIDs in a Convex table with a TTL of 24
hours and MUST skip any message whose WAMID is already recorded. The check and
the record MUST happen in the same mutation to avoid a race between two
concurrent deliveries of the same message.

### 2.3.5 Conversation flow `[MVP]`

The bot is a **deterministic state machine** with an LLM used only for
recommendation phrasing (§2.3.7). It MUST NOT be a free-form LLM agent — an
ordering flow that hallucinates a dish or a price is a business risk, and a
state machine is also far faster and cheaper.

States:

```
IDLE
  → GREETED          (inbound message received, session created)
GREETED
  → AWAITING_TABLE   (table number not derivable from the entry message)
  → BROWSING         (table number bound)
AWAITING_TABLE
  → BROWSING         (valid table number supplied)
BROWSING
  → CATEGORY         (diner picks a category)
  → CART             (diner adds an item)
CATEGORY
  → CART             (diner adds an item)
  → BROWSING         (diner goes back)
CART
  → BROWSING         (diner adds more)
  → AWAITING_NAME    (diner confirms cart)
AWAITING_NAME
  → AWAITING_CONSENT (name captured)
AWAITING_CONSENT
  → PLACED           (consent answered either way — consent is not a gate)
PLACED
  → AWAITING_FEEDBACK (counter marks order served)
AWAITING_FEEDBACK
  → CLOSED            (rating captured, or 30 minutes elapse)
```

Rules:

- A session MUST expire after 30 minutes of inactivity and return to `IDLE`.
  An expired session that receives a message starts fresh rather than resuming
  a stale cart.
- The diner MUST be able to type `menu`, `cart`, `cancel`, or `help` from any
  state and have it handled. These are checked before state-specific parsing.
- `cancel` from `CART` or earlier clears the cart and returns to `BROWSING`.
  `cancel` after `PLACED` does NOT cancel the order — it tells the diner to
  speak to their waiter. Only staff can cancel a placed order.
- Every outbound message MUST be under 1024 characters (WhatsApp interactive
  body limit) — paginate the menu rather than truncating it.
- Menu rendering MUST use WhatsApp interactive list messages where the option
  count is ≤ 10, and paginated interactive lists beyond that. Free-text number
  entry MUST also be accepted as a fallback, because interactive messages fail
  on some client versions.

### 2.3.6 Order placement `[MVP]`

On confirmation the system creates an order in a single Convex mutation that:

1. Re-validates every cart line against live item state (exists, not archived,
   still available, sufficient quantity).
2. Snapshots `name` and `priceKes` onto each order line. Order lines MUST NOT
   be a live reference to the menu item price.
3. Computes `totalKes` server-side. The client-supplied total is ignored
   entirely — it is not trusted, not compared, not logged as an error.
4. Decrements `quantityOnHand` where tracked.
5. Writes the order with status `pending` and the bound `tableNumber`,
   `customerName`, `customerPhone`, and `placedAt`.

If step 1 fails for any line, the whole mutation aborts and the bot tells the
diner precisely which item became unavailable.

### 2.3.7 Smart recommendations `[MVP]`

When a diner asks for a suggestion, or states a budget ("something under 500"),
the bot returns up to three items.

Implementation: **candidate selection is deterministic, phrasing is LLM.**

1. Filter available, non-archived items by any stated budget and category.
2. Rank by a simple score: recent order count (last 7 days) descending, then
   price ascending.
3. Take the top three.
4. Pass **only those three items** to the LLM with a prompt that instructs it to
   write one warm sentence per item using only the supplied name, price, and
   description.

Rules:

- The LLM MUST NOT be given the full menu, and MUST NOT be asked to choose
  items. It phrases; it does not select. This makes hallucinated dishes
  structurally impossible.
- If the LLM call fails or times out (2 second budget), the bot MUST fall back
  to a plain templated list. A recommendation failure MUST NOT block ordering.
- The LLM response MUST be validated: if the returned text mentions a price or
  item name not in the three supplied, discard it and use the template.

### 2.3.8 Anti-scam measures `[MVP]`

Directly from the proposal. The threat is a diner ordering to a table they are
not sitting at, or staff fabricating orders.

- **Table binding**: every order carries a table number, either from the QR
  deep link or explicitly supplied and confirmed.
- **Waiter verification**: an order placed via WhatsApp enters status `pending`
  and MUST be acknowledged by a staff member on the counter dashboard before it
  moves to `preparing`. The acknowledging staff member's id is recorded on the
  order.
- **Customer identity**: name is captured in-flow; phone number comes from
  WhatsApp and cannot be spoofed by the diner.
- **Timestamps**: `placedAt`, `acknowledgedAt`, `servedAt`, `closedAt` are all
  recorded server-side using server time. Client-supplied timestamps MUST be
  ignored.

### 2.3.9 Post-order feedback `[MVP]`

When an order is marked served, the bot sends a feedback prompt after a short
delay (default 10 minutes, configurable).

- One interactive message with a 1–5 rating.
- On rating ≤ 3, one follow-up free-text question asking what went wrong. The
  free-text answer is stored verbatim and surfaced on the manager dashboard.
- Feedback is optional. No reminders, no second prompt.

### 2.3.10 Marketing consent `[MVP]`

At first order, the diner is asked once whether they want to receive offers.
The answer is stored as a tri-state: `granted`, `denied`, `unasked`.

Rules:

- Consent MUST NOT be a gate. A diner who declines or ignores the question
  still gets their order placed.
- Consent MUST be re-askable only by the diner sending `offers on` / `offers
  off`. The system MUST NOT re-prompt an existing `denied` diner.
- Broadcast messaging itself is `[P2]`.

## 2.4 Counter dashboard (Proposal §2.IV.a) `[MVP]`

Route: `/counter`. The busiest staff surface. Designed to be usable on a phone
propped by a till.

Contents:

- **Live order queue**, newest first, grouped by status. Realtime — no refresh.
- Per order: table number, customer name, line items with quantities, total,
  elapsed time since placement (a live-ticking counter, red past 15 minutes).
- Actions per order: acknowledge, mark preparing, mark ready, mark served,
  cancel (with a required reason).
- **Manual order creation** for walk-up orders that did not come through
  WhatsApp. Same order shape, `source: 'counter'` instead of `'whatsapp'`.
- **Stock strip**: a compact grid of all items with availability toggles,
  filterable by category, searchable by name.
- **Contact customer**: a `tel:` link on the order card, using the phone number
  captured from WhatsApp.

Rules:

- Order state transitions MUST be enforced server-side. A `served` order cannot
  return to `pending`. The valid transition graph is
  `pending → acknowledged → preparing → ready → served → closed`, plus
  `cancelled` reachable from any state before `served`.
- Cancellation MUST require a reason string of at least 3 characters, and MUST
  record the cancelling staff member.

## 2.5 Waiter dashboard (Proposal §2.IV.b) `[MVP, reduced]`

Route: `/waiter`. Reduced scope for MVP.

Included `[MVP]`:
- Orders filtered to the tables assigned to the signed-in waiter.
- Mark served, which stamps `servedAt` and the waiter's id.
- Personal stats: orders served today, median time from acknowledged to served.

Deferred `[P2]`:
- Timetable / roster integration.
- Shift-based table auto-assignment.
- Waiter ranking leaderboard (the underlying data is captured from day one;
  only the ranking view is deferred).

## 2.6 Manager dashboard (Proposal §2.IV.c) `[MVP, reduced]`

Route: `/manager`.

Included `[MVP]`:
- **Inventory**: full CRUD on menu items, CSV import, availability toggles.
- **Tables**: create tables, assign a waiter, generate and print QR codes.
- **Staff**: add staff, set role (`counter` | `waiter` | `manager`), set PIN,
  enable/disable. Disabling MUST invalidate active sessions.
- **Analytics** (computed live from Convex, no rollup job):
  - Orders today, revenue today, average order value.
  - Top five items by order count, last 7 days.
  - Lowest-rated items with their free-text feedback reasons.
  - Orders by hour of day, last 7 days — identifies peak times.
  - Table performance: orders and revenue per table, median turnaround.
  - Waiter performance: orders served, median serve time, mean rating.

Deferred `[P2]`:
- Scheduled daily/weekly report emails.
- Broadcast messaging to consented diners.
- Offer creation and management.
- CockroachDB analytics cold store and the nightly rollup job.

Rules for analytics:

- All figures MUST be computed from Convex queries over the live order data.
  With a single restaurant and a demo-scale dataset this is comfortably fast
  and avoids an entire class of stale-rollup bugs.
- Every figure MUST state its time window in the UI. A number without a window
  is a number nobody trusts.
- Where a denominator is under 5 (e.g. an item with two ratings), the UI MUST
  show the raw count rather than an average, to avoid presenting noise as
  signal.

## 2.7 Authentication `[MVP, minimal]`

Staff authenticate with a 4–6 digit PIN against a staff record.

Rules:

- PINs MUST be stored as a hash (PBKDF2 via `crypto.subtle`, ≥100k iterations,
  per-user salt). MUST NOT be stored in plaintext or reversibly encrypted.
- A successful PIN entry issues a signed session token (HMAC, 12 hour expiry)
  stored in an httpOnly, Secure, SameSite=Lax cookie.
- Rate limit: 5 failed attempts per staff record per 15 minutes, then a
  15-minute lockout. Track in Convex.
- Role checks MUST be enforced in the Convex functions, not only in the UI.
  Hiding a button is not authorization.

This is deliberately modest. It is adequate for a single-premises demo with
staff-only physical access to the dashboard. It is **not** adequate for
multi-tenant production and §7.2 records that.

---

# 3. Technical architecture

## 3.1 Topology

```
Diner's WhatsApp
      │
      ▼
Meta WhatsApp Cloud API  (Graph API v21.0)
      │  webhook POST (signed)
      ▼
Hono on Cloudflare Workers            ← apps/api
      │  Convex client (server-side)
      ▼
Convex                                 ← packages/convex
      ▲  reactive subscriptions
      │
Next.js on Vercel                      ← apps/web
      ▲
Staff browsers
```

Two independent deploy targets, one shared data layer. The web app talks to
Convex directly for reads and staff writes; it does not proxy through the
worker. The worker exists solely to own the WhatsApp transport, because a
webhook receiver needs to be cheap, globally close to Meta's egress, and
independent of the frontend's deploy cycle.

## 3.2 Why each piece

**Next.js on Vercel.** App Router, React Server Components for the initial
dashboard shell, client components for anything reactive. Vercel's free tier is
far above what a single-restaurant demo consumes. Chosen over Cloudflare Pages
because Convex's React bindings and Next's App Router are best-tested on
Vercel's runtime and the demo has no margin for runtime surprises.

**Hono on Cloudflare Workers.** Sub-millisecond cold starts, 100k requests/day
free, and a `fetch`-native API that matches the Workers runtime exactly. The
webhook path must respond fast — Meta retries on any non-2xx and a slow handler
compounds into duplicate deliveries. Hono's router adds negligible overhead
over a bare `fetch` handler while giving real middleware.

**Convex.** The decisive choice. Convex gives reactive queries out of the box:
the counter dashboard subscribes to the order list and Convex pushes updates on
write. Building the same thing on Postgres would mean a WebSocket server,
a pub/sub layer, connection management, and reconnection logic — days of work
for the single most demo-critical property of the system. Convex also gives
transactional mutations, which §2.3.6 depends on, and a TypeScript-native schema
that shares types with both apps with zero codegen friction.

**CockroachDB.** `[P2]`. Reserved for the analytics cold store once order volume
makes live aggregation over Convex impractical. Not provisioned for MVP. The
agent MUST NOT add a Cockroach dependency, connection string, or migration
directory to the repo. Adding it now is dead weight the demo carries for no
benefit.

**shadcn/ui.** Not a dependency — a set of components vendored into the repo
that we own and restyle. This matters because §4 requires a specific visual
language that no component library ships with by default. With shadcn we edit
`components/ui/button.tsx` directly to encode the design tokens. With a
conventional library we would be fighting its theme system all night.

## 3.3 Package manager: pnpm

**Recommendation: pnpm.** Use it as both installer and script runner.

| | pnpm | npm | bun |
|---|---|---|---|
| Install speed | fast (content-addressed store) | slow | fastest |
| Workspaces | first-class, mature | workable | maturing |
| Phantom dependency protection | yes — strict symlinked `node_modules` | no | no |
| `wrangler` compatibility | excellent | excellent | workable, occasional resolution issues |
| Convex codegen compatibility | excellent | excellent | mostly fine |
| Next.js on Vercel | first-class (native detection) | first-class | supported |
| Disk usage across two apps | lowest (hard links) | highest | low |

The deciding factor is **strict dependency resolution**. In a monorepo where an
agent is generating code quickly across two apps and a shared package, npm's
flat hoisting will happily let `apps/api` import a package that only
`apps/web` declared. It works locally, then fails on Workers deploy where the
bundle is built from `apps/api`'s manifest alone. pnpm makes that import fail
immediately at dev time, which is exactly when you want to find it.

Bun is genuinely faster and is a reasonable choice for a greenfield single-app
project. It is not the choice here because the two riskiest integrations in this
build — `wrangler` bundling for the Workers runtime, and Convex's code
generation — are both npm-ecosystem-native, and an hours-scale MVP has no budget
for debugging a package manager. If you want Bun's speed, use `bun` as a script
runner over a pnpm-installed tree; do not use `bun install`.

Pin the version in `package.json`:

```json
"packageManager": "pnpm@9.12.0"
```

## 3.4 Repository layout

Monorepo, pnpm workspaces. Rationale: shared types between the bot and the
dashboard are the highest-churn surface in the system, and a shared package
removes an entire category of drift bug.

```
heavenly-foods/
├── apps/
│   ├── web/                      Next.js 15, App Router → Vercel
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx                  landing / role picker
│   │   │   ├── login/page.tsx
│   │   │   ├── counter/page.tsx
│   │   │   ├── waiter/page.tsx
│   │   │   └── manager/
│   │   │       ├── page.tsx              analytics
│   │   │       ├── inventory/page.tsx
│   │   │       ├── inventory/import/page.tsx
│   │   │       ├── tables/page.tsx
│   │   │       └── staff/page.tsx
│   │   ├── components/
│   │   │   ├── ui/                       shadcn, restyled per §4
│   │   │   ├── orders/
│   │   │   ├── inventory/
│   │   │   └── analytics/
│   │   ├── lib/
│   │   └── styles/globals.css
│   │
│   └── api/                      Hono → Cloudflare Workers
│       ├── src/
│       │   ├── index.ts                  route table
│       │   ├── routes/whatsapp.ts        GET verify + POST receive
│       │   ├── whatsapp/
│       │   │   ├── signature.ts          HMAC validation
│       │   │   ├── client.ts             Graph API send
│       │   │   ├── templates.ts          message builders
│       │   │   └── machine.ts            conversation state machine
│       │   ├── llm/recommend.ts
│       │   └── convex.ts                 server-side Convex client
│       └── wrangler.toml
│
├── packages/
│   ├── convex/                   schema + functions, shared by both apps
│   │   └── convex/
│   │       ├── schema.ts
│   │       ├── items.ts
│   │       ├── orders.ts
│   │       ├── sessions.ts
│   │       ├── staff.ts
│   │       ├── tables.ts
│   │       ├── feedback.ts
│   │       └── analytics.ts
│   │
│   └── types/                    pure TS types, no runtime deps
│       └── src/index.ts
│
├── pnpm-workspace.yaml
├── package.json
├── turbo.json
└── SPEC.md / BUILD.lisp
```

## 3.5 Data model

Convex schema. Every table carries `restaurantId` even though MVP has one
restaurant — this is the cheapest possible insurance against a painful
multi-tenant migration later.

```ts
// packages/convex/convex/schema.ts
import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  restaurants: defineTable({
    name: v.string(),
    phoneMsisdn: v.string(),          // WABA display number, E.164
    currency: v.literal('KES'),
    columnMappingProfile: v.optional(v.any()),  // saved CSV import mapping
    createdAt: v.number(),
  }),

  items: defineTable({
    restaurantId: v.id('restaurants'),
    name: v.string(),
    nameSwahili: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.union(
      v.literal('staple'), v.literal('vegetable'), v.literal('meat'),
      v.literal('bread'), v.literal('drink'), v.literal('dessert'),
      v.literal('side'),
    ),
    priceKes: v.number(),
    available: v.boolean(),
    quantityOnHand: v.optional(v.number()),
    unit: v.optional(v.string()),
    archived: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_restaurant', ['restaurantId'])
    .index('by_restaurant_available', ['restaurantId', 'available', 'archived'])
    .index('by_restaurant_category', ['restaurantId', 'category']),

  tables: defineTable({
    restaurantId: v.id('restaurants'),
    number: v.number(),
    seats: v.optional(v.number()),
    assignedWaiterId: v.optional(v.id('staff')),
    active: v.boolean(),
  }).index('by_restaurant_number', ['restaurantId', 'number']),

  staff: defineTable({
    restaurantId: v.id('restaurants'),
    name: v.string(),
    role: v.union(v.literal('counter'), v.literal('waiter'), v.literal('manager')),
    pinHash: v.string(),
    pinSalt: v.string(),
    enabled: v.boolean(),
    failedAttempts: v.number(),
    lockedUntil: v.optional(v.number()),
    createdAt: v.number(),
  }).index('by_restaurant', ['restaurantId']),

  orders: defineTable({
    restaurantId: v.id('restaurants'),
    tableNumber: v.number(),
    source: v.union(v.literal('whatsapp'), v.literal('counter')),
    customerName: v.string(),
    customerPhone: v.optional(v.string()),
    lines: v.array(v.object({
      itemId: v.id('items'),
      nameSnapshot: v.string(),
      priceKesSnapshot: v.number(),
      quantity: v.number(),
    })),
    totalKes: v.number(),
    status: v.union(
      v.literal('pending'), v.literal('acknowledged'), v.literal('preparing'),
      v.literal('ready'), v.literal('served'), v.literal('closed'),
      v.literal('cancelled'),
    ),
    acknowledgedByStaffId: v.optional(v.id('staff')),
    servedByStaffId: v.optional(v.id('staff')),
    cancelledByStaffId: v.optional(v.id('staff')),
    cancellationReason: v.optional(v.string()),
    placedAt: v.number(),
    acknowledgedAt: v.optional(v.number()),
    servedAt: v.optional(v.number()),
    closedAt: v.optional(v.number()),
  })
    .index('by_restaurant_status', ['restaurantId', 'status'])
    .index('by_restaurant_placedAt', ['restaurantId', 'placedAt'])
    .index('by_restaurant_table', ['restaurantId', 'tableNumber'])
    .index('by_phone', ['customerPhone']),

  sessions: defineTable({
    restaurantId: v.id('restaurants'),
    phone: v.string(),                    // E.164, the conversation key
    state: v.string(),                    // state machine node
    tableNumber: v.optional(v.number()),
    customerName: v.optional(v.string()),
    language: v.union(v.literal('en'), v.literal('sw')),
    cart: v.array(v.object({
      itemId: v.id('items'),
      quantity: v.number(),
    })),
    activeOrderId: v.optional(v.id('orders')),
    marketingConsent: v.union(
      v.literal('granted'), v.literal('denied'), v.literal('unasked'),
    ),
    lastMessageAt: v.number(),
    expiresAt: v.number(),
  }).index('by_phone', ['phone']),

  processedMessages: defineTable({
    wamid: v.string(),
    processedAt: v.number(),
    expiresAt: v.number(),
  }).index('by_wamid', ['wamid']),

  feedback: defineTable({
    restaurantId: v.id('restaurants'),
    orderId: v.id('orders'),
    rating: v.number(),                   // 1..5
    comment: v.optional(v.string()),
    itemIds: v.array(v.id('items')),      // denormalised for item-level rollup
    waiterId: v.optional(v.id('staff')),
    createdAt: v.number(),
  })
    .index('by_restaurant', ['restaurantId'])
    .index('by_order', ['orderId']),
})
```

Notes on the model:

- `lines` is embedded rather than a separate table. Order lines are never
  queried independently of their order, and Convex documents comfortably hold
  them. This removes a join from the hottest read path.
- `nameSnapshot` and `priceKesSnapshot` are the mechanism behind §2.1.1's rule
  that a price edit does not rewrite history.
- `sessions` is keyed by phone, not by a session id. There is exactly one live
  session per phone number by definition — WhatsApp has no concept of two
  concurrent conversations with the same number.
- `processedMessages` carries its own `expiresAt` rather than relying on a
  built-in TTL; a scheduled Convex function prunes it.

## 3.6 API surface — Hono worker

```
GET  /webhooks/whatsapp     Meta verification handshake       (§2.3.2)
POST /webhooks/whatsapp     Inbound message receiver          (§2.3.3–2.3.5)
GET  /health                Liveness probe, returns build sha
```

That is the entire public surface. Everything else the dashboards need goes
directly to Convex. Resist adding REST endpoints that duplicate Convex
functions — they are a second source of truth and will drift.

### 3.6.1 Inbound handler contract

```ts
app.post('/webhooks/whatsapp', async (c) => {
  const raw = await c.req.text()                  // MUST be raw, pre-parse
  const sig = c.req.header('x-hub-signature-256')
  if (!(await verifySignature(raw, sig, c.env.META_APP_SECRET))) {
    return c.text('', 401)
  }

  const payload = JSON.parse(raw)
  // ACK immediately; process after. Meta's timeout is short and its
  // retry behaviour is aggressive.
  c.executionCtx.waitUntil(handleInbound(payload, c.env))
  return c.text('', 200)
})
```

Rules:

- The 200 MUST be returned before message processing completes. Use
  `executionCtx.waitUntil`. A synchronous handler that does an LLM call before
  responding will trip Meta's timeout and cause duplicate deliveries.
- `handleInbound` MUST swallow its own errors and log them. An unhandled
  rejection inside `waitUntil` is invisible and untraceable.

## 3.7 Environment variables

**apps/api** (Cloudflare Workers secrets, set via `wrangler secret put`):

| Name | Purpose | Secret |
|---|---|---|
| `WHATSAPP_TOKEN` | Graph API bearer token | yes |
| `PHONE_NUMBER_ID` | WABA phone number id for the send endpoint | no |
| `VERIFY_TOKEN` | Webhook handshake shared secret | yes |
| `META_APP_SECRET` | HMAC key for signature validation | yes |
| `CONVEX_URL` | Convex deployment URL | no |
| `CONVEX_DEPLOY_KEY` | Server-side Convex auth | yes |
| `NVIDIA_API_KEY` | LLM inference for recommendation phrasing | yes |
| `RESTAURANT_ID` | The single restaurant's Convex id | no |

**apps/web** (Vercel):

| Name | Purpose |
|---|---|
| `NEXT_PUBLIC_CONVEX_URL` | Convex deployment URL (public by design) |
| `SESSION_SECRET` | HMAC key for staff session cookies |

Rules:

- Secrets MUST NOT be committed. `.dev.vars` MUST be gitignored.
- `.dev.vars.example` and `.env.example` MUST be committed with every key
  present and every value blank.
- The agent MUST NOT invent or hardcode a placeholder token that looks real.

## 3.8 LLM layer

Nvidia NIM inference API, free tier, used for exactly one thing: phrasing
recommendations (§2.3.7).

Rules:

- Timeout 2000ms, hard. No retry — a retry doubles the worst case and the diner
  is waiting.
- On any failure (timeout, non-200, malformed response, validation failure)
  fall back to the deterministic template. Log at warn.
- The prompt MUST contain only the three pre-selected items. It MUST NOT
  contain the full menu, order history, or customer details beyond first name.
- The response MUST be validated against the supplied items before being sent
  to the diner.

## 3.9 Realtime

Convex reactive queries. The counter dashboard calls `useQuery(api.orders.live)`
and Convex pushes on every write that affects the result set. No WebSocket
code, no polling, no invalidation logic.

Rules:

- The dashboards MUST NOT poll. If a `setInterval` appears anywhere near data
  fetching, it is a bug.
- Live queries MUST be bounded. `orders.live` returns open orders only
  (`status != closed && status != cancelled`), capped at 100. An unbounded
  query grows into a performance problem invisibly.

---

# 4. Frontend design language

**This section is binding.** The attached design system document is the
reference; this section is its application to Heavenly Foods. Where a component
choice is not covered here, derive it from the reference document rather than
inventing.

## 4.1 The core idea

The reference language is *reverent presentation framed by near-invisible UI* —
built for product photography. Heavenly Foods has no product photography; it has
**live operational data under time pressure**. The translation is direct: where
the reference makes the product the hero and the chrome disappear, we make
**the order** the hero and the chrome disappear. Same discipline, different
subject.

Concretely: a counter dashboard is a stack of full-width order tiles on
alternating surfaces, with no card borders, no shadows, no decorative chrome.
The order number and table are set large and tight. Everything else recedes.

## 4.2 Colour

Single accent. No second brand colour. Every interactive element is Action Blue.

| Token | Hex | Use |
|---|---|---|
| `--hf-primary` | `#0066cc` | Every link, every primary CTA, focus ring root |
| `--hf-primary-focus` | `#0071e3` | 2px focus outline only |
| `--hf-primary-on-dark` | `#2997ff` | Links on dark tiles only. Never on light. |
| `--hf-canvas` | `#ffffff` | Dominant surface |
| `--hf-parchment` | `#f5f5f7` | Alternating light tile, footer, page canvas |
| `--hf-pearl` | `#fafafc` | Secondary/ghost button fill |
| `--hf-tile-1` | `#272729` | Primary dark tile |
| `--hf-tile-2` | `#2a2a2c` | Dark tile adjacent to tile-1 |
| `--hf-tile-3` | `#252527` | Bottom of stack |
| `--hf-black` | `#000000` | Global nav bar only |
| `--hf-ink` | `#1d1d1f` | All text on light surfaces. Not pure black. |
| `--hf-ink-80` | `#333333` | Body on pearl surfaces |
| `--hf-ink-48` | `#7a7a7a` | Disabled text, fine print |
| `--hf-on-dark` | `#ffffff` | Text on dark tiles |
| `--hf-muted-on-dark` | `#cccccc` | Secondary copy on dark tiles |
| `--hf-hairline` | `#e0e0e0` | 1px border on utility cards |
| `--hf-divider-soft` | `#f0f0f0` | Soft ring on secondary buttons |

**The one permitted exception to single-accent.** Order status is
safety-critical information under time pressure and MUST be distinguishable at
a glance. Status is encoded on a **left border bar plus a text label**, never by
colour alone:

| Status | Bar | Label |
|---|---|---|
| pending | `--hf-ink` | Pending |
| acknowledged | `--hf-primary` | Acknowledged |
| preparing | `--hf-primary` | Preparing |
| ready | `--hf-ink` | Ready |
| served | `--hf-ink-48` | Served |
| cancelled | `--hf-ink-48` | Cancelled |

This uses no new hues — it reuses ink and the single accent, varying weight and
label. It respects the single-accent rule while remaining scannable.

**Forbidden:** any second brand colour, any gradient background, any status
pill in green/amber/red, any colour-only encoding of meaning.

## 4.3 Typography

Font stack — the reference's SF Pro is not licensable off-platform, so:

```css
--hf-font-display: system-ui, -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
--hf-font-text:    system-ui, -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
```

On the staff's likely devices (Android phones, a Windows till) this resolves to
Roboto or Segoe. Load Inter from Google Fonts as an explicit fallback so
rendering is consistent across the demo's devices. Per the reference: nudge
`letter-spacing` down `-0.01em` at display sizes, and tighten body line-height
from 1.47 to 1.44 when Inter is the resolved face.

Scale:

| Token | Size | Weight | Line height | Tracking | Use |
|---|---|---|---|---|---|
| `hero-display` | 56px | 600 | 1.07 | -0.28px | Login screen headline only |
| `display-lg` | 40px | 600 | 1.10 | 0 | Analytics headline figures, table number on order tile |
| `display-md` | 34px | 600 | 1.47 | -0.374px | Section heads |
| `lead` | 28px | 400 | 1.14 | 0.196px | Order total |
| `tagline` | 21px | 600 | 1.19 | 0.231px | Sub-nav category name, card titles |
| `body-strong` | 17px | 600 | 1.24 | -0.374px | Item names in an order |
| `body` | 17px | 400 | 1.47 | -0.374px | Default paragraph. **17px, not 16px.** |
| `caption` | 14px | 400 | 1.43 | -0.224px | Button text, secondary captions |
| `caption-strong` | 14px | 600 | 1.29 | -0.224px | Column headings |
| `fine-print` | 12px | 400 | 1.0 | -0.12px | Timestamps, footer |
| `nav-link` | 12px | 400 | 1.0 | -0.12px | Global nav items |

Rules:

- Body copy is **17px**. Not 16. This is the reference's defining reading pace.
- The weight ladder is **300 / 400 / 600 / 700**. Weight 500 is deliberately
  absent — if a mid-weight is wanted, use 600.
- Negative tracking at 17px and above. Never at 12px or below.
- Sentence case everywhere. Never Title Case, never ALL CAPS.
- No terminal punctuation on labels, buttons, or headings.

## 4.4 Layout

- Base spacing unit 8px. Structural layout snaps to 8/12/16/20/24.
- Tokens: `xxs` 4 · `xs` 8 · `sm` 12 · `md` 17 · `lg` 24 · `xl` 32 · `xxl` 48 ·
  `section` 80.
- Section vertical padding 80px, tightening to 48px below 736px.
- Card padding 24px.
- Button padding 8–11px vertical, 15–22px horizontal.
- Max content width 1440px on dashboard grids; 980px on text-heavy surfaces.
- Utility grid gutters 20–24px.

**Whitespace is the pedestal.** In the reference, whitespace elevates the
product. Here it elevates the order. An order tile has at least 40px between
its content and the next tile's content.

## 4.5 Elevation

| Level | Treatment | Use |
|---|---|---|
| Flat | No shadow, no border | Order tiles, nav, footer, all sections |
| Soft hairline | 1px `rgba(0,0,0,0.08)` | Utility cards, inventory grid cells |
| Backdrop blur | `saturate(180%) blur(20px)` on parchment @80% | Sticky sub-nav, sticky action bar |

**There is exactly one drop shadow in the reference system and it is reserved
for product photography. Heavenly Foods has no product photography, therefore
Heavenly Foods has zero drop shadows.** Not on cards, not on buttons, not on
modals, not on the order tiles. Elevation comes from surface-colour change and
backdrop blur. This is the single easiest rule to violate by accident and the
most visible when violated.

## 4.6 Shape

| Token | Value | Use |
|---|---|---|
| `none` | 0px | Full-bleed tiles. Tiles touch edges. |
| `sm` | 8px | Dark utility buttons, inline imagery |
| `md` | 11px | Pearl capsule buttons |
| `lg` | 18px | Utility cards, inventory grid cards |
| `pill` | 9999px | Primary CTAs, filter chips, search input |
| `full` | 50% | Circular icon controls |

Do not mix grammars. There is nothing between `sm` and `lg` except the rare
`md` pearl capsule.

## 4.7 Component mapping — shadcn to this language

shadcn components are vendored and restyled. Each maps to a reference component:

| shadcn | Restyled as | Key overrides |
|---|---|---|
| `button` variant `default` | Primary blue pill | `bg: --hf-primary`, `rounded: pill`, `padding: 11px 22px`, `font: body 17/400`, active `scale(0.95)`, focus `2px solid --hf-primary-focus`. **Remove the default shadow.** |
| `button` variant `outline` | Ghost pill | transparent bg, `1px solid --hf-primary`, text `--hf-primary`, `rounded: pill` |
| `button` variant `secondary` | Pearl capsule | `bg: --hf-pearl`, text `--hf-ink-80`, `3px solid --hf-divider-soft`, `rounded: 11px`, `font: caption` |
| `button` variant `ghost` | Dark utility | `bg: --hf-ink`, text white, `rounded: 8px`, `padding: 8px 15px`, `font: caption` |
| `card` | Utility card | `bg: --hf-canvas`, `1px solid --hf-hairline`, `rounded: 18px`, `padding: 24px`. **`shadow-none` — delete the shadow class entirely.** |
| `input` | Search / text field | `rounded: pill`, `height: 44px`, `padding: 12px 20px`, `1px solid rgba(0,0,0,0.08)`, `font: body 17px` |
| `switch` | Availability toggle | Track `--hf-primary` when on, `--hf-hairline` when off. No shadow on the thumb. |
| `dialog` | Confirmation modal | `bg: --hf-canvas`, `rounded: 18px`, **no shadow** — separate from the page with a `rgba(0,0,0,0.4)` backdrop instead |
| `badge` | Status label | Text only, `caption-strong`, paired with the left bar per §4.2. No filled pill. |
| `table` | Inventory / analytics table | Hairline row dividers only. No zebra striping, no borders on cells. |
| `tabs` | Dashboard section switcher | Underline indicator in `--hf-primary`, 2px. No filled tab backgrounds. |

**Every shadcn component ships with a shadow and a `rounded-md`. Both must be
overridden on vendoring.** The agent MUST audit each vendored component for
`shadow-` and `rounded-md` classes and replace them per this table.

## 4.8 Screen-level composition

**Counter dashboard `/counter`** — the reference's alternating-tile rhythm
applied to a work queue:

- Global nav: 44px, `--hf-black`, `nav-link` 12px, white text. Right cluster:
  staff name, sign out.
- Sub-nav: 52px, parchment @80% with backdrop blur, sticky. Left: "Counter" in
  `tagline` 21/600. Right: order count, and a primary pill "New order".
- Order queue: full-bleed tiles, alternating `--hf-canvas` and
  `--hf-parchment`. **The colour change is the divider — no borders between
  tiles.** Each tile: table number in `display-lg` 40/600, customer name in
  `tagline`, line items in `body-strong`/`body`, total in `lead` 28px, elapsed
  time in `fine-print`. Actions as a row of pills, right-aligned.
- Stock strip: a `lg`-radius utility card grid below the queue, one cell per
  item, name + price + a switch.

**Manager analytics `/manager`** — headline figures get the display treatment:

- Metric tiles alternate canvas and parchment, full-bleed. Figure in
  `display-lg` 40/600, label in `caption` above it, time window in `fine-print`
  below it.
- No metric cards with borders and shadows. The figure sits on the tile with
  air around it, per §4.4.
- Charts: single accent only. A bar chart is `--hf-primary` bars on the tile
  surface with hairline axes and no gridlines. Multi-series charts use opacity
  steps of the single accent, not a palette.

**Login `/login`** — the one place `hero-display` 56px is used. Centred stack on
parchment: restaurant name, PIN entry, primary pill. Nothing else on the screen.

## 4.9 Responsive

Breakpoints from the reference: 1440 (content lock), 1068, 833, 734, 640, 480.

- Order tiles: two-column above 833px, single column below.
- Section padding 80px → 48px below 736px.
- Inventory grid: 5 → 4 (1440) → 3 (1068) → 2 (834) → 1 (640).
- Global nav collapses to hamburger at 834px.
- `hero-display` 56 → 40 (1068) → 34 (640) → 28 (419).

**Touch targets minimum 44×44px.** The counter dashboard is operated by someone
holding a plate. The availability switch and every order action MUST meet this.

## 4.10 Motion

- The only interaction transform is `transform: scale(0.95)` on active/press.
  Applied to every button. This is the system-wide micro-interaction.
- Transitions: 150ms ease-out on colour and transform. Nothing else animates.
- No page transitions, no skeleton shimmer, no entrance animations. A new order
  appearing in the queue does so instantly — an animation on a realtime queue
  reads as lag.
- Honour `prefers-reduced-motion` by disabling the scale transform.

## 4.11 Design rules the agent must not violate

1. One accent colour. `#0066cc`. Nothing else is interactive-coloured.
2. Zero drop shadows anywhere in the application.
3. Body copy 17px, never 16px.
4. Font weight 500 never appears. The ladder is 300/400/600/700.
5. Full-bleed tiles have zero border radius and no borders — the surface colour
   change is the divider.
6. Negative letter-spacing at 17px and up; never at 12px and below.
7. Sentence case everywhere.
8. No gradients. Anywhere. For any reason.
9. `--hf-primary-on-dark` (#2997ff) only on dark tiles; never on light.
10. Radius grammar is `sm`/`lg`/`pill` plus the rare `md`. Nothing between.

---

# 5. Build order

Dependency-ordered. Each phase leaves the repo in a working state.

| # | Phase | Output | Gate |
|---|---|---|---|
| 0 | Scaffold | pnpm workspace, three packages, `pnpm dev` runs both apps | Both apps serve |
| 1 | Convex schema | `schema.ts`, generated types, seeded restaurant + 12 items | Data visible in Convex dashboard |
| 2 | Design tokens | `globals.css`, Tailwind config, shadcn vendored and restyled per §4.7 | Button, card, input match §4 by eye |
| 3 | Auth | PIN login, session cookie, role guards in Convex functions | Three roles reach three routes |
| 4 | Counter dashboard | Live order queue, status actions, stock strip | Order status change reflects in a second browser within 2s |
| 5 | Manager inventory | Item CRUD, availability toggle, CSV import | Import 20 rows, toggle one, see it in the counter stock strip |
| 6 | WhatsApp verify | GET handshake, signature validation, health route | Meta webhook registration succeeds |
| 7 | Bot state machine | Full flow greeting → menu → cart → name → consent → placed | Order placed from a phone lands on `/counter` |
| 8 | Recommendations | Deterministic selection + LLM phrasing + fallback | Fallback verified by killing the API key |
| 9 | Feedback | Post-serve prompt, rating capture, low-rating follow-up | Rating appears on manager analytics |
| 10 | Manager analytics | Live-computed figures per §2.6 | Every figure states its window |
| 11 | Tables & QR | Table CRUD, QR generation, print sheet | Scanned QR opens WhatsApp with table pre-filled |
| 12 | Demo rehearsal | Run §1.4 end to end, twice | Clean run with no console errors |

Phases 4 and 5 can proceed in parallel with 6 and 7 if two agents are working.
Phase 3 gates everything after it. Phase 2 gates every UI phase.

---

# 6. Testing

Proportionate to an hours-scale MVP. Not comprehensive; targeted at the things
that fail silently.

**Must have unit tests:**

- `verifySignature` — valid signature, invalid signature, missing header,
  body-mutation-after-read case.
- Order total computation — including the case where the client sends a wrong
  total and it is ignored.
- State machine transitions — every edge in §2.3.5, plus the global commands
  from every state.
- CSV column inference — the synonym table, and a header the table doesn't know.
- Status transition guard — assert that `served → pending` is rejected.

**Must have a manual checklist** (run before the demo):

- Two browsers, order status change propagates within 2s.
- Item toggled unavailable disappears from the WhatsApp menu on next render.
- Duplicate webhook delivery (replay the same payload) creates exactly one order.
- LLM key removed → recommendations still work via template.
- Order placed with an item that goes unavailable mid-flow → clear message.
- Every button reachable by keyboard, focus ring visible.
- Counter dashboard usable one-handed on a phone.

**Explicitly not doing:** E2E browser automation, load testing, visual
regression. Not a good use of the hours available.

---

# 7. Non-functional requirements

## 7.1 Performance budgets

| Path | Budget |
|---|---|
| Webhook 200 response | < 200ms (excluding `waitUntil` work) |
| Bot reply to diner | < 3s p95 |
| LLM recommendation call | 2000ms hard timeout, no retry |
| Dashboard first paint | < 2s on 4G |
| Realtime propagation | < 2s |

## 7.2 Known limitations

Recorded honestly so nobody is surprised in the client conversation:

- **Auth is PIN-based and single-premises.** Adequate for staff with physical
  access to the till. Not adequate for remote access or multi-tenant. A real
  deployment needs proper identity.
- **Analytics compute live.** Fine at demo scale and for a single restaurant.
  Past roughly 50k orders this needs the `[P2]` rollup and cold store.
- **No payments.** Settlement is at the counter, unchanged.
- **Single restaurant.** The schema is multi-tenant-shaped but nothing enforces
  tenant isolation yet. Adding a second restaurant requires an authorization
  pass over every Convex function.
- **WhatsApp outbound messages cost money.** Meta charges per outbound
  conversation. This is not a hosting cost and it scales with usage. The demo's
  volume is negligible; a production rollout must budget for it.
- **OCR is not built.** Deferred by decision. §2.1.3 records the seam.

## 7.3 Cost

At demo scale (one restaurant), every service sits inside its free tier:

| Service | Free allowance | Demo usage | Cost |
|---|---|---|---|
| Vercel | 100GB bandwidth/mo | negligible | 0 |
| Cloudflare Workers | 100k requests/day | hundreds/day | 0 |
| Convex | 500k reads + 500k writes/mo | thousands | 0 |
| Nvidia NIM | free tier, rate-limited | tens of calls/day | 0 |
| Meta WhatsApp | inbound free | — | outbound per-message only |

Infrastructure cost for the demo is zero. The only variable cost is Meta's
outbound message charge.

---

# 8. Traceability

Every proposal line item and its disposition.

| Proposal item | § | Status |
|---|---|---|
| New-restaurant inventory onboarding | 2.1.1 | MVP |
| Excel & CSV upload, live preview, auto-interpretation | 2.1.2 | MVP |
| Handwritten book OCR | 2.1.3 | **P2 — not built** |
| Template field mapping, English + Swahili | 2.1.2 | MVP |
| Preview / edit / approve workflow | 2.1.2 | MVP |
| Retain original column names | 2.1.2 | MVP |
| Real-time stock updates | 2.1.4 | MVP |
| Available/unavailable toggle | 2.1.4 | MVP |
| Conversational menu + smart recommendations | 2.3.5, 2.3.7 | MVP |
| Order placement with queuing + staff callback | 2.3.6, 2.4 | MVP |
| QR code on tables | 2.2.1 | MVP |
| Anti-scam: waiter verification, table, name, timestamps | 2.3.8 | MVP |
| Post-order automated feedback | 2.3.9 | MVP |
| Consent for offers via WhatsApp | 2.3.10 | MVP |
| Counter: view/manage/complete/cancel/manual orders | 2.4 | MVP |
| Counter: update stock | 2.4 | MVP |
| Counter: contact customer | 2.4 | MVP |
| Waiter: orders for assigned tables | 2.5 | MVP |
| Waiter: timetable/roster integration | 2.5 | **P2** |
| Waiter: service timestamps | 2.3.8, 2.5 | MVP |
| Waiter: performance tracking | 2.5 | MVP (data), P2 (ranking view) |
| Manager: comprehensive analytics | 2.6 | MVP (live-computed) |
| Manager: daily/weekly reports | 2.6 | **P2** |
| Manager: add dishes | 2.1.1 | MVP |
| Manager: create offers, broadcast | 2.6 | **P2** |
| Manager: full user management | 2.6 | MVP |
| Manager: table allocation | 2.6 | MVP (allocation), P2 (roster) |

---

# 9. Glossary

| Term | Meaning |
|---|---|
| WABA | WhatsApp Business Account — the Meta entity owning the number |
| WAMID | WhatsApp message id, globally unique, used for idempotency |
| MSISDN | The full international phone number in E.164 form |
| Cold store | Analytical database holding historical data, queried infrequently |
| Hot store | Operational database serving live reads and writes |
| Snapshot | A value copied at write time so later edits don't rewrite history |
| Seam | A designed interface boundary that makes a future change cheap |