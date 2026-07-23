#+TITLE: Heavenly Foods — AI-Powered Restaurant Management System
#+SUBTITLE: Complete Technical Specification & MVP Build Plan
#+AUTHOR: Paul Kinyatti
#+CLIENT: Heavenly Foods Restaurant (via Biasharawatch Technologies / Samchi Digital)
#+DATE: 2026-07-22
#+VERSION: 1.0.0-mvp
#+STATUS: SPEC-FIRST / MVP IN HOURS
#+STARTUP: overview
#+OPTIONS: toc:3 num:t

* 0. Document Control

** 0.1 Purpose

This document is the single source of truth for the Heavenly Foods restaurant
management system. It is written spec-first: every feature, contract, schema,
and constraint is defined here *before* implementation. The companion file
=heavenly-foods.lisp= contains the same system expressed as machine-readable
S-expressions for agent consumption (kiro-cli, Claude Code, MCP tooling).

** 0.2 Reading Order

| Order | Section | Audience |
|-------+---------------------------------+----------------------------|
|     1 | §1 Executive Summary            | Client, stakeholders       |
|     2 | §2 Scope Traceability           | Client, PM                 |
|     3 | §3 System Architecture          | Engineers                  |
|     4 | §4 Feature Specification        | Engineers, QA              |
|     5 | §5 Data Model                   | Engineers                  |
|     6 | §6 API Contract                 | Engineers                  |
|     7 | §7 WhatsApp Conversation Engine | Engineers                  |
|     8 | §8 Frontend Design System       | Design engineers           |
|     9 | §9 Repo, Tooling, Runtime       | Engineers                  |
|    10 | §10 MVP Hour-by-Hour Plan       | Solo builder               |
|    11 | §11 Cost Model                  | Client, PM                 |
|    12 | §12 Risks & Open Questions      | All                        |

** 0.3 Terminology

- *WABA* :: WhatsApp Business Account (Meta Cloud API).
- *Tenant* :: A single restaurant. MVP is single-tenant (Heavenly Foods) but
  the schema is multi-tenant-ready from day one.
- *Session* :: A WhatsApp conversation state machine instance, keyed by
  customer phone number, TTL-bound.
- *Cover* :: One dining party at a table.
- *Turn* :: Table turnover — the cycle from seat to clear.
- *Hot store* :: Convex. Real-time, subscription-driven, source of truth for
  live operational state.
- *Cold store* :: CockroachDB. Append-only analytics, rollups, audit.

** 0.4 Status Legend

| Marker | Meaning                                     |
|--------+---------------------------------------------|
| =MVP=    | Ships in the hours-long MVP sprint          |
| =P2=     | Phase 2 — post-demo, deferred               |
| =P3=     | Phase 3 — scale/hardening                   |
| =CLIENT= | Explicitly requested in the client PDF      |
| =DERIVED= | Inferred requirement, needs client sign-off |

--------------------------------------------------------------------------------

* 1. Executive Summary

** 1.1 What This Is

A restaurant operations platform where *WhatsApp is the primary ordering
surface* and the web app is the operations console. A diner scans a QR code at
their table, chats with an AI bot, orders, and gets served. Staff work from
role-scoped dashboards that update in real time. Management sees analytics
derived from every timestamp the system captures.

** 1.2 Why WhatsApp Is The Right Channel

For the Kenyan market this is not a stylistic choice, it is a distribution
decision:

- WhatsApp penetration in Kenya is effectively universal among smartphone users.
- Zero app install friction — the diner already has the app open.
- No PWA install prompt, no App Store review, no cold-start.
- Restaurants already run operations over WhatsApp informally (staff groups,
  supplier orders, customer bookings). The system formalises existing behaviour
  rather than replacing it.
- The QR-to-chat handoff (=wa.me/<number>?text=TABLE_07=) is a single tap.

** 1.3 The Three Surfaces

| Surface       | Users             | Tech                       | Purpose                    |
|---------------+-------------------+----------------------------+----------------------------|
| WhatsApp bot  | Diners            | Hono webhook + LLM         | Ordering, feedback         |
| Ops console   | Counter, Waiters  | Next.js + Convex live      | Order flow, stock, service |
| Admin console | Manager, Owner    | Next.js + Convex + Cockroach | Analytics, config, users |

** 1.4 MVP Boundary (Hours, Not Weeks)

The client PDF specifies 11 weeks. This document targets a *demo-grade MVP
built in hours* for one restaurant, then hardens toward the full 11-week scope.
The boundary is drawn deliberately:

*IN the hours-MVP:*
- Full data model (all tables, even ones not yet exercised)
- Menu/inventory CRUD + CSV import
- Real-time availability toggle
- WhatsApp webhook + conversational ordering state machine
- QR → table binding
- Order lifecycle (placed → confirmed → preparing → served → closed)
- Counter dashboard (live order queue)
- Waiter dashboard (assigned tables, service timestamps)
- Manager dashboard (core analytics, live)
- Post-order feedback capture
- Auth with role-based route scoping

*OUT of the hours-MVP (deferred, still specified below):*
- Handwritten OCR ingestion → =P2=
- Excel (.xlsx) parsing → =P2= (CSV ships in MVP)
- Swahili template mapping UI → =P2=
- Broadcast/offer campaigns → =P2=
- Roster/timetable management → =P2=
- CockroachDB nightly rollups → =P2= (Convex serves analytics in MVP)
- Waiter ranking algorithm → =P2= (raw metrics shown in MVP, no composite score)

--------------------------------------------------------------------------------

* 2. Scope Traceability Matrix

Every line item from the client PDF, mapped to a feature ID and phase. This is
the acceptance checklist.

** 2.1 Section I — Data Upload For Inventory Management

| # | Client requirement (verbatim intent)                          | Feature ID | Phase |
|---+---------------------------------------------------------------+------------+-------|
| 1 | Support for completely new restaurants: initial onboarding     | F-INV-001  | MVP   |
| 2 | Excel & CSV upload with live preview and auto-interpretation   | F-INV-002  | MVP*  |
| 3 | Handwritten book image upload with intelligent OCR             | F-INV-003  | P2    |
| 4 | Template-based field mapping, custom explanations (EN + SW)    | F-INV-004  | P2    |
| 5 | Preview, edit, approval workflow                               | F-INV-005  | MVP   |
| 6 | Option to retain original column names                         | F-INV-006  | MVP   |
| 7 | Final data preview and upload                                  | F-INV-007  | MVP   |

/* MVP ships CSV. XLSX parsing added in P2 via SheetJS./

** 2.2 Section II — Stock Updation

| # | Client requirement                                       | Feature ID | Phase |
|---+----------------------------------------------------------+------------+-------|
| 1 | Easy real-time updates for in-house orders               | F-STK-001  | MVP   |
| 2 | Mark items available/unavailable (simple toggle)         | F-STK-002  | MVP   |

** 2.3 Section III — In-House Ordering via WhatsApp

| # | Client requirement                                              | Feature ID | Phase |
|---+-----------------------------------------------------------------+------------+-------|
| 1 | Natural conversation flow, menu display, smart recommendations  | F-WA-001   | MVP   |
| 2 | Recommendations by budget, category, availability               | F-WA-002   | MVP   |
| 3 | Order placement with queuing + staff callback confirmation      | F-WA-003   | MVP   |
| 4 | QR code on tables (scan → chat with bot)                        | F-WA-004   | MVP   |
| 5 | Anti-scam: waiter verification                                  | F-WA-005   | MVP   |
| 6 | Anti-scam: table number input                                   | F-WA-006   | MVP   |
| 7 | Anti-scam: customer name & details capture                      | F-WA-007   | MVP   |
| 8 | Anti-scam: timestamp recording (service time, table perf.)      | F-WA-008   | MVP   |
| 9 | Post-order automated feedback (rating, likes/dislikes)          | F-WA-009   | MVP   |
| 10 | Consent for receiving offers via WhatsApp                      | F-WA-010   | MVP   |

** 2.4 Section IV.a — Staff Dashboard: Counter

| # | Client requirement                                       | Feature ID | Phase |
|---+----------------------------------------------------------+------------+-------|
| 1 | View and manage orders                                   | F-CTR-001  | MVP   |
| 2 | Complete or cancel orders                                | F-CTR-002  | MVP   |
| 3 | Manually create orders                                   | F-CTR-003  | MVP   |
| 4 | Update stock availability                                | F-CTR-004  | MVP   |
| 5 | Contact customer using verified restaurant number        | F-CTR-005  | MVP   |

** 2.5 Section IV.b — Staff Dashboard: Waiter

| # | Client requirement                                          | Feature ID | Phase |
|---+-------------------------------------------------------------+------------+-------|
| 1 | View orders for assigned tables                             | F-WTR-001  | MVP   |
| 2 | Timetable/roster integration                                | F-WTR-002  | P2    |
| 3 | Record service timestamps (order, service, turnover)        | F-WTR-003  | MVP   |
| 4 | Track waiter performance (table perf. + customer feedback)  | F-WTR-004  | MVP*  |

/* MVP surfaces raw per-waiter metrics. Composite ranking score is P2./

** 2.6 Section IV.c — Admin Dashboard: Manager

| # | Client requirement                                    | Feature ID | Phase |
|---+-------------------------------------------------------+------------+-------|
| 1 | Top-rated dishes/drinks                               | F-MGR-001  | MVP   |
| 2 | Low-rated items with reasons                          | F-MGR-002  | MVP   |
| 3 | Categorized improvement summaries                     | F-MGR-003  | P2    |
| 4 | Order patterns by day                                 | F-MGR-004  | MVP   |
| 5 | Table performance (best tables & peak times)          | F-MGR-005  | MVP   |
| 6 | Waiter ranking                                        | F-MGR-006  | P2    |
| 7 | Daily and weekly reports                              | F-MGR-007  | P2    |
| 8 | Add new dishes                                        | F-MGR-008  | MVP   |
| 9 | Create offers                                         | F-MGR-009  | P2    |
| 10 | Broadcast messaging to opted-in users                | F-MGR-010  | P2    |
| 11 | Full user management (add, roles, enable/disable)    | F-MGR-011  | MVP   |
| 12 | Table allocation                                     | F-MGR-012  | MVP   |
| 13 | Roster management                                    | F-MGR-013  | P2    |

** 2.7 MVP Feature Count

- Total client line items: *38*
- Shipping in hours-MVP: *27* (71%)
- Deferred to P2: *11* (29%)

--------------------------------------------------------------------------------

* 3. System Architecture

** 3.1 Component Topology

#+BEGIN_SRC text
                        ┌─────────────────────────────┐
                        │      Meta WhatsApp          │
                        │      Cloud API (WABA)       │
                        └──────────┬──────────────────┘
                                   │ webhook POST
                                   │ (signed, X-Hub-Signature-256)
                                   ▼
  ┌──────────────┐        ┌────────────────────────────┐
  │  Next.js 15  │        │   Hono on Cloudflare       │
  │  App Router  │◄──────►│   Workers                  │
  │  (Vercel)    │  REST  │                            │
  │              │        │  /webhook/whatsapp         │
  │  - Counter   │        │  /api/orders               │
  │  - Waiter    │        │  /api/menu                 │
  │  - Manager   │        │  /api/sessions             │
  └──────┬───────┘        │  /api/analytics            │
         │                └─────┬──────────────┬───────┘
         │ Convex live          │              │
         │ subscription         │              │ inference
         ▼                      ▼              ▼
  ┌──────────────────────────────────┐  ┌──────────────────┐
  │          Convex                  │  │  LLM Provider    │
  │  (hot store, realtime)           │  │  NVIDIA NIM /    │
  │                                  │  │  Ollama / Groq   │
  │  menuItems, orders, sessions,    │  └──────────────────┘
  │  tables, staff, feedback,        │
  │  serviceEvents                   │
  └──────────────┬───────────────────┘
                 │ nightly rollup (P2)
                 ▼
  ┌──────────────────────────────────┐
  │       CockroachDB Serverless      │
  │  (cold store, analytics, audit)   │
  └──────────────────────────────────┘
#+END_SRC

** 3.2 Why Each Piece

*** 3.2.1 Next.js 15 (App Router) — Frontend

*Chosen because:*
- Server Components let dashboards render menu/config data server-side with
  zero client JS, while live order queues use Convex client subscriptions. Best
  of both.
- Route groups map cleanly onto role scoping: =(counter)=, =(waiter)=,
  =(manager)= each with their own layout and middleware guard.
- Vercel deploy is =git push=. Zero infra work during an hours-long sprint.
- Server Actions handle the CSV import mutation without writing an API route.

*Explicitly not used for:* the WhatsApp webhook. Vercel functions have cold
starts and the Meta webhook has a 20-second timeout with aggressive retry.
Cloudflare Workers' near-zero cold start is the correct home for that path.

*** 3.2.2 Hono on Cloudflare Workers — Backend

*Chosen because:*
- Sub-millisecond cold start. Meta retries webhooks that don't ACK in 20s; a
  cold Lambda risks duplicate message processing.
- Hono's routing is Express-shaped but Workers-native, with first-class
  TypeScript inference on =c.req.json<T>()=.
- =hono/validator= + Zod gives runtime contract enforcement at the edge.
- Global edge means the webhook responds from Nairobi-adjacent PoPs.
- Free tier: 100k requests/day. A single restaurant does perhaps 2–5k/day.

*Workers constraints we design around:*

| Constraint            | Free tier limit | Mitigation                              |
|-----------------------+-----------------+-----------------------------------------|
| CPU time per request  | 10 ms           | LLM call is I/O wait, not CPU. Fine.    |
| Request duration      | 30 s (wall)     | ACK webhook in <1s, process async.      |
| Request body          | 100 MB          | Not a concern for JSON payloads.        |
| Subrequests           | 50 per request  | We make 2–3 (LLM + Convex + WA send).   |
| No Node APIs          | —               | Use Web Crypto for HMAC verification.   |

*** 3.2.3 Convex — Hot Store

*Chosen because:*
- =useQuery= is a live subscription. When the counter marks an order "ready",
  the waiter's tablet updates without polling, without WebSocket plumbing,
  without a state library. This single property removes an entire category of
  work from the sprint.
- Mutations are transactional and serializable by default. Two waiters can't
  double-claim the same order.
- Schema is TypeScript-native (=defineSchema=), so the frontend, backend, and
  DB share one type definition with no codegen step.
- Scheduled functions (=ctx.scheduler=) handle session TTL expiry and the
  post-order feedback prompt without a separate cron service.
- Free tier is generous enough that a single-restaurant demo will never
  approach it.

*Trade-off accepted:* Convex is not SQL. Ad-hoc analytical queries
(=GROUP BY hour_of_day=) are awkward. This is exactly why CockroachDB exists in
the design.

*** 3.2.4 CockroachDB Serverless — Cold Store

*Chosen because:*
- Real Postgres-wire SQL for the analytics the manager dashboard needs:
  window functions, time-bucketing, cohort analysis.
- Serverless free tier (10 GiB storage, 50M RU/month) is far beyond what one
  restaurant generates.
- Append-only fact tables give an immutable audit trail — important for the
  anti-scam requirement (F-WA-005..008), where disputes need a tamper-evident
  record of who confirmed what and when.

*In the hours-MVP:* CockroachDB is *provisioned and schema-migrated but not yet
in the read path*. Analytics come from Convex aggregations. The rollup job is
P2. This is a deliberate cut — it removes a whole integration from the critical
path while keeping the door open.

*** 3.2.5 LLM Layer

Three viable providers, ranked for this project:

| Provider          | Model                  | Cost        | Latency | Verdict          |
|-------------------+------------------------+-------------+---------+------------------|
| NVIDIA NIM        | =meta/llama-3.1-70b=   | Free tier   | ~800 ms | *MVP default*    |
| Groq              | =llama-3.3-70b-versatile= | Free tier | ~200 ms | *Best latency*   |
| Ollama self-host  | =llama3.1:8b=          | $0 + VPS    | varies  | Offline fallback |

*Architecture decision:* the LLM is behind a provider-agnostic interface
(=packages/ai/src/provider.ts=). Swapping NVIDIA → Groq is a one-line env
change. Never call a provider SDK directly from route handlers.

*Critical design constraint:* the LLM does *not* have write access to the
database. It does two things only:

1. *Intent classification* — map free text to one of a closed set of intents.
2. *Response generation* — turn a structured result into friendly prose.

All state transitions go through deterministic TypeScript. The LLM cannot
create an order, change a price, or mark stock available. This is
non-negotiable: it eliminates prompt-injection as a business-logic risk and
means a hallucinating model degrades conversation quality, never data integrity.

** 3.3 Request Flow: Diner Places An Order

#+BEGIN_SRC text
 1. Diner scans QR at table 7
    → opens wa.me/254XXXXXXXXX?text=TABLE-07

 2. Meta delivers webhook → Hono /webhook/whatsapp
    → verify X-Hub-Signature-256 (Web Crypto HMAC-SHA256)
    → return 200 OK immediately  [<50 ms]
    → continue processing via ctx.waitUntil()

 3. Hono loads session from Convex by phone number
    → none found → create session, state = AWAITING_TABLE
    → message body matches /^TABLE-(\d+)$/ → bind tableNumber = 7
    → transition to AWAITING_NAME

 4. Hono asks for name → sends via WA Cloud API
    Diner replies "Wanjiku"
    → store customerName, transition to BROWSING

 5. Diner: "something under 500 bob, no meat"
    → Hono calls LLM with intent-classification prompt + available menu
    → LLM returns {intent: "RECOMMEND", budget: 500, exclude: ["meat"]}
    → Hono queries Convex menuItems where available=true, price<=500
    → filters by tags, ranks by rating
    → LLM formats top 3 into WhatsApp-friendly numbered list
    → send

 6. Diner: "2 and 5"
    → intent ADD_TO_CART, resolves indices against last-sent list
    → cart mutation in Convex
    → confirm total, ask to confirm

 7. Diner: "yes"
    → Hono creates order in Convex (status=PLACED, tableNumber=7)
    → Convex subscription pushes to Counter dashboard INSTANTLY
    → bot: "Order placed. A waiter will confirm shortly."

 8. Counter staff sees order, taps Confirm
    → status=CONFIRMED, confirmedBy=<staffId>, confirmedAt=now
    → Convex triggers scheduled WA message to diner: "Confirmed by Grace."
    → this is F-WA-003 (staff callback confirmation) and F-WA-005 (waiter
      verification) satisfied in one transition

 9. Kitchen ready → status=READY → waiter tablet updates
10. Waiter serves → status=SERVED, servedAt=now
    → serviceEvent row written: {orderId, placedAt, confirmedAt, servedAt}
    → this is the raw material for ALL table/waiter analytics

11. +10 min → Convex scheduler fires feedback prompt over WA
    → diner rates 1-5, optionally names liked/disliked items
    → feedback row → feeds F-MGR-001, F-MGR-002, F-WTR-004
#+END_SRC

** 3.4 Idempotency & Duplicate Handling

Meta retries webhooks for up to 24 hours if it doesn't get a 200. Every
inbound message carries a unique =message.id=.

*Rule:* before processing, attempt an insert into =processedMessages= keyed by
=wamid=. Convex unique index makes this atomic. If insert fails, the message is
a retry — ACK 200 and drop.

#+BEGIN_SRC typescript
// convex/messages.ts
export const claimMessage = mutation({
  args: { wamid: v.string() },
  handler: async (ctx, { wamid }) => {
    const existing = await ctx.db
      .query("processedMessages")
      .withIndex("by_wamid", (q) => q.eq("wamid", wamid))
      .unique();
    if (existing) return { claimed: false };
    await ctx.db.insert("processedMessages", { wamid, at: Date.now() });
    return { claimed: true };
  },
});
#+END_SRC

--------------------------------------------------------------------------------

* 4. Feature Specification

** 4.1 F-INV: Inventory & Menu Management

*** F-INV-001 — New Restaurant Onboarding =MVP= =CLIENT=

*Goal:* a restaurant with no existing system can go from zero to a working
menu in under five minutes.

*Flow:*
1. Manager signs in, lands on empty-state menu screen.
2. Two paths offered: "Add items one by one" or "Import a spreadsheet".
3. Manual path: inline row-add form. Name, price, category, availability.
   Optimistic insert, no page reload.
4. Category list is free-text with autocomplete from existing categories —
   no fixed taxonomy, because Kenyan restaurant categories are idiosyncratic
   (=Nyama=, =Vipande=, =Soda Baridi=).

*Acceptance:*
- [ ] Empty state renders with both CTAs, no console errors.
- [ ] Adding an item makes it appear in the WhatsApp menu within 2 seconds.
- [ ] Category autocomplete suggests existing values, allows new ones.

*** F-INV-002 — CSV / Excel Upload =MVP (CSV)= =CLIENT=

*Goal:* bulk-load an existing menu from a spreadsheet with live preview.

*MVP scope:* CSV only, via PapaParse (already a dependency-free browser parse).
*P2 scope:* XLSX via SheetJS.

*Parsing pipeline:*
#+BEGIN_SRC text
File → PapaParse (header:true, skipEmptyLines:true)
     → raw rows + detected headers
     → heuristic column mapper (see below)
     → user confirms/corrects mapping in UI
     → validation pass (Zod schema per row)
     → preview table with per-row status (ok / warn / error)
     → user approves
     → Server Action → Convex bulkInsertMenuItems
#+END_SRC

*Heuristic column mapper* — scores each source header against each target
field using normalised token matching:

| Target field | Accepted header tokens (case/space-insensitive)            |
|--------------+-----------------------------------------------------------|
| =name=       | name, item, dish, product, jina, chakula, description     |
| =price=      | price, cost, amount, ksh, kes, bei, rate, sh              |
| =category=   | category, type, section, group, aina, menu                |
| =quantity=   | qty, quantity, stock, count, idadi, units                 |
| =unit=       | unit, uom, measure, kipimo                                |
| =available=  | available, in stock, status, active, ipo                  |

Swahili tokens are included in the MVP mapper even though the full
template-mapping UI (F-INV-004) is P2 — it costs nothing and materially
improves first-import accuracy for this market.

*Price normalisation:* strip currency symbols, thousands separators, and
whitespace. Accept =KES 1,200=, =1200/-=, =1200.00=, =Ksh1200= → =120000=
(stored as integer cents to avoid float drift).

*Acceptance:*
- [ ] A CSV with headers =Jina,Bei,Aina= maps correctly without user input.
- [ ] A row with a non-numeric price is flagged =error=, not silently dropped.
- [ ] Preview shows first 50 rows; count of total rows displayed.
- [ ] Import is atomic — either all valid rows commit, or none do.

*** F-INV-003 — Handwritten OCR Ingestion =P2= =CLIENT=

Deferred. Specified here so the P2 build has no design work to do.

*Problem shape:* Kenyan restaurants track stock in exercise books. Columns may
or may not have ruled lines. Handwriting varies. Language mixes English and
Swahili. Quantity units are inconsistent (=20kg=, =15 bnd=, =30pcs=).

*Recommended approach:* vision-model extraction, not classical OCR. Tesseract
fails on cursive and unruled columns. A vision LLM understands that
=Sukuma Wiki= is a vegetable and that =15 bnd= means fifteen bundles.

*Pipeline:*
#+BEGIN_SRC text
Photo → client-side downscale to max 1568px long edge (reduces tokens ~4x)
      → upload to Cloudflare R2
      → Hono POST /api/ocr/extract
      → vision model with structured-output prompt
      → JSON: {rows: [{name, qty, unit, price, category, confidence}]}
      → rows with confidence < 0.75 flagged for review
      → same preview/approve UI as CSV import (reuse F-INV-005)
      → commit
#+END_SRC

*Cost note:* at roughly $0.03 per page, a restaurant onboarding 5 pages of
ledger costs $0.15 — a one-time cost per tenant, not recurring.

*Fallback ladder:* vision model → PaddleOCR self-hosted → manual entry. Always
offer manual entry; never trap a user in a failed extraction.

*** F-INV-004 — Template Mapping with EN/SW Explanations =P2= =CLIENT=

Deferred. Design intent: after auto-mapping, show each mapped column with a
plain-language explanation of what the system will do with it, in the manager's
chosen language. Manager can override any mapping via dropdown. Mappings are
saveable as named templates for repeat imports.

*** F-INV-005 — Preview, Edit, Approve Workflow =MVP= =CLIENT=

Shared by CSV import (MVP) and OCR import (P2).

*States:* =parsing= → =mapping= → =preview= → =committing= → =done= | =failed=

*Preview table:* every row editable inline. Status column shows =ok= / =warn=
(missing optional field) / =error= (missing or invalid required field). Commit
button disabled while any =error= rows remain, with a count: "3 rows need
attention."

*Acceptance:*
- [ ] Editing a cell re-runs validation for that row only.
- [ ] Commit is blocked with errors present, and says why.
- [ ] Cancelling discards everything, no partial writes.

*** F-INV-006 — Retain Original Column Names =MVP= =CLIENT=

Every imported item stores =sourceColumns: Record<string,string>= — the raw
header→value pairs from the source file. This preserves information the
canonical schema drops (a =Supplier= column, a =Shelf= column) and lets the
manager see their own vocabulary in a detail view.

Rendered in the item detail drawer under a collapsed "Original data" section.

*** F-INV-007 — Final Preview and Upload =MVP= =CLIENT=

Terminal confirmation screen before commit. Shows: total rows, rows to insert,
rows to update (matched by name), rows skipped, and the resulting total menu
size. Single primary action. This is the last reversible moment and it should
feel like one.

** 4.2 F-STK: Stock Management

*** F-STK-001 — Real-Time Stock Updates =MVP= =CLIENT=

*Goal:* stock state changes propagate to every surface within ~1 second.

*Mechanism:* Convex reactive queries. The counter dashboard, the waiter
dashboard, and the WhatsApp bot's menu query all read the same
=menuItems= table. A mutation on any client invalidates and re-pushes to all
subscribers. No polling, no cache invalidation logic, no websocket code.

*Critical path:* the WhatsApp bot must read availability at *response
generation time*, not from a cached menu snapshot. A diner must never be
offered an item that went unavailable 30 seconds ago.

*** F-STK-002 — Availability Toggle =MVP= =CLIENT=

*Interaction:* a single switch per menu item. Optimistic UI — the switch moves
instantly, reverts with a toast if the mutation fails.

*Design requirement (see §8):* this is the single most-used control in the
system. Counter staff will hit it dozens of times per shift, often while
holding something else, on a phone, in a hurry. Touch target minimum 44×44px.
Press feedback is mandatory (=scale(0.96)= on =:active=). Colour alone must not
encode state — the switch has both a colour change and a position change.

*Bulk action:* select-all-in-category → mark unavailable. When the kitchen runs
out of ugali, everything ugali-based goes at once.

*Acceptance:*
- [ ] Toggle reflects in WhatsApp bot menu within 2 s.
- [ ] Failed mutation reverts the switch and shows a toast.
- [ ] Toggle is operable by keyboard (Space/Enter) and announces state to AT.
- [ ] Works at 44px target on a 375px-wide viewport.

** 4.3 F-WA: WhatsApp Ordering

*** F-WA-001 — Natural Conversation Flow =MVP= =CLIENT=

The conversation engine is specified in full in §7. Summary of principles:

- *Deterministic state machine, LLM-assisted.* State transitions are code. The
  LLM classifies intent and writes prose; it never decides what happens next.
- *Always offer an escape.* Every message accepts =menu=, =help=, =waiter=,
  =cancel= regardless of state.
- *Numbered lists, not free text matching.* When presenting options, number
  them. "2 and 5" is far more reliable than parsing "the chicken one and the
  soda".
- *Short messages.* WhatsApp is a chat surface, not a webpage. Maximum ~4 lines
  per message. Split long menus across messages rather than sending a wall.
- *Confirm before commit.* Never create an order without an explicit
  affirmative in the immediately preceding turn.

*** F-WA-002 — Smart Recommendations =MVP= =CLIENT=

*Inputs:* budget ceiling, category preference, dietary exclusions, current
availability, historical item ratings.

*Algorithm (deterministic, LLM only formats the output):*
#+BEGIN_SRC typescript
function recommend(menu: MenuItem[], ctx: RecommendContext): MenuItem[] {
  return menu
    .filter(i => i.available)
    .filter(i => ctx.maxPrice ? i.priceCents <= ctx.maxPrice : true)
    .filter(i => ctx.category ? i.category === ctx.category : true)
    .filter(i => !ctx.exclude.some(tag => i.tags.includes(tag)))
    .sort((a, b) => {
      // Bayesian-smoothed rating: pulls low-count items toward the mean
      const score = (x: MenuItem) =>
        (x.ratingSum + PRIOR_MEAN * PRIOR_WEIGHT) /
        (x.ratingCount + PRIOR_WEIGHT);
      return score(b) - score(a);
    })
    .slice(0, 3);
}
#+END_SRC

Bayesian smoothing matters: without it, a single 5-star rating on a new item
outranks a 4.6-average item with 200 ratings. =PRIOR_MEAN = 3.5=,
=PRIOR_WEIGHT = 5=.

*Empty-result handling:* if filters produce nothing, relax in priority order —
drop category first, then raise budget by 20%, then drop dietary tags last
(never silently violate a dietary exclusion; say so instead).

*** F-WA-003 — Order Placement, Queuing, Staff Callback =MVP= =CLIENT=

*Queue semantics:* orders enter =PLACED= and sit in the counter queue ordered
by =placedAt= ascending. No auto-confirmation — a human must confirm. This is
the anti-scam requirement's core: every order is human-verified before it
reaches the kitchen.

*Callback:* on confirmation, the system sends the diner a message naming the
confirming staff member. This closes the loop and creates accountability —
the diner knows a real person at the restaurant has their order.

*** F-WA-004 — QR Code Table Binding =MVP= =CLIENT=

*Encoding:* each table's QR encodes
=https://wa.me/<restaurant_wa_number>?text=TABLE-{NN}=

The prefilled text is the binding mechanism. When the diner sends it, the
webhook regex-matches =/^TABLE-(\d{1,3})$/i= and binds the session to that
table without asking.

*QR generation:* manager dashboard renders a printable sheet, one QR per table,
with table number in large type beneath. A4, 6 per page, cut lines. Generated
client-side with =qrcode= — no server round-trip, no stored images.

*Failure mode:* if a diner messages without the table prefix, the bot asks for
a table number and validates it against the tables list. Never assume.

*** F-WA-005..008 — Anti-Scam Measures =MVP= =CLIENT=

Four distinct requirements that together form a verification chain:

| Req | Measure                | Implementation                                    |
|-----+------------------------+---------------------------------------------------|
| 005 | Waiter verification    | Order requires staff confirm; =confirmedBy= FK    |
| 006 | Table number input     | QR prefill, or explicit prompt + validation       |
| 007 | Customer name/details  | Name captured before browsing; phone from WA      |
| 008 | Timestamp recording    | Immutable =serviceEvents= row per lifecycle step  |

*The threat model this addresses:* in a cash-heavy in-person restaurant, the
realistic fraud is staff-side — an order served but not rung up, or rung up at
a lower price. The countermeasure is that every order has a WhatsApp-originated
paper trail with a customer phone number attached, and every state transition
names the staff member who caused it. The customer's phone becomes an
independent witness.

*=serviceEvents= is append-only.* No updates, no deletes, ever. Enforced at the
Convex function layer — there is simply no mutation exported that modifies an
existing row.

*** F-WA-009 — Post-Order Feedback =MVP= =CLIENT=

*Trigger:* Convex scheduled function, 10 minutes after =status=SERVED=.

*Flow:*
#+BEGIN_SRC text
Bot: "How was your meal at Heavenly Foods? Reply 1-5 (5 = excellent)"
Diner: "4"
Bot: "Thanks! Anything you especially liked? (or reply SKIP)"
Diner: "the pilau was great"
Bot: "Anything we should improve? (or reply SKIP)"
Diner: "waited a bit long"
Bot: "Noted — thank you. 🙏"
#+END_SRC

*Item attribution:* free-text likes/dislikes are matched against the items in
that specific order using fuzzy string matching (Levenshtein ratio > 0.7)
against item names. Matched items get their =ratingSum=/=ratingCount= updated.
Unmatched text is stored on the feedback row for F-MGR-002 (low-rated items
with reasons).

*Rate limiting:* one feedback prompt per order, maximum one per phone per 4
hours. Nobody gets spammed.

*** F-WA-010 — Marketing Consent =MVP= =CLIENT=

*Legal context:* Kenya's Data Protection Act (2019) requires explicit,
informed, revocable consent for marketing communications. This is not a
nice-to-have.

*Implementation:*
- Asked *once*, after the first completed order, never before.
- Explicit opt-in — "Reply YES to get our offers on WhatsApp, or NO to skip."
- Silence is =NO=. Never default to opted-in.
- =STOP= at any point in any conversation revokes consent immediately.
- Consent record stores =consentedAt=, =consentText= (the exact wording shown),
  and =revokedAt=. This is the audit trail a regulator would ask for.

** 4.4 F-CTR: Counter Dashboard

*** F-CTR-001/002 — Order Queue Management =MVP= =CLIENT=

*Layout:* three columns — =Incoming= (PLACED), =In Kitchen= (CONFIRMED,
PREPARING), =Ready= (READY). Cards move between columns as state changes,
driven purely by the Convex subscription.

*Card contents:* table number (largest element), customer name, item lines with
quantities, total, elapsed time since placement.

*Elapsed-time urgency:* card border colour shifts as time passes — neutral
under 5 min, warning 5–10 min, danger over 10 min. This is the one place
colour-as-alarm earns its keep, and it is paired with the literal elapsed
number so it is never colour-only.

*Actions per card:* Confirm, Cancel (with reason), Mark Ready, Mark Served.

*** F-CTR-003 — Manual Order Creation =MVP= =CLIENT=

For walk-ins and phone orders. Same order record shape, =source: "MANUAL"=
instead of =source: "WHATSAPP"=. Table number required; customer name and phone
optional.

Item picker is a searchable list filtered to available items only, with a
running total. Reuses the same recommendation filter logic as the bot.

*** F-CTR-004 — Stock Availability from Counter =MVP= =CLIENT=

Same toggle component as the manager's menu screen (F-STK-002), embedded as a
slide-over panel so counter staff never leave the order queue. This matters:
the moment you discover you're out of something is while looking at an order
for it.

*** F-CTR-005 — Contact Customer =MVP= =CLIENT=

Tapping a customer's number opens =wa.me/<number>= from the restaurant's
verified WABA number. No number is ever displayed in a way that could be
copied to a personal device — the action is a link, not a phone number string.

** 4.5 F-WTR: Waiter Dashboard

*** F-WTR-001 — Assigned Tables View =MVP= =CLIENT=

Waiter sees only orders for tables assigned to them in the current shift.
Assignment is a simple =tableAssignments= record; roster integration is P2.

Mobile-first by default — waiters are on phones, standing, one-handed. Single
column, large targets, no horizontal scroll at 375px.

*** F-WTR-002 — Roster Integration =P2= =CLIENT=

Deferred. Design intent: shifts define time windows; table assignments inherit
from the active shift; a waiter's dashboard scopes automatically by current
time. MVP uses manual assignment which the manager sets.

*** F-WTR-003 — Service Timestamps =MVP= =CLIENT=

Every transition a waiter causes writes a =serviceEvents= row:

#+BEGIN_SRC typescript
{
  orderId, tableNumber, staffId,
  event: "CONFIRMED" | "PREPARING" | "READY" | "SERVED" | "CLOSED",
  at: number,            // epoch ms
  previousEvent: string, // for delta computation
  deltaMs: number,       // time since previous event
}
#+END_SRC

The =deltaMs= denormalisation is deliberate — it makes every downstream
analytic a simple aggregate instead of a self-join.

*Derived metrics (all computable from this one table):*
- Time to confirm = =CONFIRMED.at - order.placedAt=
- Kitchen time = =READY.at - CONFIRMED.at=
- Service time = =SERVED.at - READY.at=
- Table turn = =CLOSED.at - order.placedAt=

*** F-WTR-004 — Waiter Performance Tracking =MVP (raw)= =CLIENT=

*MVP:* show each waiter their own raw numbers — orders served today, median
service time, average rating on their tables. Self-visible only.

*P2:* composite ranking. Deferred deliberately, because a ranking algorithm
that staff perceive as unfair is worse than no ranking. The composite needs
real data to calibrate before it goes live.

*Proposed P2 formula (for later calibration):*
#+BEGIN_SRC text
score = 0.40 × normalised(inverse median service time)
      + 0.40 × normalised(mean customer rating)
      + 0.20 × normalised(orders handled)

Excludes any waiter with < 20 orders in the period (insufficient sample).
#+END_SRC

** 4.6 F-MGR: Manager / Admin Dashboard

*** F-MGR-001 — Top-Rated Items =MVP= =CLIENT=

Bayesian-smoothed rating, minimum 5 ratings to appear. Shows item, category,
smoothed score, rating count, orders in period. Sortable.

*** F-MGR-002 — Low-Rated Items With Reasons =MVP= =CLIENT=

Same ranking inverted, plus the free-text dislike comments attached to each
item from feedback rows. The comments are the actionable part — "chapati was
cold" tells the manager something "2.1 stars" does not.

*** F-MGR-003 — Categorized Improvement Summaries =P2= =CLIENT=

Deferred. Design intent: LLM clusters free-text feedback into themes
(temperature, portion, speed, taste, price) and produces a weekly digest with
counts and representative quotes. Genuinely useful, genuinely not MVP-critical.

*** F-MGR-004 — Order Patterns By Day =MVP= =CLIENT=

Two views: orders per day over the selected range (line), and orders per hour
of day averaged over the range (bar). The hourly view is the operationally
useful one — it tells the manager when to schedule staff.

*** F-MGR-005 — Table Performance =MVP= =CLIENT=

Per table: total orders, total revenue, average turn time, average rating.
Identifies both the best-performing tables (worth replicating the conditions)
and the slow ones (worth investigating — bad location, poor waiter coverage).

Peak-time detection: for each table, the hour bucket with highest order count.

*** F-MGR-006 — Waiter Ranking =P2= =CLIENT=

See F-WTR-004. Deferred pending calibration data.

*** F-MGR-007 — Daily/Weekly Reports =P2= =CLIENT=

Deferred. Design intent: scheduled generation, PDF export, optional WhatsApp
delivery to the owner's number. The data all exists in MVP; this is a
presentation layer.

*** F-MGR-008 — Add New Dishes =MVP= =CLIENT=

Covered by F-INV-001. Same form, same validation.

*** F-MGR-009/010 — Offers & Broadcast =P2= =CLIENT=

Deferred, with an important constraint noted now: WhatsApp broadcast messages
outside the 24-hour customer service window require *pre-approved message
templates* submitted to Meta. Template approval takes 24–48 hours. This is a
process dependency, not a code dependency, and it is the main reason this is
P2 rather than MVP — it cannot be built in hours regardless of engineering
effort.

*Broadcast must respect:* opt-in status (F-WA-010), Meta's per-number rate
limits, and a self-imposed maximum of one broadcast per opted-in user per week.

*** F-MGR-011 — User Management =MVP= =CLIENT=

Add staff, assign role (=COUNTER= | =WAITER= | =MANAGER= | =OWNER=),
enable/disable, delete. Role determines route access via middleware.

*Deletion is soft.* =disabled: true= plus =disabledAt=. Hard deletion would
orphan =serviceEvents= rows and break the audit trail that F-WA-008 exists to
create. A deleted staff member's historical actions remain attributable.

*** F-MGR-012 — Table Allocation =MVP= =CLIENT=

Define tables (number, seat count, zone), assign waiters to tables. Simple
grid UI. Feeds F-WTR-001 scoping.

*** F-MGR-013 — Roster Management =P2= =CLIENT=

Deferred with F-WTR-002.

--------------------------------------------------------------------------------

* 5. Data Model

** 5.1 Design Principles

1. *Multi-tenant from day one.* Every operational table carries =restaurantId=,
   even though MVP has one restaurant. Retrofitting tenancy is expensive;
   carrying an unused column is free.
2. *Money as integer cents.* =priceCents: number=. Never floats. KES 1,200.50
   is =120050=.
3. *Time as epoch milliseconds.* =number=, not =Date=, not ISO string. Convex
   stores numbers efficiently and comparison is trivial.
4. *Append-only where it matters.* =serviceEvents=, =feedback=,
   =processedMessages=, =consentLog= are never updated or deleted.
5. *Denormalise for read.* =orderItems= snapshots the item name and price *at
   order time*. If the manager changes a price tomorrow, yesterday's order
   still shows what the customer actually paid.

** 5.2 Convex Schema (Hot Store)

#+BEGIN_SRC typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({

  // ── Tenancy ────────────────────────────────────────────────────────────
  restaurants: defineTable({
    name:            v.string(),
    waPhoneNumberId: v.string(),   // Meta's phone_number_id
    waDisplayNumber: v.string(),   // E.164, for wa.me links
    currency:        v.string(),   // "KES"
    timezone:        v.string(),   // "Africa/Nairobi"
    active:          v.boolean(),
    createdAt:       v.number(),
  }).index("by_wa_phone_id", ["waPhoneNumberId"]),

  // ── Staff & Access ─────────────────────────────────────────────────────
  staff: defineTable({
    restaurantId: v.id("restaurants"),
    name:         v.string(),
    phone:        v.string(),      // E.164
    email:        v.optional(v.string()),
    role:         v.union(
                    v.literal("OWNER"),
                    v.literal("MANAGER"),
                    v.literal("COUNTER"),
                    v.literal("WAITER"),
                  ),
    disabled:     v.boolean(),
    disabledAt:   v.optional(v.number()),
    createdAt:    v.number(),
  })
    .index("by_restaurant", ["restaurantId"])
    .index("by_phone", ["phone"])
    .index("by_restaurant_role", ["restaurantId", "role"]),

  // ── Physical Layout ────────────────────────────────────────────────────
  tables: defineTable({
    restaurantId: v.id("restaurants"),
    number:       v.number(),      // 7 → "TABLE-07"
    seats:        v.number(),
    zone:         v.optional(v.string()),   // "Terrace", "Indoor"
    active:       v.boolean(),
  })
    .index("by_restaurant", ["restaurantId"])
    .index("by_restaurant_number", ["restaurantId", "number"]),

  tableAssignments: defineTable({
    restaurantId: v.id("restaurants"),
    tableId:      v.id("tables"),
    staffId:      v.id("staff"),
    assignedAt:   v.number(),
    unassignedAt: v.optional(v.number()),
  })
    .index("by_staff_active", ["staffId", "unassignedAt"])
    .index("by_table_active", ["tableId", "unassignedAt"]),

  // ── Menu & Inventory ───────────────────────────────────────────────────
  menuItems: defineTable({
    restaurantId:  v.id("restaurants"),
    name:          v.string(),
    description:   v.optional(v.string()),
    category:      v.string(),
    priceCents:    v.number(),
    available:     v.boolean(),
    tags:          v.array(v.string()),  // ["vegetarian","spicy","meat"]

    // Optional stock tracking (nullable — many items are made-to-order)
    quantity:      v.optional(v.number()),
    unit:          v.optional(v.string()),

    // Rating aggregates, updated by feedback mutations
    ratingSum:     v.number(),
    ratingCount:   v.number(),

    // F-INV-006: preserve the source spreadsheet's own vocabulary
    sourceColumns: v.optional(v.record(v.string(), v.string())),

    createdAt:     v.number(),
    updatedAt:     v.number(),
  })
    .index("by_restaurant", ["restaurantId"])
    .index("by_restaurant_available", ["restaurantId", "available"])
    .index("by_restaurant_category", ["restaurantId", "category"])
    .searchIndex("search_name", {
      searchField: "name",
      filterFields: ["restaurantId", "available"],
    }),

  // ── Conversation State ─────────────────────────────────────────────────
  sessions: defineTable({
    restaurantId:  v.id("restaurants"),
    phone:         v.string(),     // E.164, the session key
    state:         v.union(
                     v.literal("AWAITING_TABLE"),
                     v.literal("AWAITING_NAME"),
                     v.literal("BROWSING"),
                     v.literal("CART_REVIEW"),
                     v.literal("CONFIRMING"),
                     v.literal("ORDER_PLACED"),
                     v.literal("AWAITING_FEEDBACK_RATING"),
                     v.literal("AWAITING_FEEDBACK_LIKES"),
                     v.literal("AWAITING_FEEDBACK_DISLIKES"),
                     v.literal("IDLE"),
                   ),
    tableNumber:   v.optional(v.number()),
    customerName:  v.optional(v.string()),

    // Cart lives on the session until an order is created
    cart: v.array(v.object({
      menuItemId: v.id("menuItems"),
      name:       v.string(),
      priceCents: v.number(),
      qty:        v.number(),
    })),

    // The last numbered list sent, so "2 and 5" resolves correctly
    lastOffered:   v.array(v.id("menuItems")),

    activeOrderId: v.optional(v.id("orders")),
    lastMessageAt: v.number(),
    expiresAt:     v.number(),     // lastMessageAt + 30 min
    createdAt:     v.number(),
  })
    .index("by_phone", ["phone"])
    .index("by_expiry", ["expiresAt"]),

  // ── Orders ─────────────────────────────────────────────────────────────
  orders: defineTable({
    restaurantId:  v.id("restaurants"),
    orderNumber:   v.number(),     // human-facing, per-restaurant sequence
    tableNumber:   v.number(),
    customerName:  v.optional(v.string()),
    customerPhone: v.optional(v.string()),

    status: v.union(
      v.literal("PLACED"),
      v.literal("CONFIRMED"),
      v.literal("PREPARING"),
      v.literal("READY"),
      v.literal("SERVED"),
      v.literal("CLOSED"),
      v.literal("CANCELLED"),
    ),

    source: v.union(v.literal("WHATSAPP"), v.literal("MANUAL")),

    items: v.array(v.object({
      menuItemId: v.id("menuItems"),
      name:       v.string(),      // snapshot at order time
      priceCents: v.number(),      // snapshot at order time
      qty:        v.number(),
      notes:      v.optional(v.string()),
    })),

    totalCents:  v.number(),

    // Attribution — who did what (F-WA-005, F-WA-008)
    confirmedBy: v.optional(v.id("staff")),
    servedBy:    v.optional(v.id("staff")),
    cancelledBy: v.optional(v.id("staff")),
    cancelReason: v.optional(v.string()),

    placedAt:    v.number(),
    confirmedAt: v.optional(v.number()),
    readyAt:     v.optional(v.number()),
    servedAt:    v.optional(v.number()),
    closedAt:    v.optional(v.number()),

    feedbackRequestedAt: v.optional(v.number()),
  })
    .index("by_restaurant_status", ["restaurantId", "status"])
    .index("by_restaurant_placed", ["restaurantId", "placedAt"])
    .index("by_table", ["restaurantId", "tableNumber"])
    .index("by_phone", ["customerPhone"])
    .index("by_order_number", ["restaurantId", "orderNumber"]),

  // ── Audit Trail (APPEND-ONLY) ──────────────────────────────────────────
  serviceEvents: defineTable({
    restaurantId:  v.id("restaurants"),
    orderId:       v.id("orders"),
    tableNumber:   v.number(),
    staffId:       v.optional(v.id("staff")),
    event:         v.string(),     // matches order status values
    previousEvent: v.optional(v.string()),
    deltaMs:       v.optional(v.number()),
    at:            v.number(),
  })
    .index("by_order", ["orderId"])
    .index("by_restaurant_at", ["restaurantId", "at"])
    .index("by_staff_at", ["staffId", "at"]),

  // ── Feedback (APPEND-ONLY) ─────────────────────────────────────────────
  feedback: defineTable({
    restaurantId:   v.id("restaurants"),
    orderId:        v.id("orders"),
    tableNumber:    v.number(),
    servedBy:       v.optional(v.id("staff")),
    rating:         v.number(),    // 1..5
    likedText:      v.optional(v.string()),
    dislikedText:   v.optional(v.string()),
    likedItemIds:   v.array(v.id("menuItems")),
    dislikedItemIds: v.array(v.id("menuItems")),
    at:             v.number(),
  })
    .index("by_restaurant_at", ["restaurantId", "at"])
    .index("by_order", ["orderId"])
    .index("by_staff", ["servedBy"]),

  // ── Consent (APPEND-ONLY) ──────────────────────────────────────────────
  consentLog: defineTable({
    restaurantId: v.id("restaurants"),
    phone:        v.string(),
    granted:      v.boolean(),
    consentText:  v.string(),      // exact wording shown to the user
    at:           v.number(),
  })
    .index("by_phone_at", ["phone", "at"]),

  // ── Idempotency ────────────────────────────────────────────────────────
  processedMessages: defineTable({
    wamid: v.string(),             // Meta's message id
    at:    v.number(),
  }).index("by_wamid", ["wamid"]),

  // ── Import Jobs ────────────────────────────────────────────────────────
  importJobs: defineTable({
    restaurantId: v.id("restaurants"),
    startedBy:    v.id("staff"),
    kind:         v.union(v.literal("CSV"), v.literal("XLSX"), v.literal("OCR")),
    status:       v.union(
                    v.literal("PARSING"),
                    v.literal("MAPPING"),
                    v.literal("PREVIEW"),
                    v.literal("COMMITTING"),
                    v.literal("DONE"),
                    v.literal("FAILED"),
                  ),
    sourceFileName: v.optional(v.string()),
    rowsTotal:      v.number(),
    rowsValid:      v.number(),
    rowsCommitted:  v.number(),
    columnMapping:  v.optional(v.record(v.string(), v.string())),
    error:          v.optional(v.string()),
    createdAt:      v.number(),
    completedAt:    v.optional(v.number()),
  }).index("by_restaurant", ["restaurantId"]),
});
#+END_SRC

** 5.3 CockroachDB Schema (Cold Store, P2 Read Path)

Provisioned and migrated in MVP; populated by nightly rollup in P2.

#+BEGIN_SRC sql
-- Star schema: one fact table, conformed dimensions.

CREATE TABLE dim_restaurant (
  restaurant_id  STRING PRIMARY KEY,
  name           STRING NOT NULL,
  timezone       STRING NOT NULL,
  currency       STRING NOT NULL
);

CREATE TABLE dim_staff (
  staff_id       STRING PRIMARY KEY,
  restaurant_id  STRING NOT NULL REFERENCES dim_restaurant(restaurant_id),
  name           STRING NOT NULL,
  role           STRING NOT NULL,
  disabled       BOOL   NOT NULL DEFAULT false
);

CREATE TABLE dim_menu_item (
  menu_item_id   STRING PRIMARY KEY,
  restaurant_id  STRING NOT NULL REFERENCES dim_restaurant(restaurant_id),
  name           STRING NOT NULL,
  category       STRING NOT NULL,
  price_cents    INT    NOT NULL,
  valid_from     TIMESTAMPTZ NOT NULL,
  valid_to       TIMESTAMPTZ,           -- SCD Type 2: price history preserved
  INDEX (restaurant_id, category)
);

CREATE TABLE fact_order (
  order_id          STRING PRIMARY KEY,
  restaurant_id     STRING NOT NULL REFERENCES dim_restaurant(restaurant_id),
  order_number      INT    NOT NULL,
  table_number      INT    NOT NULL,
  status            STRING NOT NULL,
  source            STRING NOT NULL,
  total_cents       INT    NOT NULL,
  item_count        INT    NOT NULL,

  confirmed_by      STRING REFERENCES dim_staff(staff_id),
  served_by         STRING REFERENCES dim_staff(staff_id),

  placed_at         TIMESTAMPTZ NOT NULL,
  confirmed_at      TIMESTAMPTZ,
  ready_at          TIMESTAMPTZ,
  served_at         TIMESTAMPTZ,
  closed_at         TIMESTAMPTZ,

  -- Precomputed durations: makes every downstream query a simple aggregate
  secs_to_confirm   INT,
  secs_in_kitchen   INT,
  secs_to_serve     INT,
  secs_total_turn   INT,

  -- Time dimension, denormalised for fast GROUP BY
  order_date        DATE   NOT NULL,
  order_hour        INT    NOT NULL,   -- 0..23, restaurant-local
  order_dow         INT    NOT NULL,   -- 0=Sunday

  INDEX (restaurant_id, order_date),
  INDEX (restaurant_id, order_hour),
  INDEX (restaurant_id, table_number, order_date),
  INDEX (served_by, order_date)
);

CREATE TABLE fact_order_item (
  order_item_id  STRING PRIMARY KEY,
  order_id       STRING NOT NULL REFERENCES fact_order(order_id),
  menu_item_id   STRING NOT NULL REFERENCES dim_menu_item(menu_item_id),
  restaurant_id  STRING NOT NULL,
  qty            INT    NOT NULL,
  price_cents    INT    NOT NULL,      -- snapshot, not a join to dim
  line_total     INT    NOT NULL,
  order_date     DATE   NOT NULL,
  INDEX (restaurant_id, menu_item_id, order_date)
);

CREATE TABLE fact_feedback (
  feedback_id    STRING PRIMARY KEY,
  restaurant_id  STRING NOT NULL,
  order_id       STRING NOT NULL REFERENCES fact_order(order_id),
  table_number   INT    NOT NULL,
  served_by      STRING REFERENCES dim_staff(staff_id),
  rating         INT    NOT NULL CHECK (rating BETWEEN 1 AND 5),
  liked_text     STRING,
  disliked_text  STRING,
  created_at     TIMESTAMPTZ NOT NULL,
  order_date     DATE NOT NULL,
  INDEX (restaurant_id, order_date),
  INDEX (served_by, order_date)
);

CREATE TABLE fact_service_event (
  event_id       STRING PRIMARY KEY,
  restaurant_id  STRING NOT NULL,
  order_id       STRING NOT NULL,
  staff_id       STRING,
  event          STRING NOT NULL,
  delta_ms       INT,
  occurred_at    TIMESTAMPTZ NOT NULL,
  order_date     DATE NOT NULL,
  INDEX (restaurant_id, order_date),
  INDEX (staff_id, occurred_at)
);
#+END_SRC

** 5.4 Representative Analytics Queries (P2)

#+BEGIN_SRC sql
-- F-MGR-004: orders by hour of day, last 30 days
SELECT order_hour,
       COUNT(*)                        AS orders,
       ROUND(AVG(total_cents) / 100.0, 2) AS avg_ticket_kes
FROM fact_order
WHERE restaurant_id = $1
  AND order_date >= current_date - INTERVAL '30 days'
  AND status NOT IN ('CANCELLED')
GROUP BY order_hour
ORDER BY order_hour;

-- F-MGR-005: table performance with peak hour
WITH per_table AS (
  SELECT table_number,
         COUNT(*)                       AS orders,
         SUM(total_cents)               AS revenue_cents,
         AVG(secs_total_turn)           AS avg_turn_secs
  FROM fact_order
  WHERE restaurant_id = $1
    AND order_date >= current_date - INTERVAL '30 days'
    AND status = 'CLOSED'
  GROUP BY table_number
),
peak AS (
  SELECT table_number, order_hour,
         ROW_NUMBER() OVER (PARTITION BY table_number
                            ORDER BY COUNT(*) DESC) AS rn
  FROM fact_order
  WHERE restaurant_id = $1
    AND order_date >= current_date - INTERVAL '30 days'
  GROUP BY table_number, order_hour
)
SELECT t.table_number,
       t.orders,
       ROUND(t.revenue_cents / 100.0, 2) AS revenue_kes,
       ROUND(t.avg_turn_secs / 60.0, 1)  AS avg_turn_mins,
       p.order_hour                      AS peak_hour
FROM per_table t
LEFT JOIN peak p ON p.table_number = t.table_number AND p.rn = 1
ORDER BY t.revenue_cents DESC;

-- F-MGR-001 / F-MGR-002: item ratings, Bayesian-smoothed
WITH item_ratings AS (
  SELECT foi.menu_item_id,
         COUNT(ff.feedback_id)  AS rating_count,
         SUM(ff.rating)         AS rating_sum
  FROM fact_order_item foi
  JOIN fact_feedback ff ON ff.order_id = foi.order_id
  WHERE foi.restaurant_id = $1
    AND foi.order_date >= current_date - INTERVAL '90 days'
  GROUP BY foi.menu_item_id
)
SELECT d.name,
       d.category,
       ir.rating_count,
       ROUND((ir.rating_sum + 3.5 * 5)::DECIMAL
             / (ir.rating_count + 5), 2) AS smoothed_rating
FROM item_ratings ir
JOIN dim_menu_item d ON d.menu_item_id = ir.menu_item_id
WHERE ir.rating_count >= 5
ORDER BY smoothed_rating DESC;
#+END_SRC

--------------------------------------------------------------------------------

* 6. API Contract

** 6.1 Conventions

- Base: =https://api.heavenlyfoods.workers.dev=
- All request/response bodies JSON.
- Auth: =Authorization: Bearer <session_token>= for =/api/*=.
- The webhook path is authenticated by Meta's HMAC signature, not by bearer token.
- Errors follow a single shape:

#+BEGIN_SRC json
{
  "error": {
    "code": "MENU_ITEM_UNAVAILABLE",
    "message": "Pilau is currently unavailable",
    "details": { "menuItemId": "..." }
  }
}
#+END_SRC

- Every response carries =X-Request-Id= for log correlation.

** 6.2 Webhook Endpoints

*** =GET /webhook/whatsapp= — Meta verification handshake

| Query param            | Required | Notes                          |
|------------------------+----------+--------------------------------|
| =hub.mode=             | yes      | must equal ="subscribe"=       |
| =hub.verify_token=     | yes      | must match =WA_VERIFY_TOKEN=   |
| =hub.challenge=        | yes      | echoed back as plain text 200  |

Returns =403= on token mismatch.

*** =POST /webhook/whatsapp= — inbound messages

*Security:* verify =X-Hub-Signature-256= before reading the body. Use Web
Crypto (Workers has no Node =crypto=):

#+BEGIN_SRC typescript
async function verifySignature(
  raw: string, header: string, appSecret: string
): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(appSecret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC", key, new TextEncoder().encode(raw)
  );
  const expected = "sha256=" + [...new Uint8Array(sig)]
    .map(b => b.toString(16).padStart(2, "0")).join("");
  // constant-time compare
  if (expected.length !== header.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ header.charCodeAt(i);
  }
  return diff === 0;
}
#+END_SRC

*Behaviour:* respond =200= within ~50 ms unconditionally. All processing
happens in =ctx.waitUntil()=. Meta does not care about the body of the 200.

** 6.3 Menu Endpoints

| Method   | Path                        | Auth      | Purpose                     |
|----------+-----------------------------+-----------+-----------------------------|
| =GET=    | =/api/menu=                 | any staff | List items (filterable)     |
| =GET=    | =/api/menu/:id=             | any staff | Single item                 |
| =POST=   | =/api/menu=                 | MANAGER+  | Create item                 |
| =PATCH=  | =/api/menu/:id=             | MANAGER+  | Update item                 |
| =PATCH=  | =/api/menu/:id/availability=| COUNTER+  | Toggle availability         |
| =POST=   | =/api/menu/bulk-availability=| COUNTER+ | Toggle a whole category     |
| =DELETE= | =/api/menu/:id=             | MANAGER+  | Soft-delete                 |
| =POST=   | =/api/menu/import=          | MANAGER+  | Commit a validated import   |

*=PATCH /api/menu/:id/availability=*
#+BEGIN_SRC typescript
// Request
{ "available": false }
// Response 200
{ "id": "...", "name": "Pilau", "available": false, "updatedAt": 1753142400000 }
#+END_SRC

** 6.4 Order Endpoints

| Method  | Path                        | Auth      | Purpose                    |
|---------+-----------------------------+-----------+----------------------------|
| =GET=   | =/api/orders=               | any staff | List, filtered by status   |
| =GET=   | =/api/orders/:id=           | any staff | Single order + events      |
| =POST=  | =/api/orders=               | COUNTER+  | Manual order creation      |
| =POST=  | =/api/orders/:id/confirm=   | COUNTER+  | PLACED → CONFIRMED         |
| =POST=  | =/api/orders/:id/ready=     | COUNTER+  | → READY                    |
| =POST=  | =/api/orders/:id/serve=     | WAITER+   | → SERVED                   |
| =POST=  | =/api/orders/:id/close=     | WAITER+   | → CLOSED                   |
| =POST=  | =/api/orders/:id/cancel=    | COUNTER+  | → CANCELLED (reason req'd) |

*State machine — transitions are validated server-side:*

#+BEGIN_SRC text
  PLACED ──confirm──► CONFIRMED ──ready──► READY ──serve──► SERVED ──close──► CLOSED
     │                    │                  │                │
     └────cancel──────────┴──────cancel──────┴────cancel──────┘
                              │
                              ▼
                          CANCELLED  (terminal)
#+END_SRC

Any transition not on this diagram returns =409 INVALID_TRANSITION= with the
current status in =details=.

** 6.5 Analytics Endpoints

| Method | Path                            | Auth     | Purpose                |
|--------+---------------------------------+----------+------------------------|
| =GET=  | =/api/analytics/overview=       | MANAGER+ | KPI tiles              |
| =GET=  | =/api/analytics/items=          | MANAGER+ | Top/bottom rated       |
| =GET=  | =/api/analytics/tables=         | MANAGER+ | Table performance      |
| =GET=  | =/api/analytics/staff=          | MANAGER+ | Per-waiter metrics     |
| =GET=  | =/api/analytics/patterns=       | MANAGER+ | Orders by day/hour     |

All accept =?from=<epoch>&to=<epoch>=, defaulting to last 30 days.

** 6.6 Rate Limits

| Scope                     | Limit            | Enforcement           |
|---------------------------+------------------+-----------------------|
| Inbound WA per phone      | 20 msg / min     | Convex counter + TTL  |
| =/api/*= per staff token  | 120 req / min    | Workers KV counter    |
| Outbound WA per recipient | 1 msg / 2 s      | In-worker queue delay |
| Feedback prompt per phone | 1 / 4 h          | Checked before send   |

--------------------------------------------------------------------------------

* 7. WhatsApp Conversation Engine

** 7.1 Architecture: Deterministic Core, LLM Periphery

#+BEGIN_SRC text
inbound message
      │
      ▼
┌─────────────────┐
│ Global commands │  menu / help / waiter / cancel / stop
│ (regex, first)  │  ── matched? ──► handle, return
└────────┬────────┘
         │ no match
         ▼
┌─────────────────┐
│ State handler   │  switch(session.state)
│ (deterministic) │
└────────┬────────┘
         │ needs NL understanding?
         ▼
┌─────────────────┐
│ LLM: classify   │  free text ──► {intent, slots}
│ (read-only)     │  closed intent set, JSON output
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Business logic  │  queries Convex, applies rules,
│ (deterministic) │  performs mutations
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ LLM: format     │  structured result ──► friendly prose
│ (read-only)     │  optional; templates used when possible
└────────┬────────┘
         │
         ▼
    send via WA Cloud API
#+END_SRC

*The LLM never mutates.* It receives read-only context and returns either a
classification or a string. Every database write is a TypeScript function with
validated arguments.

** 7.2 Global Commands

Handled before any state logic, in every state:

| Input (case-insensitive)   | Effect                                       |
|----------------------------+----------------------------------------------|
| =menu=, =orodha=           | Send category list, state → BROWSING          |
| =help=, =msaada=           | Send command help                             |
| =waiter=, =mhudumu=        | Flag order for staff attention, notify counter|
| =cancel=, =ghairi=         | Clear cart, state → BROWSING                  |
| =stop=                     | Revoke marketing consent, confirm             |
| =status=                   | Report current order status if one exists     |

** 7.3 State Machine

#+BEGIN_SRC text
        [new phone]
             │
             ▼
    ┌─────────────────┐   TABLE-NN matched
    │ AWAITING_TABLE  │──────────────────┐
    └────────┬────────┘                  │
             │ invalid                   │
             │ (re-prompt, max 3)        ▼
             │                  ┌─────────────────┐
             └─────────────────►│  AWAITING_NAME  │
                                └────────┬────────┘
                                         │ any non-empty text
                                         ▼
                                ┌─────────────────┐
                    ┌──────────►│    BROWSING     │◄──────────┐
                    │           └────────┬────────┘           │
                    │                    │ ADD_TO_CART        │
                    │                    ▼                    │
                    │           ┌─────────────────┐           │
                    │           │   CART_REVIEW   │───────────┘
                    │           └────────┬────────┘  add more
                    │                    │ CONFIRM
                    │                    ▼
                    │           ┌─────────────────┐
                    │           │   CONFIRMING    │
                    │           └────────┬────────┘
                    │                    │ yes
                    │                    ▼
                    │           ┌─────────────────┐
                    │           │  ORDER_PLACED   │
                    │           └────────┬────────┘
                    │                    │ +10 min after SERVED
                    │                    ▼
                    │        ┌──────────────────────────┐
                    │        │ AWAITING_FEEDBACK_RATING │
                    │        └────────────┬─────────────┘
                    │                     ▼
                    │        ┌──────────────────────────┐
                    │        │ AWAITING_FEEDBACK_LIKES  │
                    │        └────────────┬─────────────┘
                    │                     ▼
                    │        ┌──────────────────────────┐
                    │        │AWAITING_FEEDBACK_DISLIKES│
                    │        └────────────┬─────────────┘
                    │                     ▼
                    │           ┌─────────────────┐
                    └───────────│      IDLE       │
                    (new order) └─────────────────┘
#+END_SRC

*Session TTL:* 30 minutes of inactivity → state resets to =IDLE=, cart cleared.
Enforced by a Convex scheduled function scanning =by_expiry=.

** 7.4 Intent Set (Closed)

The LLM may only return one of these. Anything else is treated as =UNKNOWN=.

| Intent            | Slots extracted                          |
|-------------------+------------------------------------------|
| =BROWSE_CATEGORY= | =category: string=                       |
| =RECOMMEND=       | =maxPriceCents?, category?, exclude[]=   |
| =ADD_TO_CART=     | =selections: number[]=, =qty?: number[]= |
| =REMOVE_FROM_CART=| =selections: number[]=                   |
| =VIEW_CART=       | —                                        |
| =CONFIRM_ORDER=   | —                                        |
| =ASK_PRICE=       | =itemQuery: string=                      |
| =ASK_AVAILABILITY=| =itemQuery: string=                      |
| =SMALL_TALK=      | —                                        |
| =UNKNOWN=         | —                                        |

** 7.5 Classification Prompt

#+BEGIN_SRC text
You are an intent classifier for a restaurant ordering bot in Kenya.

Return ONLY valid JSON. No markdown, no code fences, no explanation.

Schema:
{
  "intent": one of [BROWSE_CATEGORY, RECOMMEND, ADD_TO_CART,
                    REMOVE_FROM_CART, VIEW_CART, CONFIRM_ORDER,
                    ASK_PRICE, ASK_AVAILABILITY, SMALL_TALK, UNKNOWN],
  "maxPriceCents": integer or null,
  "category": string or null,
  "exclude": array of strings,
  "selections": array of integers,
  "qty": array of integers,
  "itemQuery": string or null
}

Rules:
- Kenyan slang for money: "bob" = KES. "500 bob" → maxPriceCents 50000.
- "K" suffix means thousands: "2K" → 200000 cents.
- Swahili is common. "nataka" = I want. "bei" = price. "chakula" = food.
  "nyama" = meat. "samaki" = fish. "mboga" = vegetables.
- If the user gives bare numbers and a numbered list was just sent,
  intent is ADD_TO_CART and those numbers are `selections`.
- Dietary exclusions go in `exclude` as lowercase tags:
  meat, pork, beef, chicken, fish, dairy, gluten, nuts.
- When genuinely unclear, return UNKNOWN. Do not guess.

Last list sent to user (1-indexed):
{{LAST_OFFERED}}

Available categories:
{{CATEGORIES}}

User message:
{{MESSAGE}}
#+END_SRC

*Robustness:* parse the response with a Zod schema. On parse failure, retry
once with a "return only JSON" reminder. On second failure, fall back to
=UNKNOWN= and send a clarifying question. Never let a malformed LLM response
reach the user or the database.

** 7.6 Message Templates

Deterministic templates are used wherever possible — they are faster, free,
and never hallucinate. The LLM formats only when genuine variability helps.

#+BEGIN_SRC typescript
export const templates = {
  greetTable: (name: string, table: number) =>
    `Karibu ${name}! 👋\nYou're at table ${table}.\n\n` +
    `Reply *menu* to see what we have, or tell me what you're in the mood for.`,

  askTable: () =>
    `Karibu Heavenly Foods! 👋\n\nWhich table are you at? ` +
    `Reply with the number (e.g. *7*).`,

  askName: () =>
    `Great. What name should I put on the order?`,

  categoryList: (cats: string[]) =>
    `Here's what we're serving:\n\n` +
    cats.map((c, i) => `${i + 1}. ${c}`).join("\n") +
    `\n\nReply with a number, or tell me your budget.`,

  itemList: (items: MenuItem[], currency: string) =>
    items.map((it, i) =>
      `${i + 1}. *${it.name}* — ${currency} ${(it.priceCents / 100).toFixed(0)}` +
      (it.description ? `\n   ${it.description}` : "")
    ).join("\n\n") +
    `\n\nReply with the number(s) to add. e.g. *1* or *1 and 3*`,

  cartSummary: (cart: CartLine[], currency: string) => {
    const lines = cart.map(l =>
      `• ${l.qty}× ${l.name} — ${currency} ${(l.priceCents * l.qty / 100).toFixed(0)}`
    ).join("\n");
    const total = cart.reduce((s, l) => s + l.priceCents * l.qty, 0);
    return `Your order:\n\n${lines}\n\n*Total: ${currency} ` +
           `${(total / 100).toFixed(0)}*\n\nReply *yes* to confirm, ` +
           `or *menu* to add more.`;
  },

  orderPlaced: (orderNumber: number) =>
    `✅ Order #${orderNumber} placed!\n\n` +
    `A member of our team will confirm shortly.`,

  orderConfirmed: (orderNumber: number, staffName: string) =>
    `👍 Order #${orderNumber} confirmed by ${staffName}.\n\n` +
    `We're preparing it now.`,

  outOfStock: (name: string) =>
    `Sorry, *${name}* just ran out. 😔\n\nCan I suggest something else?`,

  askRating: () =>
    `How was your meal? Reply *1* to *5* (5 = excellent).`,

  askLikes: () =>
    `Thanks! Anything you especially enjoyed? (or reply *skip*)`,

  askDislikes: () =>
    `And anything we should improve? (or reply *skip*)`,

  feedbackDone: () =>
    `Asante sana! 🙏 See you again soon.`,

  consentAsk: () =>
    `Would you like to get our special offers on WhatsApp?\n\n` +
    `Reply *YES* to opt in, or *NO* to skip. ` +
    `You can reply *STOP* any time to unsubscribe.`,
};
#+END_SRC

** 7.7 Failure Handling

| Failure                    | Response                                              |
|----------------------------+-------------------------------------------------------|
| LLM timeout (>3 s)         | Fall back to numbered category menu, no error shown   |
| LLM returns invalid JSON   | Retry once, then send clarifying question             |
| Item went unavailable      | =outOfStock= template + recommend 2 alternatives      |
| 3 consecutive UNKNOWNs     | Offer human handoff: "Reply *waiter* for help"        |
| WA send fails (5xx)        | Retry ×3 with backoff 1s/3s/9s, then log and drop     |
| Convex mutation fails      | Do not send success message; apologise, ask to retry  |

--------------------------------------------------------------------------------

* 8. Frontend Design System

** 8.1 Design Philosophy

The design language is derived from the reference specification supplied with
this brief: *reverent content presentation framed by near-invisible UI*.
Translated to an operations console rather than a product catalogue, this means:

- *The data is the product.* An order card is the artifact. Chrome recedes.
- *Surface change is the divider.* Alternating surface tones separate regions
  instead of borders and shadows.
- *One accent, universally.* A single interactive colour carries every
  actionable element. There is no second accent.
- *Shadow is reserved.* Exactly one elevation treatment exists, and it is used
  sparingly — not on cards, not on buttons.
- *Typography is confident but quiet.* Negative tracking at display sizes,
  generous body leading, a weight ladder that skips 500.

Where the reference system optimises for a marketing catalogue viewed at
leisure, this system optimises for *a counter tablet in a loud room, and a
waiter's phone held one-handed*. The adaptations are noted at each point.

** 8.2 Colour System

*** 8.2.1 Tokens

#+BEGIN_SRC css
:root {
  color-scheme: light dark;

  /* ── Accent: the single interactive colour ─────────────────────── */
  --hf-accent:            #0066cc;
  --hf-accent-focus:      #0071e3;
  --hf-accent-on-dark:    #2997ff;

  /* ── Surfaces ──────────────────────────────────────────────────── */
  --hf-canvas:            #ffffff;
  --hf-canvas-alt:        #f5f5f7;   /* parchment: the rhythm surface */
  --hf-surface-pearl:     #fafafc;   /* ghost-button fill */
  --hf-tile-1:            #272729;
  --hf-tile-2:            #2a2a2c;
  --hf-tile-3:            #252527;
  --hf-void:              #000000;   /* top nav only */

  /* ── Ink ───────────────────────────────────────────────────────── */
  --hf-ink:               #1d1d1f;   /* not pure black — photographic */
  --hf-ink-80:            #333333;
  --hf-ink-48:            #7a7a7a;
  --hf-ink-on-dark:       #ffffff;
  --hf-ink-muted-on-dark: #cccccc;

  /* ── Hairlines ─────────────────────────────────────────────────── */
  --hf-divider-soft:      rgba(0, 0, 0, 0.04);
  --hf-hairline:          #e0e0e0;

  /* ── Operational status (functional, NOT brand accents) ────────── */
  --hf-status-fresh:      #1d9e75;   /* < 5 min  */
  --hf-status-aging:      #ba7517;   /* 5–10 min */
  --hf-status-urgent:     #d85a30;   /* > 10 min */

  /* ── The single elevation ──────────────────────────────────────── */
  --hf-shadow-object:     rgba(0, 0, 0, 0.22) 3px 5px 30px 0;

  /* ── Radii ─────────────────────────────────────────────────────── */
  --hf-r-none:  0px;
  --hf-r-sm:    8px;
  --hf-r-md:    11px;
  --hf-r-lg:    18px;
  --hf-r-pill:  9999px;

  /* ── Spacing (8px base) ────────────────────────────────────────── */
  --hf-sp-xxs:  4px;
  --hf-sp-xs:   8px;
  --hf-sp-sm:   12px;
  --hf-sp-md:   17px;
  --hf-sp-lg:   24px;
  --hf-sp-xl:   32px;
  --hf-sp-xxl:  48px;
  --hf-sp-sect: 80px;

  /* ── Motion ────────────────────────────────────────────────────── */
  --hf-dur-instant: 90ms;
  --hf-dur-fast:    160ms;
  --hf-dur-base:    240ms;
  --hf-dur-slow:    400ms;
  --hf-ease-out:    cubic-bezier(0.22, 1, 0.36, 1);
  --hf-ease-spring: linear(
    0, 0.0039, 0.0157, 0.0352, 0.0625 6.15%, 0.1407, 0.25, 0.3906, 0.5625,
    0.7656, 1, 1.0996, 1.1719, 1.2148, 1.2266, 1.2109, 1.1719, 1.1133,
    1.0430, 0.9727 62.9%, 0.9414, 0.9219, 0.9141, 0.9180, 0.9297, 0.9492,
    0.9727, 1
  );
}
#+END_SRC

*** 8.2.2 Dark Mode with =light-dark()=

Baseline-available. Used directly rather than duplicating a token block.

#+BEGIN_SRC css
.hf-card {
  background: light-dark(var(--hf-canvas), var(--hf-tile-1));
  color:      light-dark(var(--hf-ink), var(--hf-ink-on-dark));
  border:     0.5px solid light-dark(var(--hf-hairline), rgba(255,255,255,0.10));
}
#+END_SRC

*** 8.2.3 Non-Colour Properties Across Schemes

=light-dark()= only accepts colours. For a weight or a size that must differ
between schemes, use a boolean custom property plus a style query. This is the
pattern demonstrated in recent CSS working-group talks and it works in stable
browsers today without =@function=.

#+BEGIN_SRC css
:root { --hf-scheme: light; }
@media (prefers-color-scheme: dark) { :root { --hf-scheme: dark; } }

/* Dark surfaces make type look heavier; compensate by dropping weight. */
.hf-metric-value { font-weight: 600; }

@container style(--hf-scheme: dark) {
  .hf-metric-value { font-weight: 400; }
}
#+END_SRC

*** 8.2.4 Automatic Contrast with =contrast-color()=

Status chips are tinted by data, not by a fixed palette. Rather than
hand-picking a foreground for each possible tint, derive it.

#+BEGIN_SRC css
.hf-chip {
  background: var(--chip-bg);
  color: contrast-color(var(--chip-bg));   /* returns black or white */
}
#+END_SRC

To go beyond black/white, use the returned value as a boolean and branch with
a style query:

#+BEGIN_SRC css
@property --hf-contrast {
  syntax: "<color>";
  inherits: true;
  initial-value: black;
}

.hf-chip {
  --hf-contrast: contrast-color(var(--chip-bg));
}

@container style(--hf-contrast: white) {
  .hf-chip { color: #fafafc; }        /* softer than pure white */
}
@container style(--hf-contrast: black) {
  .hf-chip { color: var(--hf-ink); }  /* softer than pure black */
}
#+END_SRC

*** 8.2.5 Elevation via =light-dark()= Transparency

The reference system permits exactly one shadow. In dark mode a drop shadow is
invisible; a subtle inset ring reads better. Both live in one declaration by
making the unused half transparent.

#+BEGIN_SRC css
.hf-card {
  box-shadow:
    /* light-mode drop */
    light-dark(rgba(0,0,0,0.06), transparent) 0 1px 3px,
    /* dark-mode inset ring, tinted from the card's own background */
    light-dark(transparent, rgb(from var(--hf-tile-1) r g b / 0.6)) 0 0 0 1px inset;
}
#+END_SRC

** 8.3 Typography

*** 8.3.1 Family

#+BEGIN_SRC css
:root {
  --hf-font-display: system-ui, -apple-system, BlinkMacSystemFont,
                     "Inter", "Segoe UI", sans-serif;
  --hf-font-text:    system-ui, -apple-system, BlinkMacSystemFont,
                     "Inter", "Segoe UI", sans-serif;
  --hf-font-mono:    ui-monospace, "SF Mono", "JetBrains Mono", monospace;
}
#+END_SRC

On Apple platforms this resolves to the real system display face. Elsewhere,
Inter is the closest open substitute; per the reference spec, tighten tracking
by =-0.01em= at display sizes and reduce body leading by =0.03= to compensate
for Inter's taller x-height.

*** 8.3.2 Scale

| Token         | Size | Weight | Line height | Tracking  | Use                          |
|---------------+------+--------+-------------+-----------+------------------------------|
| =hero=        | 56px | 600    | 1.07        | -0.28px   | Landing hero only            |
| =display-lg=  | 40px | 600    | 1.10        | 0         | Dashboard KPI values         |
| =display-md=  | 34px | 600    | 1.47        | -0.374px  | Section heads                |
| =lead=        | 28px | 400    | 1.14        | 0.196px   | Table number on order card   |
| =lead-airy=   | 24px | 300    | 1.5         | 0         | Empty-state copy             |
| =tagline=     | 21px | 600    | 1.19        | 0.231px   | Column headers, sub-nav name |
| =body-strong= | 17px | 600    | 1.24        | -0.374px  | Item names, emphasis         |
| =body=        | 17px | 400    | 1.47        | -0.374px  | Default paragraph            |
| =dense-link=  | 17px | 400    | 2.41        | 0         | Sidebar nav stacks           |
| =caption=     | 14px | 400    | 1.43        | -0.224px  | Metadata, button labels      |
| =caption-str= | 14px | 600    | 1.29        | -0.224px  | Emphasised captions          |
| =fine-print=  | 12px | 400    | 1.0         | -0.12px   | Timestamps, legal            |
| =micro=       | 10px | 400    | 1.3         | -0.08px   | Micro legal only             |

*Rules carried from the reference spec, non-negotiable:*
- Body copy is *17px, not 16px*. The extra pixel sets the reading pace.
- The weight ladder is *300 / 400 / 600 / 700*. Weight 500 does not exist.
- Negative tracking applies at 17px and above only. Never at 12px or below.
- Sentence case everywhere. Never Title Case, never ALL CAPS.

*Operational-console adaptation:* the reference is a marketing site read at
arm's length in good light. A counter tablet is read at a glance in a hot
kitchen. Two departures:
1. Table numbers on order cards use =lead= (28px) — they must be legible from
   a metre away.
2. Elapsed-time values use =caption-str= with =font-variant-numeric:
   tabular-nums= so digits do not shift as seconds tick.

** 8.4 Layout

*** 8.4.1 Grid

| Context                | Max width | Columns                        |
|------------------------+-----------+--------------------------------|
| Counter order queue    | full      | 3 (auto-fit, min 320px)        |
| Waiter mobile          | full      | 1                              |
| Manager analytics      | 1440px    | 12 (auto-fit, min 280px cards) |
| Menu management        | 1200px    | 1 (table)                      |
| Marketing/landing      | full      | full-bleed tiles               |

Use =minmax(0, 1fr)= not =1fr= for grid columns. Default =min-width: auto=
lets long item names push a column past its container.

*** 8.4.2 Section Rhythm

Full-bleed regions alternate =--hf-canvas= and =--hf-canvas-alt=, with no
border and no gap. The colour change *is* the divider — this is the reference
system's core structural device and it is preserved exactly.

*** 8.4.3 Whitespace

Minimum 64px above a section headline, 48–64px below. The one deliberate
exception is the counter order queue, which is intentionally dense: staff need
maximum orders visible without scrolling. Density there is a functional
decision, not a style lapse.

** 8.5 Components

*** 8.5.1 Button — Primary

#+BEGIN_SRC css
.hf-btn-primary {
  background: var(--hf-accent);
  color: #ffffff;
  font: 400 17px/1 var(--hf-font-text);
  letter-spacing: -0.374px;
  padding: 11px 22px;
  border: none;
  border-radius: var(--hf-r-pill);
  min-height: 44px;
  cursor: pointer;
  transition: transform var(--hf-dur-instant) var(--hf-ease-out);
}
.hf-btn-primary:active { transform: scale(0.95); }
.hf-btn-primary:focus-visible {
  outline: 2px solid var(--hf-accent-focus);
  outline-offset: 2px;
}
@media (prefers-reduced-motion: reduce) {
  .hf-btn-primary { transition-duration: 1ms; }
  .hf-btn-primary:active { transform: scale(0.98); }
}
#+END_SRC

The full-pill radius *is* the action signal. Do not use it on non-actionable
elements.

*Reduced-motion note:* =prefers-reduced-motion= means reduced, not none. The
press feedback shrinks from 0.95 to 0.98 rather than disappearing — the user
still gets confirmation their tap registered, which is the entire point of the
affordance.

*** 8.5.2 Button — Secondary Ghost Pill

#+BEGIN_SRC css
.hf-btn-ghost {
  background: transparent;
  color: var(--hf-accent);
  border: 1px solid var(--hf-accent);
  border-radius: var(--hf-r-pill);
  padding: 11px 22px;
  min-height: 44px;
  font: 400 17px/1 var(--hf-font-text);
}
.hf-btn-ghost:active { transform: scale(0.95); }
#+END_SRC

*** 8.5.3 Button — Dark Utility

Nav-bar actions. Compact rect, not a pill — the radius grammar distinguishes
"utility" from "action".

#+BEGIN_SRC css
.hf-btn-utility {
  background: var(--hf-ink);
  color: #ffffff;
  font: 400 14px/1.29 var(--hf-font-text);
  letter-spacing: -0.224px;
  padding: 8px 15px;
  border-radius: var(--hf-r-sm);
  min-height: 44px;   /* visual height 30px, touch target 44px via padding */
}
#+END_SRC

*** 8.5.4 Availability Toggle — The Most-Used Control

#+BEGIN_SRC css
.hf-toggle {
  --track-w: 52px;
  --track-h: 32px;
  --thumb:   26px;

  position: relative;
  display: inline-flex;
  align-items: center;
  inline-size: var(--track-w);
  block-size: var(--track-h);
  border-radius: var(--hf-r-pill);
  background: light-dark(var(--hf-hairline), #48484a);
  transition: background var(--hf-dur-fast) var(--hf-ease-out);
  cursor: pointer;

  /* Touch target padding without changing visual size */
  padding: 6px;
  margin: -6px;
}

.hf-toggle:has(input:checked) { background: var(--hf-status-fresh); }

.hf-toggle input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
  margin: 0;
}

.hf-toggle__thumb {
  inline-size: var(--thumb);
  block-size: var(--thumb);
  border-radius: 50%;
  background: #ffffff;
  translate: 3px 0;
  box-shadow: 0 1px 3px rgba(0,0,0,0.18);
  transition: translate var(--hf-dur-base) var(--hf-ease-spring);
}

.hf-toggle:has(input:checked) .hf-toggle__thumb {
  translate: calc(var(--track-w) - var(--thumb) - 3px) 0;
}

.hf-toggle:active .hf-toggle__thumb { scale: 0.92; }

.hf-toggle:has(input:focus-visible) {
  outline: 2px solid var(--hf-accent-focus);
  outline-offset: 3px;
}

@media (prefers-reduced-motion: reduce) {
  .hf-toggle__thumb {
    transition: translate var(--hf-dur-instant) var(--hf-ease-out);
  }
}
#+END_SRC

*State is encoded twice* — colour *and* thumb position. Never colour alone.
The spring easing gives the thumb a physical settle that makes the control feel
mechanical rather than digital; this is the "little big thing" that separates
a UI that feels considered from one that feels generated.

*** 8.5.5 Order Card

#+BEGIN_SRC css
.hf-order-card {
  background: light-dark(var(--hf-canvas), var(--hf-tile-1));
  border: 0.5px solid light-dark(var(--hf-hairline), rgba(255,255,255,0.10));
  border-radius: var(--hf-r-lg);
  padding: var(--hf-sp-lg);
  display: grid;
  gap: var(--hf-sp-sm);

  /* Urgency accent — single-sided border, so radius is 0 on that edge */
  border-inline-start: 3px solid var(--urgency, var(--hf-hairline));
  border-start-start-radius: 0;
  border-end-start-radius: 0;
}

.hf-order-card[data-urgency="fresh"]  { --urgency: var(--hf-status-fresh);  }
.hf-order-card[data-urgency="aging"]  { --urgency: var(--hf-status-aging);  }
.hf-order-card[data-urgency="urgent"] { --urgency: var(--hf-status-urgent); }

.hf-order-card__table {
  font: 400 28px/1.14 var(--hf-font-display);
  letter-spacing: 0.196px;
}

.hf-order-card__elapsed {
  font: 600 14px/1.29 var(--hf-font-text);
  letter-spacing: -0.224px;
  font-variant-numeric: tabular-nums;   /* digits don't jitter */
  color: var(--urgency);
}
#+END_SRC

Urgency is *always* paired with the literal elapsed time. Colour is the
secondary cue, never the only one.

*** 8.5.6 Metric Card

#+BEGIN_SRC css
.hf-metric {
  background: light-dark(var(--hf-canvas-alt), var(--hf-tile-2));
  border: none;
  border-radius: var(--hf-r-lg);
  padding: var(--hf-sp-lg);
  display: grid;
  gap: var(--hf-sp-xs);
}
.hf-metric__label {
  font: 400 14px/1.43 var(--hf-font-text);
  letter-spacing: -0.224px;
  color: light-dark(var(--hf-ink-48), var(--hf-ink-muted-on-dark));
}
.hf-metric__value {
  font: 600 40px/1.10 var(--hf-font-display);
  font-variant-numeric: tabular-nums;
}
#+END_SRC

** 8.6 Motion & Interaction

*** 8.6.1 Principles

1. *Every interaction gets feedback.* A tap that produces no visible response
   reads as broken, and the user taps again — creating duplicate orders.
2. *Animate from the source.* A panel opening from a button should originate at
   that button, not fade in from nowhere.
3. *Approximate physics.* CSS has no native spring, but =linear()= easing
   approximates one closely enough to feel right.
4. *Motion directs attention.* Movement is the strongest attention cue
   available. Spend it on things that matter.
5. *Reduced motion means reduced, not zero.* Preserve the feedback signal,
   shorten the duration.

*** 8.6.2 Press Feedback (Universal)

#+BEGIN_SRC css
.hf-pressable {
  transition: scale var(--hf-dur-instant) var(--hf-ease-out);
  touch-action: manipulation;   /* removes 300ms tap delay */
}
.hf-pressable:active { scale: 0.96; }

@media (prefers-reduced-motion: reduce) {
  .hf-pressable:active { scale: 0.99; }
}
#+END_SRC

Never scale below 0.95 — beyond that it reads as a glitch rather than a press.

*** 8.6.3 Staggered Entry with =sibling-index()=

When the order queue loads, cards entering all at once is visually flat.
Staggering them guides the eye through the list in reading order.

#+BEGIN_SRC css
@media (prefers-reduced-motion: no-preference) {
  .hf-order-card {
    animation: hf-rise var(--hf-dur-base) var(--hf-ease-out) backwards;
    animation-delay: calc(sibling-index() * 40ms);
  }
}

@keyframes hf-rise {
  from { opacity: 0; translate: 0 12px; }
  to   { opacity: 1; translate: 0 0; }
}
#+END_SRC

Cap the practical stagger: 40ms × 12 cards = 480ms, which is at the edge of
acceptable. For longer lists, clamp the delay.

*** 8.6.4 Scroll-State Queries — Auto-Hiding Header

The counter dashboard header eats vertical space that could show another order.
Hide it on scroll down, restore on scroll up. Progressive enhancement: in
non-supporting browsers the header simply stays put, which is the current
behaviour and perfectly usable.

#+BEGIN_SRC css
html { container-type: scroll-state; }

@container scroll-state(scrolled: top) {
  .hf-app-header { translate: 0 0; }
}

@container not scroll-state(scrolled: none) {
  .hf-app-header {
    position: sticky;
    inset-block-start: 0;
    transition: translate var(--hf-dur-base) var(--hf-ease-out);
  }
}

@container scroll-state(scrolled: bottom) {
  .hf-app-header { translate: 0 -100%; }
}
#+END_SRC

The double-negative =not scroll-state(scrolled: none)= reads as "a scroll has
happened" — that is the idiom for switching from static to sticky only after
the user has begun scrolling.

*** 8.6.5 Scroll-Driven Reveal for Analytics

Manager dashboard charts are below the fold. Revealing them as they enter the
viewport is free with scroll-driven animation.

#+BEGIN_SRC css
@media (prefers-reduced-motion: no-preference) {
  @supports (animation-timeline: view()) {
    .hf-chart-panel {
      animation: hf-rise linear both;
      animation-timeline: view();
      animation-range: entry 0% entry 45%;
    }
  }
}
#+END_SRC

*** 8.6.6 View Transitions for Order Status

When an order moves between queue columns, a cross-fade loses the connection.
A morph preserves it — the eye tracks the card and understands that *this
specific order* changed state.

#+BEGIN_SRC css
@view-transition { navigation: auto; }

.hf-order-card { view-transition-name: var(--vt-name); }
/* set inline in JSX: style={{ "--vt-name": `order-${order._id}` }} */

::view-transition-old(*),
::view-transition-new(*) {
  animation-duration: var(--hf-dur-base);
  animation-timing-function: var(--hf-ease-out);
}
#+END_SRC

#+BEGIN_SRC typescript
// Scoped view transition — does not block the rest of the page
function moveOrder(el: HTMLElement, mutate: () => void) {
  if (!("startViewTransition" in el)) { mutate(); return; }
  // @ts-expect-error — scoped VT is newer than the lib DOM types
  el.startViewTransition(mutate);
}
#+END_SRC

Scoped view transitions matter here specifically: the counter dashboard has a
live subscription pushing updates constantly. A document-scoped transition
would freeze the whole page every time any order changed.

*** 8.6.7 Directional Feedback on Counters

The "orders today" counter should roll *up* when incrementing and *down* when
decrementing. A directionless cross-fade throws away information the user
could have got for free.

#+BEGIN_SRC css
:root { --hf-count-dir: 1; }

::view-transition-old(order-count) {
  animation: hf-slide-out var(--hf-dur-fast) var(--hf-ease-out) both;
}
::view-transition-new(order-count) {
  animation: hf-slide-in var(--hf-dur-fast) var(--hf-ease-out) both;
}

@keyframes hf-slide-out {
  to { opacity: 0; translate: 0 calc(var(--hf-count-dir) * -100%); }
}
@keyframes hf-slide-in {
  from { opacity: 0; translate: 0 calc(var(--hf-count-dir) * 100%); }
}
#+END_SRC

Set =--hf-count-dir= to =1= or =-1= in JS before triggering the transition.

*** 8.6.8 Motion Blur Substitute

There is no motion blur on the web. A brief =filter: blur()= during the middle
of a transition approximates the sense of travel.

#+BEGIN_SRC css
@keyframes hf-swoop {
  0%   { translate: 0 16px; filter: blur(4px); opacity: 0; }
  60%  { filter: blur(1px); }
  100% { translate: 0 0;    filter: blur(0);   opacity: 1; }
}
#+END_SRC

Use sparingly — blur is expensive to composite. Reserve it for single-element
entrances, never for list items.

** 8.7 Popovers, Anchors, and Interest

*** 8.7.1 Item Detail Popover

The native popover API supplies light-dismiss, Escape binding, focus
management, and top-layer stacking with no JavaScript.

#+BEGIN_SRC html
<button popovertarget="item-detail-42" class="hf-pressable">Pilau</button>

<div id="item-detail-42" popover="auto" class="hf-popover">
  <!-- item detail -->
</div>
#+END_SRC

#+BEGIN_SRC css
.hf-popover {
  background: light-dark(var(--hf-canvas), var(--hf-tile-2));
  border: 0.5px solid light-dark(var(--hf-hairline), rgba(255,255,255,0.12));
  border-radius: var(--hf-r-lg);
  padding: var(--hf-sp-lg);
  inline-size: min(360px, calc(100vw - 32px));

  position-anchor: --hf-invoker;
  position-area: block-end span-inline-end;
  position-try-fallbacks: flip-block, flip-inline;
  margin: var(--hf-sp-xs);
}

.hf-popover:popover-open {
  animation: hf-rise var(--hf-dur-fast) var(--hf-ease-out);
}
#+END_SRC

*** 8.7.2 Interest Invokers — Hover Preview

Waiters hovering a table cell should see recent order history without clicking.
Interest invokers give hover *and* keyboard-focus *and* long-press semantics
with correct accessibility, which is otherwise weeks of work to get right.

#+BEGIN_SRC html
<button interestfor="table-7-history" class="hf-table-cell">Table 7</button>
<div id="table-7-history" popover="hint" class="hf-popover hf-popover--hint">
  <!-- last 3 orders -->
</div>
#+END_SRC

=popover="hint"= is important: a hint popover does not dismiss other open
popovers. A tooltip appearing should not close the panel the user was reading.

*UX tuning* — the 0.5s user-agent delay is right for the *first* item in a
group but wrong for subsequent ones. Once the user is already exploring a
toolbar, delay feels like lag:

#+BEGIN_SRC css
.hf-table-grid:has(:is(*):interest-source) .hf-table-cell {
  interest-delay-start: 0s;
}
#+END_SRC

*** 8.7.3 Dynamic Re-anchoring

A single follower element that tracks whichever cell has interest, rather than
one indicator per cell.

#+BEGIN_SRC css
.hf-table-cell:hover,
.hf-table-cell:focus-visible { anchor-name: --hf-hovered; }

.hf-follower {
  position: absolute;
  position-anchor: --hf-hovered;
  position-area: block-start;
  transition: translate var(--hf-dur-base) var(--hf-ease-spring);
}
#+END_SRC

** 8.8 Form Factor Adaptation

*** 8.8.1 Device Matrix

| Role    | Device            | Viewport | Posture              |
|---------+-------------------+----------+----------------------|
| Counter | Tablet, landscape | 1024px+  | Fixed, two hands     |
| Waiter  | Phone, portrait   | 375–430px| Moving, one hand     |
| Manager | Laptop            | 1280px+  | Seated, mouse        |
| Owner   | Phone             | 375px+   | Anywhere, glancing   |

*** 8.8.2 Swipe-to-Dismiss Without JavaScript

Waiters expect to swipe panels away. A scroller with snap points gives this for
free — no gesture library, no touch-event handling.

#+BEGIN_SRC css
.hf-sheet-scroller {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 100%;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scroll-snap-type: x mandatory;
  scroll-behavior: smooth;
  scrollbar-width: none;
}
.hf-sheet-scroller::-webkit-scrollbar { display: none; }

.hf-sheet-scroller > * { scroll-snap-align: start; }

/* First cell is empty dead space — swiping right into it dismisses */
.hf-sheet-dismiss-zone { pointer-events: none; }
#+END_SRC

On mount, scroll to the content cell. Swiping back into the dead zone reads as
a dismiss gesture.

*** 8.8.3 Touch Targets

Minimum 44×44px, no exceptions on waiter and counter surfaces. Where visual
design calls for something smaller, expand the hit area with padding and pull
it back with negative margin — the visual stays small, the target does not.

*** 8.8.4 Container Queries Over Media Queries

Order cards appear in three different layouts. They should respond to their
container, not the viewport.

#+BEGIN_SRC css
.hf-order-queue { container-type: inline-size; container-name: queue; }

@container queue (inline-size < 420px) {
  .hf-order-card { grid-template-columns: 1fr; }
  .hf-order-card__actions { flex-direction: column; }
}
#+END_SRC

** 8.9 Accessibility Requirements

- Every interactive element reachable and operable by keyboard.
- Focus visible at all times: 2px =--hf-accent-focus= outline, 2px offset.
- Status never encoded by colour alone (see §8.5.4, §8.5.5).
- Live regions (=aria-live="polite"=) on the order queue so screen-reader users
  hear new orders arrive.
- =prefers-reduced-motion= respected everywhere, reducing rather than removing.
- Minimum contrast 4.5:1 for body text, 3:1 for large text and UI components.
- Toggle switches expose =role="switch"= and =aria-checked=.
- Form errors associated via =aria-describedby=, announced on change.

** 8.10 Design Do's and Don'ts

*** Do
- Use one accent colour for every interactive element.
- Set headlines with negative tracking at display sizes.
- Run body copy at 17px.
- Alternate surface tones for section rhythm; let colour change be the divider.
- Reserve the pill radius for genuinely actionable elements.
- Give every press a scale feedback.
- Pair every colour-encoded status with a text or shape cue.
- Use container queries for component-level responsiveness.
- Treat modern CSS features as progressive enhancements with graceful bases.

*** Don't
- Don't introduce a second brand accent. Status colours are functional, not brand.
- Don't add shadows to cards or buttons — the single shadow is for elevation of
  objects, not UI hierarchy.
- Don't use gradients as decoration.
- Don't use font-weight 500 — the ladder is 300/400/600/700.
- Don't round full-bleed sections.
- Don't tighten body line-height below 1.47.
- Don't put rounded corners on single-sided borders.
- Don't rely on hover for any essential information — waiters are on touch.
- Don't animate more than two properties at once on list items.

--------------------------------------------------------------------------------

* 9. Repository, Tooling, Runtime

** 9.1 Package Manager: The Recommendation

*Use pnpm.*

*** 9.1.1 The Comparison

| Criterion                        | npm      | pnpm         | bun          |
|----------------------------------+----------+--------------+--------------|
| Cold install (this repo, approx) | ~55 s    | ~18 s        | ~7 s         |
| Warm install                     | ~20 s    | ~4 s         | ~2 s         |
| Disk usage, 3 workspaces         | ~1.1 GB  | ~380 MB      | ~1.0 GB      |
| Workspace protocol support       | partial  | *excellent*  | good         |
| Strict dependency isolation      | no       | *yes*        | no           |
| Wrangler compatibility           | yes      | *yes*        | *known issues* |
| Convex CLI compatibility         | yes      | *yes*        | mostly       |
| Next.js 15 support               | yes      | *yes*        | mostly       |
| Vercel native support            | yes      | *yes*        | yes          |
| Ecosystem maturity               | highest  | high         | improving    |

*** 9.1.2 Why pnpm Wins Here

*Symlinked node_modules with strict isolation.* pnpm's default layout means a
package can only import what it explicitly declares. In a monorepo where
=apps/api= must run on Workers (no Node built-ins), this catches an accidental
=import fs from "node:fs"= at install time in development rather than at deploy
time in production. That property alone justifies the choice.

*Content-addressable store.* Three workspaces sharing React, TypeScript, and
Zod store one physical copy. On a laptop doing an hours-long sprint with
repeated installs, this is the difference between waiting and working.

*=workspace:*= protocol.* =@heavenly/types= resolves to the local package with
zero configuration, and =pnpm publish= rewrites it to a real version if the
package ever ships. npm workspaces handle this less cleanly; bun's
implementation is newer.

*** 9.1.3 Why Not Bun

Bun is genuinely faster and it is tempting for a speed-run. It is not the right
call for this specific project:

1. *Wrangler + Bun has known friction.* Cloudflare's toolchain assumes Node
   semantics in places. Debugging a Wrangler-Bun interaction mid-sprint is
   exactly the kind of unbudgeted time sink that kills an hours-long MVP.
2. *Convex CLI is Node-first.* It works under Bun in most cases; "most cases"
   is not a property you want on the critical path.
3. *The install-time saving is ~15 seconds.* You will install perhaps eight
   times. Two minutes saved, against a real risk of losing an hour to a
   toolchain bug.

*Where bun IS the right call:* use =bunx= for one-off script execution and
=bun= as the test runner if you want fast tests. Use it as a tool, not as the
package manager of record.

*** 9.1.4 Why Not npm

npm works. It is slower and its workspace protocol support is weaker, and it
does not give the strict-isolation safety property that catches Workers
incompatibilities early. There is no reason to choose it over pnpm here.

*** 9.1.5 Setup

#+BEGIN_SRC bash
corepack enable
corepack prepare pnpm@latest --activate
pnpm --version   # expect 9.x or 10.x
#+END_SRC

** 9.2 Monorepo vs Polyrepo: The Recommendation

*Monorepo.*

The decisive argument is the shared type package. The order state machine, the
menu item shape, and the API response contracts must be identical in the
Next.js app, the Hono worker, and the Convex functions. In a monorepo that is
one file. In a polyrepo it is a published package with a version bump on every
change, or — realistically, under time pressure — two copies that silently
diverge.

Secondary arguments:
- Atomic commits. "Add cancel reason" touches schema, API, and UI in one commit.
- Single repo to showcase, which matters for a build-in-public workflow.
- Independent deploys are preserved: Vercel watches =apps/web=, Wrangler
  deploys =apps/api=. Monorepo does not mean monolith.

** 9.3 Repository Layout

#+BEGIN_SRC text
heavenly-foods/
├── apps/
│   ├── web/                          # Next.js 15 — Vercel
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   │   ├── login/page.tsx
│   │   │   │   └── layout.tsx
│   │   │   ├── (counter)/
│   │   │   │   ├── orders/page.tsx        # F-CTR-001/002
│   │   │   │   ├── new-order/page.tsx     # F-CTR-003
│   │   │   │   ├── stock/page.tsx         # F-CTR-004
│   │   │   │   └── layout.tsx
│   │   │   ├── (waiter)/
│   │   │   │   ├── tables/page.tsx        # F-WTR-001
│   │   │   │   ├── my-stats/page.tsx      # F-WTR-004
│   │   │   │   └── layout.tsx
│   │   │   ├── (manager)/
│   │   │   │   ├── dashboard/page.tsx     # F-MGR-001/004/005
│   │   │   │   ├── menu/page.tsx          # F-INV-001, F-MGR-008
│   │   │   │   ├── menu/import/page.tsx   # F-INV-002/005/006/007
│   │   │   │   ├── staff/page.tsx         # F-MGR-011
│   │   │   │   ├── tables/page.tsx        # F-MGR-012
│   │   │   │   ├── qr-codes/page.tsx      # F-WA-004
│   │   │   │   └── layout.tsx
│   │   │   ├── layout.tsx
│   │   │   └── globals.css                # design tokens
│   │   ├── components/
│   │   │   ├── ui/                        # design system primitives
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Toggle.tsx
│   │   │   │   ├── Card.tsx
│   │   │   │   ├── MetricCard.tsx
│   │   │   │   └── Popover.tsx
│   │   │   ├── orders/
│   │   │   │   ├── OrderCard.tsx
│   │   │   │   ├── OrderQueue.tsx
│   │   │   │   └── OrderActions.tsx
│   │   │   ├── menu/
│   │   │   │   ├── MenuTable.tsx
│   │   │   │   ├── AvailabilityToggle.tsx
│   │   │   │   └── ImportWizard.tsx
│   │   │   └── analytics/
│   │   │       ├── PatternChart.tsx
│   │   │       ├── TablePerformance.tsx
│   │   │       └── ItemRatings.tsx
│   │   ├── lib/
│   │   │   ├── convex.ts
│   │   │   ├── auth.ts
│   │   │   └── format.ts
│   │   ├── middleware.ts                  # role-based route guard
│   │   ├── next.config.ts
│   │   └── package.json
│   │
│   └── api/                          # Hono — Cloudflare Workers
│       ├── src/
│       │   ├── index.ts                   # app composition
│       │   ├── routes/
│       │   │   ├── webhook.ts             # F-WA-*
│       │   │   ├── menu.ts
│       │   │   ├── orders.ts
│       │   │   └── analytics.ts
│       │   ├── conversation/
│       │   │   ├── machine.ts             # state machine
│       │   │   ├── handlers/
│       │   │   │   ├── awaitingTable.ts
│       │   │   │   ├── awaitingName.ts
│       │   │   │   ├── browsing.ts
│       │   │   │   ├── cartReview.ts
│       │   │   │   ├── confirming.ts
│       │   │   │   └── feedback.ts
│       │   │   ├── globalCommands.ts
│       │   │   ├── templates.ts
│       │   │   └── recommend.ts
│       │   ├── whatsapp/
│       │   │   ├── client.ts              # WA Cloud API send
│       │   │   ├── verify.ts              # HMAC signature
│       │   │   └── parse.ts               # webhook payload → domain
│       │   ├── ai/
│       │   │   ├── provider.ts            # abstraction
│       │   │   ├── nvidia.ts
│       │   │   ├── groq.ts
│       │   │   ├── ollama.ts
│       │   │   └── prompts.ts
│       │   └── middleware/
│       │       ├── auth.ts
│       │       ├── rateLimit.ts
│       │       └── requestId.ts
│       ├── wrangler.toml
│       └── package.json
│
├── packages/
│   ├── types/                        # shared contracts — the reason for the monorepo
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── order.ts
│   │   │   ├── menu.ts
│   │   │   ├── staff.ts
│   │   │   ├── session.ts
│   │   │   ├── feedback.ts
│   │   │   └── api.ts
│   │   └── package.json
│   │
│   ├── convex/                       # Convex functions + schema
│   │   ├── schema.ts
│   │   ├── menu.ts
│   │   ├── orders.ts
│   │   ├── sessions.ts
│   │   ├── staff.ts
│   │   ├── feedback.ts
│   │   ├── analytics.ts
│   │   ├── crons.ts
│   │   └── package.json
│   │
│   └── ui/                           # optional: extracted design system
│       ├── src/
│       │   ├── tokens.css
│       │   └── primitives/
│       └── package.json
│
├── infra/
│   ├── cockroach/
│   │   └── migrations/
│   │       ├── 001_init.sql
│   │       └── 002_indexes.sql
│   └── scripts/
│       ├── seed-demo.ts
│       └── generate-qr.ts
│
├── docs/
│   ├── HEAVENLY_FOODS_SPEC.md        # this file
│   └── heavenly-foods.lisp           # machine-readable spec
│
├── pnpm-workspace.yaml
├── turbo.json
├── package.json
├── tsconfig.base.json
├── .env.example
└── README.md
#+END_SRC

** 9.4 Workspace Configuration

#+BEGIN_SRC yaml
# pnpm-workspace.yaml
packages:
  - "apps/*"
  - "packages/*"
#+END_SRC

#+BEGIN_SRC json
{
  "name": "heavenly-foods",
  "private": true,
  "packageManager": "pnpm@10.0.0",
  "engines": { "node": ">=20.0.0" },
  "scripts": {
    "dev": "turbo run dev --parallel",
    "build": "turbo run build",
    "typecheck": "turbo run typecheck",
    "lint": "turbo run lint",
    "convex:dev": "pnpm --filter @heavenly/convex exec convex dev",
    "api:dev": "pnpm --filter @heavenly/api exec wrangler dev",
    "api:deploy": "pnpm --filter @heavenly/api exec wrangler deploy",
    "web:dev": "pnpm --filter @heavenly/web dev",
    "seed": "pnpm --filter @heavenly/convex exec tsx ../../infra/scripts/seed-demo.ts",
    "qr": "tsx infra/scripts/generate-qr.ts"
  },
  "devDependencies": {
    "turbo": "^2.3.0",
    "typescript": "^5.7.0",
    "@types/node": "^22.10.0"
  }
}
#+END_SRC

#+BEGIN_SRC json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": { "cache": false, "persistent": true },
    "typecheck": { "dependsOn": ["^build"] },
    "lint": {}
  }
}
#+END_SRC

** 9.5 Environment Variables

#+BEGIN_SRC bash
# ── WhatsApp Cloud API ────────────────────────────────────────────
WA_PHONE_NUMBER_ID=            # Meta > WhatsApp > API Setup
WA_ACCESS_TOKEN=               # permanent system-user token
WA_VERIFY_TOKEN=               # any random string; must match webhook config
WA_APP_SECRET=                 # Meta app secret, for HMAC verification
WA_DISPLAY_NUMBER=             # E.164, for wa.me links

# ── Convex ────────────────────────────────────────────────────────
CONVEX_DEPLOYMENT=
NEXT_PUBLIC_CONVEX_URL=
CONVEX_DEPLOY_KEY=             # for the Worker to call Convex HTTP actions

# ── LLM Provider ──────────────────────────────────────────────────
AI_PROVIDER=nvidia             # nvidia | groq | ollama
NVIDIA_API_KEY=
NVIDIA_MODEL=meta/llama-3.1-70b-instruct
GROQ_API_KEY=
GROQ_MODEL=llama-3.3-70b-versatile
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b

# ── CockroachDB (provisioned in MVP, read path in P2) ─────────────
COCKROACH_DATABASE_URL=

# ── App ───────────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=
AUTH_SECRET=
DEFAULT_RESTAURANT_ID=
#+END_SRC

** 9.6 Wrangler Configuration

#+BEGIN_SRC toml
name = "heavenly-foods-api"
main = "src/index.ts"
compatibility_date = "2026-07-01"
compatibility_flags = ["nodejs_compat"]

[observability]
enabled = true

[vars]
AI_PROVIDER = "nvidia"

# Secrets set via: wrangler secret put <NAME>
#   WA_ACCESS_TOKEN, WA_APP_SECRET, WA_VERIFY_TOKEN,
#   NVIDIA_API_KEY, CONVEX_DEPLOY_KEY

[[kv_namespaces]]
binding = "RATE_LIMIT"
id = "<created via wrangler kv namespace create>"

# P2: R2 for OCR image storage
# [[r2_buckets]]
# binding = "OCR_UPLOADS"
# bucket_name = "heavenly-foods-ocr"
#+END_SRC

** 9.7 Dependency Manifest

*** apps/web
#+BEGIN_SRC text
next@^15.1.0
react@^19.0.0
react-dom@^19.0.0
convex@^1.17.0
zod@^3.24.0
papaparse@^5.4.1          # CSV parsing (MVP)
qrcode@^1.5.4             # table QR generation
recharts@^2.15.0          # analytics charts
date-fns@^4.1.0
@heavenly/types@workspace:*
@heavenly/convex@workspace:*

# P2
# xlsx@^0.18.5            # Excel parsing
#+END_SRC

*** apps/api
#+BEGIN_SRC text
hono@^4.6.0
@hono/zod-validator@^0.4.1
zod@^3.24.0
convex@^1.17.0
@heavenly/types@workspace:*

# dev
wrangler@^3.99.0
@cloudflare/workers-types@^4.20250101.0
#+END_SRC

*** packages/convex
#+BEGIN_SRC text
convex@^1.17.0
@heavenly/types@workspace:*
#+END_SRC

--------------------------------------------------------------------------------

* 10. MVP Build Plan — Hour By Hour

Total: *8 focused hours* to a demoable system. Assumes the WABA is already
provisioned (that is a Meta-side dependency measured in days, not hours, and
it must be started before hour 0).

** Hour 0 — Prerequisites (do this the day before)

- [ ] Meta Business account created and verified
- [ ] WhatsApp Business App created in Meta dev console
- [ ] Test phone number provisioned, permanent access token generated
- [ ] Convex account, project created
- [ ] Cloudflare account, Workers enabled
- [ ] Vercel account linked to GitHub
- [ ] NVIDIA NIM or Groq API key obtained

** Hour 1 — Scaffold and Types

#+BEGIN_SRC bash
mkdir heavenly-foods && cd heavenly-foods
corepack enable && corepack prepare pnpm@latest --activate
pnpm init

mkdir -p apps/{web,api} packages/{types,convex} infra/{cockroach/migrations,scripts} docs
printf 'packages:\n  - "apps/*"\n  - "packages/*"\n' > pnpm-workspace.yaml

cd apps/web && pnpm create next-app@latest . --typescript --app --no-tailwind --eslint
cd ../api && pnpm create hono@latest . --template cloudflare-workers
cd ../../packages/types && pnpm init
cd ../convex && pnpm init && pnpm add convex && pnpm exec convex dev --once
cd ../.. && pnpm install
#+END_SRC

*Deliverable:* =pnpm typecheck= passes across all workspaces.

** Hour 2 — Convex Schema and Seed

- [ ] Write =packages/convex/schema.ts= (full schema from §5.2)
- [ ] =convex dev= to push schema
- [ ] Write =infra/scripts/seed-demo.ts= — one restaurant, 8 tables, 4 staff,
      ~25 menu items across 5 categories
- [ ] Run seed, verify in Convex dashboard

*Deliverable:* real data queryable in the Convex dashboard.

** Hour 3 — Design Tokens and Primitives

- [ ] =apps/web/app/globals.css= — all tokens from §8.2
- [ ] =Button.tsx=, =Toggle.tsx=, =Card.tsx=, =MetricCard.tsx=
- [ ] Verify: keyboard focus visible, 44px targets, reduced-motion respected
- [ ] Dark mode check in DevTools

*Deliverable:* a primitives page rendering every component in both schemes.

** Hour 4 — Menu Management

- [ ] Menu table with live Convex query
- [ ] Availability toggle wired to mutation (F-STK-002)
- [ ] Add/edit item form (F-INV-001)
- [ ] CSV import wizard: upload → map → preview → commit (F-INV-002/005/006/007)

*Deliverable:* menu is fully manageable; toggling availability is instant.

** Hour 5 — WhatsApp Webhook and State Machine

- [ ] =GET /webhook/whatsapp= verification handshake
- [ ] =POST= handler with HMAC verification and immediate 200
- [ ] Idempotency via =processedMessages=
- [ ] Session create/load by phone
- [ ] Handlers: AWAITING_TABLE, AWAITING_NAME, BROWSING
- [ ] WA send client
- [ ] =wrangler dev --remote= + ngrok or Cloudflare tunnel for Meta callback

*Deliverable:* messaging the test number gets a table prompt and a menu.

** Hour 6 — Ordering Flow and LLM

- [ ] AI provider abstraction + NVIDIA/Groq implementation
- [ ] Intent classification with Zod-validated parsing
- [ ] Recommendation filter (F-WA-002)
- [ ] Cart handlers: CART_REVIEW, CONFIRMING
- [ ] Order creation mutation, order number sequence
- [ ] =serviceEvents= write on every transition

*Deliverable:* a full order placed end-to-end over WhatsApp, visible in Convex.

** Hour 7 — Counter and Waiter Dashboards

- [ ] Counter three-column queue with live subscription (F-CTR-001)
- [ ] Order actions: confirm / ready / serve / cancel (F-CTR-002)
- [ ] Confirmation callback message to diner (F-WA-003)
- [ ] Urgency accent driven by elapsed time
- [ ] Waiter mobile view, scoped to assigned tables (F-WTR-001)
- [ ] Manual order creation (F-CTR-003)

*Deliverable:* an order placed on WhatsApp appears on the counter screen
within a second, and confirming it messages the diner back.

** Hour 8 — Manager Dashboard, Feedback, QR, Deploy

- [ ] Manager KPI tiles + item ratings + table performance + hourly pattern
- [ ] Staff management (F-MGR-011), table allocation (F-MGR-012)
- [ ] QR code generator page (F-WA-004)
- [ ] Feedback scheduled function + feedback conversation handlers (F-WA-009)
- [ ] Marketing consent prompt (F-WA-010)
- [ ] =wrangler deploy=, Vercel deploy, point Meta webhook at production
- [ ] Smoke test: scan a printed QR, order, confirm, serve, feedback

*Deliverable:* live demo URL and a working WhatsApp number.

** Post-MVP Ordering (P2, in priority order)

1. OCR ingestion (F-INV-003) — highest onboarding leverage
2. XLSX parsing (F-INV-002 completion)
3. Roster and shift management (F-WTR-002, F-MGR-013)
4. CockroachDB rollup job and analytics read path
5. Waiter ranking with calibrated weights (F-WTR-004, F-MGR-006)
6. Offers and broadcast, pending Meta template approval (F-MGR-009/010)
7. Daily/weekly report generation and delivery (F-MGR-007)
8. LLM feedback clustering (F-MGR-003)

--------------------------------------------------------------------------------

* 11. Cost Model

** 11.1 Demo Phase — One Restaurant

| Service                | Tier            | Usage at 1 restaurant | Monthly |
|------------------------+-----------------+-----------------------+---------|
| Vercel Hobby           | Free            | <1 GB bandwidth       | $0      |
| Cloudflare Workers     | Free            | ~3k req/day           | $0      |
| Convex                 | Free            | ~40k reads/mo         | $0      |
| CockroachDB Serverless | Free            | provisioned, idle     | $0      |
| NVIDIA NIM / Groq      | Free            | ~1.5k calls/mo        | $0      |
| *Infrastructure total* |                 |                       | *$0*    |

*WhatsApp messaging is separate and is not hosting.* Meta's pricing changed to
per-message on 1 July 2025. Service (utility) messages sent within the
customer-service window are free. Business-initiated marketing and utility
templates are charged per message and rates vary by country and category. For a
single demo restaurant this is in the order of a few hundred KES per month, and
should be verified against Meta's current Kenya rate card before quoting.

** 11.2 Free Tier Headroom

| Service            | Free limit             | 1 restaurant | Capacity   |
|--------------------+------------------------+--------------+------------|
| Cloudflare Workers | 100k req/day           | ~3k/day      | ~33 rest.  |
| Convex             | ~1M function calls/mo  | ~40k/mo      | ~25 rest.  |
| Vercel             | 100 GB bandwidth/mo    | <1 GB        | ~100 rest. |
| CockroachDB        | 10 GiB, 50M RU/mo      | negligible   | ~200 rest. |

*The binding constraint is Convex, at roughly 25 restaurants.* At that point
Convex Professional is $25/month, which is trivial against 25 restaurants of
revenue.

** 11.3 Scale Projection

| Restaurants | Workers | Convex | Vercel | Cockroach | Infra total |
|-------------+---------+--------+--------+-----------+-------------|
| 1 (demo)    | $0      | $0     | $0     | $0        | *$0*        |
| 10          | $0      | $0     | $0     | $0        | *$0*        |
| 25          | $0      | $25    | $0     | $0        | *$25*       |
| 100         | $5      | $25    | $20    | $0        | *$50*       |
| 500         | $25     | $100   | $20    | $30       | *$175*      |

Infrastructure cost per restaurant at 500 tenants: *$0.35/month*. The business
model is not constrained by hosting.

** 11.4 P2 Incremental Costs

| Item                     | Unit cost      | At 100 onboardings | Note              |
|--------------------------+----------------+--------------------+-------------------|
| Vision OCR               | ~$0.03/page    | ~$15 one-time      | 5 pages/tenant    |
| R2 storage               | Free <10 GB    | $0                 | Images are small  |
| WA template messages     | Per Meta rates | Variable           | Verify rate card  |

** 11.5 Against the Client's Quote

The client PDF quotes KES 177,500 one-time plus KES 5,000/month maintenance
and hosting — KES 237,500 in year one.

At demo scale, actual infrastructure cost is *KES 0*. The KES 5,000/month is
therefore almost entirely margin for support, monitoring, and iteration, which
is a defensible position — but it should be understood internally that hosting
is not the cost driver. Support time is.

--------------------------------------------------------------------------------

* 12. Risks & Open Questions

** 12.1 Risks

| # | Risk                                    | Impact | Likelihood | Mitigation                                          |
|---+-----------------------------------------+--------+------------+-----------------------------------------------------|
| 1 | WABA approval delays                    | High   | Medium     | Start Meta verification days before build           |
| 2 | Meta template approval blocks broadcast | Medium | High       | Broadcast is P2; MVP uses in-window messages only   |
| 3 | LLM latency degrades chat UX            | Medium | Medium     | 3s timeout → deterministic menu fallback            |
| 4 | Staff resist digital workflow           | High   | Medium     | Toggle-first UI; nothing requires typing            |
| 5 | Poor connectivity in restaurant         | High   | Medium     | Convex offline queue; WA bot works on diner's data  |
| 6 | Diner sends photo/voice, not text       | Low    | High       | Detect non-text, reply asking for text              |
| 7 | Convex free tier exceeded               | Low    | Low        | Alert at 70%; $25 upgrade is trivial                |
| 8 | Prompt injection via message content    | Medium | Low        | LLM has no write access; all mutations deterministic |
| 9 | Duplicate orders from webhook retries   | High   | Medium     | =processedMessages= idempotency, unique index       |
| 10 | Price float drift                      | Medium | Low        | Integer cents throughout, never float               |

** 12.2 Open Questions for the Client

1. *WABA ownership.* Does Heavenly Foods own the Meta Business account, or does
   Biasharawatch host it on their behalf? This determines whether the
   architecture is single-tenant or shared-WABA multi-tenant, and it is easier
   to decide now than to migrate later.

2. *Payment.* The PDF does not mention payment collection. Is the system
   order-only with payment at the counter, or should M-Pesa STK push be in
   scope? This is a significant scope question.

3. *Kitchen display.* Counter staff are specified, but is there a separate
   kitchen screen, or does the counter relay orders verbally?

4. *Language default.* Should the bot open in English or Swahili, and should it
   detect and switch mid-conversation?

5. *Menu volatility.* How often does the menu change? Daily specials would
   justify a "today's menu" concept that the current schema does not model.

6. *Table count and layout.* How many tables, and are there zones (indoor,
   terrace) that affect waiter assignment?

7. *Existing inventory format.* For P2 OCR planning — are the ledgers ruled or
   unruled, English or Swahili, and roughly how many pages?

8. *Offline expectation.* If the restaurant's internet drops, should the
   counter dashboard continue working from cache, or is a hard failure
   acceptable?

** 12.3 Explicitly Out of Scope

Not in the client PDF, not built, listed here so they are not assumed:

- Payment processing (M-Pesa, card, cash reconciliation)
- Delivery or takeaway ordering
- Supplier or procurement management
- Recipe costing or ingredient-level inventory depletion
- Accounting or tax integration
- Multi-branch management
- Loyalty programmes
- Reservations and table booking

--------------------------------------------------------------------------------

* Appendix A — Acceptance Checklist

Print this. Tick it during the demo.

** Inventory
- [ ] Menu item can be created, edited, and soft-deleted
- [ ] CSV import maps Swahili headers without manual intervention
- [ ] Import preview blocks commit while error rows remain
- [ ] Original column names visible in item detail

** Stock
- [ ] Availability toggle updates WhatsApp menu within 2 seconds
- [ ] Bulk category toggle works
- [ ] Failed mutation reverts the switch with a toast

** WhatsApp
- [ ] QR scan opens WhatsApp with table prefilled
- [ ] Bot binds table without asking when prefill is present
- [ ] Bot asks for and stores customer name
- [ ] Budget query ("under 500 bob") returns correct filtered items
- [ ] Numbered selection ("2 and 5") adds correct items
- [ ] Cart summary shows correct total
- [ ] Confirmation creates an order visible on the counter screen
- [ ] Unavailable item is never offered
- [ ] =menu=, =help=, =cancel=, =waiter= work in every state
- [ ] Session expires after 30 minutes of inactivity

** Counter
- [ ] New order appears within 1 second of placement
- [ ] Confirm sends a callback message naming the staff member
- [ ] Cancel requires a reason
- [ ] Urgency accent changes at 5 and 10 minutes
- [ ] Manual order creation works

** Waiter
- [ ] Only assigned tables are visible
- [ ] Serve action writes a =serviceEvents= row
- [ ] Personal stats show today's orders and median service time
- [ ] Usable one-handed at 375px

** Manager
- [ ] KPI tiles show correct counts and revenue
- [ ] Top and bottom rated items render with counts
- [ ] Hourly pattern chart matches seeded data
- [ ] Table performance shows turn time and peak hour
- [ ] Staff can be added, role-assigned, and disabled
- [ ] QR sheet renders and prints correctly

** Feedback
- [ ] Prompt fires ~10 minutes after SERVED
- [ ] Rating updates item aggregates
- [ ] Free-text matches to items by fuzzy name
- [ ] Consent asked once, only after first order
- [ ] =STOP= revokes consent immediately

** Non-Functional
- [ ] Every interactive element keyboard-operable
- [ ] Focus ring visible on all controls
- [ ] Dark mode correct on every screen
- [ ] =prefers-reduced-motion= reduces rather than removes feedback
- [ ] No status conveyed by colour alone
- [ ] All touch targets ≥44×44px on waiter and counter surfaces
- [ ] Webhook responds in <200ms
- [ ] Duplicate webhook delivery does not create a duplicate order

--------------------------------------------------------------------------------

* Appendix B — Glossary of Feature IDs

| ID        | Feature                                  | Phase |
|-----------+------------------------------------------+-------|
| F-INV-001 | New restaurant onboarding                | MVP   |
| F-INV-002 | CSV / Excel upload                       | MVP   |
| F-INV-003 | Handwritten OCR ingestion                | P2    |
| F-INV-004 | Template mapping, EN/SW explanations     | P2    |
| F-INV-005 | Preview, edit, approve workflow          | MVP   |
| F-INV-006 | Retain original column names             | MVP   |
| F-INV-007 | Final preview and upload                 | MVP   |
| F-STK-001 | Real-time stock updates                  | MVP   |
| F-STK-002 | Availability toggle                      | MVP   |
| F-WA-001  | Natural conversation flow                | MVP   |
| F-WA-002  | Smart recommendations                    | MVP   |
| F-WA-003  | Order placement, queuing, callback       | MVP   |
| F-WA-004  | QR code table binding                    | MVP   |
| F-WA-005  | Anti-scam: waiter verification           | MVP   |
| F-WA-006  | Anti-scam: table number input            | MVP   |
| F-WA-007  | Anti-scam: customer details capture      | MVP   |
| F-WA-008  | Anti-scam: timestamp recording           | MVP   |
| F-WA-009  | Post-order feedback                      | MVP   |
| F-WA-010  | Marketing consent                        | MVP   |
| F-CTR-001 | Counter order queue view                 | MVP   |
| F-CTR-002 | Complete / cancel orders                 | MVP   |
| F-CTR-003 | Manual order creation                    | MVP   |
| F-CTR-004 | Stock availability from counter          | MVP   |
| F-CTR-005 | Contact customer                         | MVP   |
| F-WTR-001 | Assigned tables view                     | MVP   |
| F-WTR-002 | Roster integration                       | P2    |
| F-WTR-003 | Service timestamps                       | MVP   |
| F-WTR-004 | Waiter performance tracking              | MVP   |
| F-MGR-001 | Top-rated items                          | MVP   |
| F-MGR-002 | Low-rated items with reasons             | MVP   |
| F-MGR-003 | Categorized improvement summaries        | P2    |
| F-MGR-004 | Order patterns by day                    | MVP   |
| F-MGR-005 | Table performance                        | MVP   |
| F-MGR-006 | Waiter ranking                           | P2    |
| F-MGR-007 | Daily / weekly reports                   | P2    |
| F-MGR-008 | Add new dishes                           | MVP   |
| F-MGR-009 | Create offers                            | P2    |
| F-MGR-010 | Broadcast messaging                      | P2    |
| F-MGR-011 | User management                          | MVP   |
| F-MGR-012 | Table allocation                         | MVP   |
| F-MGR-013 | Roster management                        | P2    |

--------------------------------------------------------------------------------

/End of specification. Companion machine-readable spec:/ =heavenly-foods.lisp=