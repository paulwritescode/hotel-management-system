# Heavenly Foods — Restaurant Operations Platform

Live restaurant operations for a single-premises Kenyan restaurant, driven by WhatsApp ordering and a staff web console. Diners scan a per-table QR code to order over WhatsApp; staff run the floor from role-specific dashboards backed by a realtime Convex database.

---

## Table of contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Repository layout](#repository-layout)
- [Features](#features)
- [Staff roles and access model](#staff-roles-and-access-model)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Seeding data](#seeding-data)
- [Owner PIN recovery](#owner-pin-recovery)
- [Common scripts](#common-scripts)
- [Deployment](#deployment)
- [Known limitations](#known-limitations)

---

## Overview

Heavenly Foods has two runtime surfaces sharing one Convex backend:

1. **Staff web console** (`apps/web`) — a Next.js app where counter, waiter, manager, and owner staff sign in with a PIN and run live operations: the order queue, menu inventory, dining tables and QR codes, staff access, and analytics.
2. **WhatsApp ordering bot** (`apps/api`) — a Cloudflare Worker that receives WhatsApp webhooks and drives a conversational ordering flow: table binding, menu browsing, cart, checkout, and post-service feedback.

Convex is the single source of truth for restaurants, staff, menu items, tables, orders, WhatsApp sessions, and feedback. There is no separate SQL database.

The design language is a quiet, photography-first, Apple-inspired system: a single blue accent, alternating light/dark surfaces, tight display typography, and Lucide icons. Marketing surfaces use a large editorial scale; operational dashboards use a denser, calmer scale.

## Architecture

```
                 WhatsApp (Meta Cloud API)
                          │  webhook
                          ▼
   ┌──────────────────────────────────────┐
   │  apps/api  — Cloudflare Worker (Hono) │
   │  signature verify → FSM → Convex      │
   └───────────────┬──────────────────────┘
                   │ Convex client
                   ▼
   ┌──────────────────────────────────────┐
   │  packages/convex — data model +       │
   │  queries / mutations / actions        │◄────────┐
   └──────────────────────────────────────┘         │ Convex React
                   ▲                                 │ (realtime)
                   │ shared types                    │
   ┌───────────────┴──────────┐        ┌─────────────┴────────────┐
   │  packages/types          │        │  apps/web — Next.js 15    │
   │  StaffRole, SessionState │        │  RSC session + client UI  │
   └──────────────────────────┘        └──────────────────────────┘
```

- **Auth** is PIN-based. Convex hashes PINs with salted PBKDF2 and issues an HMAC-signed session token; the web app wraps it in an HttpOnly, Secure, SameSite=Lax cookie with a 12-hour lifetime. Middleware guards every dashboard route by role.
- **Realtime** — the web console subscribes to Convex queries, so order and inventory changes propagate instantly across every signed-in device.

## Tech stack

| Area | Choice |
|---|---|
| Monorepo | pnpm workspaces + Turborepo |
| Language | TypeScript (strict, `exactOptionalPropertyTypes`) |
| Backend / DB | Convex (schema, queries, mutations, actions, file storage) |
| Web | Next.js 15 (App Router, RSC), React 19 |
| Styling | Tailwind CSS + a CSS-variable design system |
| Icons | lucide-react |
| Edge API | Cloudflare Workers + Hono |
| Imports | PapaParse (CSV) and SheetJS (XLSX) |
| QR codes | `qrcode` |

## Repository layout

```
apps/
  api/          Cloudflare Worker — WhatsApp webhook, FSM, message templates
  web/          Next.js staff console (counter, waiter, manager, owner)
packages/
  convex/       Convex schema and server functions (auth, orders, items, staff, sessions, seed, analytics)
  types/        Shared TypeScript types (StaffRole, SessionState, parsed-inventory shapes)
spec.md         Product specification and addenda source material
```

## Features

- **Role-based staff console** — counter, waiter, manager, and owner each get a tailored workspace behind a shared responsive sidebar shell.
- **Live order queue** — counter staff acknowledge, prepare, ready, serve, and cancel orders; each order carries a short daily reference (for example `0042`) for the counter.
- **Menu inventory with photos** — managers create, edit, archive, and toggle availability of menu items. Food images upload directly to **Convex file storage**; seeded items use credited Unsplash photography with graceful text fallbacks.
- **Bulk import** — CSV/XLSX menu import with column mapping, per-row validation, and an atomic upsert.
- **Tables and QR codes** — managers manage dining tables, assign waiters, generate a per-table WhatsApp QR code, export each code as a PNG, and print a full QR sheet.
- **Analytics** — headline metrics plus an orders-by-hour chart with a 3-hour rollup, top items, table and waiter performance, and lowest-rated items.
- **Staff management and audit** — owner-aware staff screen with a server-enforced visibility model and an owner-only audit trail of every account change.
- **WhatsApp ordering bot** — a finite state machine covering greeting, table binding, category and item browsing, cart, name capture, consent, placement, and feedback, with global `menu` / `cart` / `cancel` / `help` commands.

## Staff roles and access model

Four roles form a strict hierarchy. A role may create, modify, or disable only roles **strictly below** its own level, and never its own record.

| Role | Level | Can manage | Home |
|---|---|---|---|
| Owner | 3 | Manager, Counter, Waiter | `/manager` |
| Manager | 2 | Counter, Waiter | `/manager` |
| Counter | 1 | — | `/counter` |
| Waiter | 1 | — | `/waiter` |

- The rule is enforced by a single `assertMayManage` guard called inside every staff-mutating Convex function — not just hidden in the UI. A manager attempting to create a manager is rejected server-side.
- The `/manager/staff` screen applies the same predicate for **visibility**: a manager never receives owner or manager rows from the server, and the owner-only audit trail rejects non-owner callers.
- Every create, role change, enable, disable, and PIN reset writes exactly one `staffAudit` row in the same mutation. Audit rows never contain PIN values or hashes.
- Sign-in is PIN-only. The owner shares the `/manager` dashboard; there is no separate owner route. Owner PINs must be **6 digits**; other roles may use 4 to 6.

## Getting started

Prerequisites: Node.js ≥ 20, pnpm 11, and a Convex account.

```bash
pnpm install

# 1. Link the Convex backend (creates/links a dev deployment and generates types)
pnpm --filter @heavenly/convex exec convex dev --once

# 2. Configure the web app environment (see below), then run the console
pnpm --filter @heavenly/web dev
```

For active backend development, run `convex dev` in a separate terminal so schema and function changes deploy on save. Long-running dev servers should be started manually in your own terminal.

## Environment variables

Copy the examples and fill them in. Nothing secret is committed; every key is present and blank in the `.example` files.

**Web** (`apps/web/.env.local`, from `.env.example`):

| Name | Purpose |
|---|---|
| `NEXT_PUBLIC_CONVEX_URL` | Convex deployment URL |
| `SESSION_SECRET` | ≥ 32-char secret for signing the staff session cookie (must match Convex) |
| `NEXT_PUBLIC_RESTAURANT_ID` | The seeded restaurant id |
| `NEXT_PUBLIC_WHATSAPP_MSISDN` | Restaurant WhatsApp number used to build table QR links |

**Worker** (`apps/api/.dev.vars`, from `apps/api/.dev.vars.example`): `WHATSAPP_TOKEN`, `PHONE_NUMBER_ID`, `VERIFY_TOKEN`, `META_APP_SECRET`, `CONVEX_URL`, `NVIDIA_API_KEY`, `RESTAURANT_ID`, `BUILD_SHA`, `FEEDBACK_DELAY_MS`.

**Convex deployment variables**: `SESSION_SECRET` (matches the web value) and, only while seeding, a temporary `SEED_SECRET`.

## Seeding data

Seeding is guarded by a `SEED_SECRET` set on the Convex deployment and is designed to run on an empty deployment, then be enriched. A typical bootstrap:

1. Set a temporary `SEED_SECRET` on the deployment.
2. Run `seed:demo` with the restaurant name, WhatsApp number, and one PIN per role to create the restaurant, staff, tables, and menu.
3. Run `seed:enrichDemo` to add richer descriptions, realistic orders, sessions, and feedback.
4. Run `seed:addOwner` to create the single owner account (6-digit PIN).
5. Remove `SEED_SECRET` from the deployment.

The seed creates one account per role. PIN values are chosen at seed time and are not stored in this repository; keep them out of version control and rotate them for any non-development use.

## Owner PIN recovery

There is **no in-app path** to create an owner or reset the owner PIN — this is a deliberate MVP simplification. If the owner PIN is lost, recovery runs out of band from the Convex dashboard/CLI:

1. Set a temporary `SEED_SECRET` on the deployment.
2. Run the `seed:resetOwnerPin` action with the restaurant id and a new **6-digit** PIN.
3. Remove `SEED_SECRET`.

This intentionally avoids building an email/SMS account-recovery channel, which is out of scope for a single-premises tool.

## Common scripts

Run from the repo root:

```bash
pnpm dev         # turbo dev across apps
pnpm build       # turbo build
pnpm typecheck   # tsc --noEmit across the workspace
pnpm lint        # lint across the workspace
pnpm test        # run package tests
```

Per package, use `pnpm --filter @heavenly/web <script>`, `@heavenly/api`, or `@heavenly/convex`.

## Deployment

- **Convex** — deploy functions with `convex deploy`; set `SESSION_SECRET` on the production deployment.
- **Web** — deploy `apps/web` to a Next.js host (for example Vercel) with the production environment variables.
- **Worker** — deploy `apps/api` with Wrangler; configure WhatsApp secrets with `wrangler secret put` and point the Meta webhook at the Worker URL.

## Known limitations

- **PIN-based, single-premises auth.** Adequate for staff with physical access to the till; not built for remote or multi-tenant access.
- **Owner PIN has no in-app recovery** (see above).
- **No payments.** Settlement happens at the counter. Any order summary is a record of an order, not a payment receipt or fiscal document.
- **Single restaurant.** The schema is multi-tenant-shaped but tenant isolation is not enforced end to end.
- **Analytics compute live** from order and feedback data — fine at demo scale, not for very large histories.
- **WhatsApp Flows, OCR menu import, and broadcast messaging** are deferred.
- **Menu images require manual upload;** items without a photo degrade gracefully to text.
