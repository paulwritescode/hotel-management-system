;;; -*- mode: lisp; -*-
;;; ============================================================================
;;; BUILD.lisp — Agent Instruction Layer
;;; Heavenly Foods AI-Powered Restaurant Management System
;;; Biasharawatch Technologies / Samchi Digital
;;; ============================================================================
;;;
;;; This file is the instruction layer for the coding agent building this
;;; project. It is DATA, not a program. Nothing here is evaluated by a Lisp
;;; runtime. The agent reads these forms, resolves them against SPEC.md, and
;;; emits code.
;;;
;;; AUTHORITY ORDER — when sources disagree:
;;;   1. The human operator's direct instruction in conversation
;;;   2. SPEC.md
;;;   3. This file
;;;   4. The agent's own judgement
;;; If this file contradicts SPEC.md, STOP and report the contradiction.
;;; Do not silently pick one.
;;;
;;; ============================================================================

(defproject heavenly-foods
  (:version        "1.0.0")
  (:spec           "./SPEC.md")
  (:client         "Heavenly Foods Restaurant")
  (:vendor         "Biasharawatch Technologies")
  (:scope          :mvp-single-restaurant-demo)
  (:timebox        :hours)
  (:status         :spec-frozen))


;;; ============================================================================
;;; SECTION 1 — AGENT OPERATING RULES
;;; Read this section fully before emitting a single line of code.
;;; ============================================================================

(defrules agent-conduct

  (rule :read-spec-first
    (:statement "SPEC.md is the source of truth. Before implementing any task,
                 read the SPEC.md sections named in that task's :spec-ref.")
    (:violation "Implementing from this file alone. It is a plan, not a
                 specification. Details live in SPEC.md."))

  (rule :no-invention
    (:statement "Do not invent features, routes, tables, fields, env vars, or
                 dependencies not named in SPEC.md or this file.")
    (:rationale "Scope creep is the single largest risk to an hours-scale
                 build. Every invented feature is untested surface area.")
    (:on-gap     "If something genuinely necessary is missing, STOP and ask.
                  Do not fill the gap with a guess."))

  (rule :phase-2-is-forbidden
    (:statement "Anything tagged [P2] in SPEC.md MUST NOT be built.")
    (:forbidden (ocr-pipeline
                 cockroachdb
                 waiter-roster
                 waiter-timetable
                 broadcast-messaging
                 offer-management
                 scheduled-reports
                 analytics-rollup-job
                 payments
                 multi-tenancy-enforcement))
    (:allowed   "Creating the ParsedInventoryBatch type as a seam for future
                 OCR. That is a type definition, not a feature."))

  (rule :no-placeholder-secrets
    (:statement "Never write a real-looking token, key, or secret into any
                 file. Blank values in .example files only.")
    (:forbidden ("sk-..." "EAAG..." "any plausible-looking credential")))

  (rule :design-is-binding
    (:statement "SPEC.md §4 is not a suggestion. Every rule in §4.11 is a hard
                 constraint. Audit output against §4.11 before declaring any
                 UI task complete."))

  (rule :fail-loud-in-dev-quiet-in-prod
    (:statement "Validation failures throw in development with a descriptive
                 message. In the webhook path, errors are caught, logged, and
                 the handler still returns 200 to Meta."))

  (rule :one-task-one-commit
    (:statement "Each task in Section 6 is one commit. Commit message is the
                 task id and its :title.")
    (:format "task-id: title"))

  (rule :verify-before-advance
    (:statement "A task is complete only when its :done-when predicate is
                 demonstrably true. Do not proceed to a dependent task on an
                 unverified predecessor."))

  (rule :ask-dont-assume
    (:statement "These require a human decision and MUST NOT be guessed:")
    (:escalate (meta-credentials
                convex-deployment-target
                vercel-project-linkage
                the-restaurant-real-menu-contents
                real-table-count
                staff-names-and-roles))))


;;; ============================================================================
;;; SECTION 2 — STACK. FROZEN. NOT OPEN FOR SUBSTITUTION.
;;; ============================================================================

(defstack heavenly-foods

  (:package-manager
    (:choice   pnpm)
    (:version  "9.12.0")
    (:pin-in   "package.json :packageManager")
    (:rationale
      "Strict symlinked node_modules catches phantom dependencies at dev time.
       In a two-target monorepo an agent WILL accidentally import a web-only
       package from the worker; npm's flat hoisting hides that until the
       wrangler deploy fails. pnpm surfaces it immediately.")
    (:rejected
      (npm  :reason "Flat hoisting permits phantom deps across workspaces.")
      (bun  :reason "Faster, but wrangler bundling and Convex codegen are
                     npm-ecosystem-native. No budget to debug a package
                     manager during an hours-scale build."))
    (:note "bun MAY be used as a script runner over a pnpm-installed tree.
            bun install MUST NOT be used."))

  (:frontend
    (:framework   next  :version "15.x" :router :app)
    (:language    typescript :strict t)
    (:ui          shadcn-ui :vendored t :restyled-per "SPEC.md §4.7")
    (:styling     tailwindcss :version "3.x")
    (:data-client convex-react)
    (:host        vercel)
    (:root-dir    "apps/web"))

  (:backend
    (:framework   hono)
    (:runtime     cloudflare-workers)
    (:language    typescript :strict t)
    (:tooling     wrangler)
    (:root-dir    "apps/api")
    (:purpose     "WhatsApp transport ONLY. See :forbidden below."))

  (:data
    (:primary     convex)
    (:role        "Hot store: schema, mutations, reactive queries.")
    (:realtime    "Convex reactive queries. No WebSocket code. No polling.")
    (:cold-store  (:choice cockroachdb :status :deferred-p2 :provision nil)))

  (:llm
    (:provider    nvidia-nim)
    (:scope       "Recommendation phrasing ONLY. See SPEC.md §2.3.7.")
    (:timeout-ms  2000)
    (:retries     0)
    (:fallback    :deterministic-template :required t))

  (:messaging
    (:provider    meta-whatsapp-cloud-api)
    (:api-version "v21.0")
    (:number      :real-provisioned-waba)
    (:mock        nil :reason "Real number available. Build real transport."))

  (:forbidden-additions
    "Do not add any of these without explicit human approval:"
    (redis postgres prisma drizzle trpc graphql
     socket.io pusher ably
     nextauth clerk auth0 supabase
     zustand redux jotai recoil
     framer-motion react-spring gsap
     axios
     any-component-library-other-than-shadcn
     any-css-framework-other-than-tailwind)))


;;; ============================================================================
;;; SECTION 3 — REPOSITORY SHAPE
;;; ============================================================================

(defrepo heavenly-foods
  (:layout :monorepo)
  (:workspaces "apps/*" "packages/*")

  (:tree
    (apps
      (web
        (app
          "layout.tsx" "page.tsx"
          (login "page.tsx")
          (counter "page.tsx")
          (waiter "page.tsx")
          (manager
            "page.tsx"
            (inventory "page.tsx" (import "page.tsx"))
            (tables "page.tsx")
            (staff "page.tsx")))
        (components
          (ui        :note "shadcn, vendored + restyled per SPEC.md §4.7")
          (orders)
          (inventory)
          (analytics))
        (lib "auth.ts" "convex.ts" "csv.ts" "qr.ts" "format.ts")
        (styles "globals.css"))

      (api
        (src
          "index.ts"
          (routes "whatsapp.ts" "health.ts")
          (whatsapp "signature.ts" "client.ts" "templates.ts" "machine.ts" "parse.ts")
          (llm "recommend.ts")
          "convex.ts"
          "env.ts")
        "wrangler.toml"
        ".dev.vars.example"))

    (packages
      (convex
        (convex
          "schema.ts" "items.ts" "orders.ts" "sessions.ts"
          "staff.ts" "tables.ts" "feedback.ts" "analytics.ts" "seed.ts"))
      (types
        (src "index.ts")))

    "pnpm-workspace.yaml"
    "package.json"
    "turbo.json"
    "SPEC.md"
    "BUILD.lisp"
    ".gitignore")

  (:gitignore-must-include
    ".env" ".env.local" ".dev.vars" "node_modules" ".next"
    ".wrangler" ".vercel" "convex/_generated")

  (:committed-examples
    ".env.example" ".dev.vars.example"))


;;; ============================================================================
;;; SECTION 4 — DATA MODEL DIRECTIVES
;;; Schema itself is in SPEC.md §3.5. These are the invariants.
;;; ============================================================================

(defdata-invariants

  (invariant :restaurant-id-everywhere
    (:statement "Every domain table carries restaurantId, including in MVP
                 where there is one restaurant.")
    (:rationale "Cheapest possible insurance against a multi-tenant migration."))

  (invariant :price-is-integer-kes
    (:statement "priceKes and totalKes are positive integers. No floats, no
                 decimals, no minor units.")
    (:rationale "Kenyan menu prices are integral. Floats introduce rounding
                 bugs for zero benefit."))

  (invariant :order-lines-snapshot
    (:statement "Order lines store nameSnapshot and priceKesSnapshot. They
                 MUST NOT be live references to the item document.")
    (:rationale "Editing a menu price must not rewrite the value of orders
                 already placed."))

  (invariant :server-computes-totals
    (:statement "totalKes is computed server-side inside the mutation from
                 the snapshotted line prices. Any client-supplied total is
                 discarded without comparison."))

  (invariant :server-timestamps
    (:statement "All timestamps use server time inside the mutation.
                 Client-supplied timestamps are ignored."))

  (invariant :soft-delete-only
    (:statement "Items are archived, never deleted. Historical orders
                 reference them."))

  (invariant :status-transitions-guarded
    (:statement "Order status transitions are validated server-side.")
    (:graph  ((pending      -> acknowledged cancelled)
              (acknowledged -> preparing cancelled)
              (preparing    -> ready cancelled)
              (ready        -> served cancelled)
              (served       -> closed)
              (closed       -> )
              (cancelled    -> )))
    (:note "Any transition not in this graph is rejected with an error."))

  (invariant :bounded-live-queries
    (:statement "Reactive queries are bounded. orders.live returns open
                 orders only, limit 100.")
    (:violation "An unbounded live query. It degrades invisibly."))

  (invariant :session-keyed-by-phone
    (:statement "One live session per phone number. sessions is keyed by
                 phone, not by a generated session id."))

  (invariant :pin-hashed
    (:statement "PINs stored as PBKDF2 hash via crypto.subtle, >=100k
                 iterations, per-user salt. Never plaintext, never
                 reversible.")))


;;; ============================================================================
;;; SECTION 5 — SECURITY DIRECTIVES
;;; Non-negotiable. A failure here is a demo-stopping bug or worse.
;;; ============================================================================

(defsecurity

  (directive :raw-body-before-parse
    (:applies-to "apps/api/src/routes/whatsapp.ts")
    (:statement "Read the raw request body as text BEFORE JSON.parse. Compute
                 the HMAC over those exact bytes.")
    (:failure-mode "Re-serializing parsed JSON yields different bytes. The
                    signature will never match and every message is rejected.
                    This is the single most common integration bug in this
                    build.")
    (:severity :critical))

  (directive :constant-time-comparison
    (:applies-to (signature-validation verify-token-check session-token-check))
    (:statement "Compare secrets in constant time. Never with === on the
                 raw string.")
    (:severity :high))

  (directive :ack-then-process
    (:applies-to "POST /webhooks/whatsapp")
    (:statement "Return 200 immediately after signature validation. Do all
                 processing inside executionCtx.waitUntil.")
    (:failure-mode "A synchronous handler that awaits an LLM call trips
                    Meta's timeout, and Meta retries for 24 hours.")
    (:severity :critical))

  (directive :waituntil-swallows-errors
    (:statement "handleInbound catches and logs its own errors. An unhandled
                 rejection inside waitUntil is invisible and untraceable.")
    (:severity :high))

  (directive :idempotency-by-wamid
    (:statement "Record and check processed WAMIDs in a single Convex
                 mutation. Skip any already-recorded message.")
    (:failure-mode "Meta redelivers. Without this, one diner tap creates
                    two orders.")
    (:severity :critical))

  (directive :authorize-in-convex
    (:statement "Role checks live in Convex functions, not only in the UI.")
    (:violation "Hiding a button and calling it authorization.")
    (:severity :high))

  (directive :verify-token-no-echo
    (:statement "On verify-token mismatch return 403 with an empty body.
                 Never echo the challenge. Never log the received token.")
    (:severity :high))

  (directive :llm-sees-three-items
    (:applies-to "apps/api/src/llm/recommend.ts")
    (:statement "The LLM prompt contains only the three pre-selected items.
                 Never the full menu, never order history, never customer
                 details beyond first name.")
    (:rationale "Selection is deterministic; the LLM only phrases. This makes
                 a hallucinated dish or price structurally impossible.")
    (:severity :high))

  (directive :validate-llm-output
    (:statement "If the LLM response mentions a price or item name not among
                 the three supplied, discard it and use the template.")
    (:severity :high))

  (directive :rate-limit-pin
    (:statement "5 failed PIN attempts per staff record per 15 minutes, then
                 a 15-minute lockout. Tracked in Convex.")
    (:severity :medium)))


;;; ============================================================================
;;; SECTION 6 — TASK GRAPH
;;; Execute in dependency order. Each task is one commit.
;;; ============================================================================

(deftasks heavenly-foods

  ;; ---- Phase 0: foundation -------------------------------------------------

  (task T00-scaffold
    (:title     "Scaffold pnpm monorepo")
    (:spec-ref  "§3.3 §3.4")
    (:deps      ())
    (:steps
      "Create pnpm-workspace.yaml with apps/* and packages/*."
      "Root package.json: packageManager pnpm@9.12.0, private true, scripts."
      "Create apps/web via create-next-app, TypeScript, App Router, Tailwind."
      "Create apps/api via create-hono, cloudflare-workers template."
      "Create packages/types with a bare src/index.ts."
      "Create packages/convex, run convex init inside it."
      "turbo.json with dev, build, lint pipelines."
      ".gitignore per §3.4.")
    (:done-when "pnpm install succeeds and pnpm dev starts both apps with no
                 errors.")
    (:forbidden "Adding any dependency in defstack :forbidden-additions."))

  (task T01-convex-schema
    (:title     "Convex schema and seed")
    (:spec-ref  "§3.5")
    (:deps      (T00-scaffold))
    (:steps
      "Transcribe SPEC.md §3.5 schema verbatim into packages/convex/convex/schema.ts."
      "Do not add, rename, or omit fields or indexes."
      "Run convex dev to generate types."
      "Write seed.ts: one restaurant, 6 tables, 12 items across >=4 categories,
       3 staff (one per role) with known PINs."
      "Seed prices as realistic Kenyan menu integers.")
    (:done-when "Convex dashboard shows all tables; seed populates them; the
                 generated types compile.")
    (:invariants (:restaurant-id-everywhere :price-is-integer-kes)))

  (task T02-shared-types
    (:title     "Shared types package")
    (:spec-ref  "§2.1.3 §3.4")
    (:deps      (T01-convex-schema))
    (:steps
      "Export domain unions: OrderStatus, ItemCategory, StaffRole,
       SessionState, MarketingConsent."
      "Export the ParsedInventoryBatch and ParsedInventoryRow seam types."
      "Re-export Convex Doc/Id helpers where useful."
      "No runtime dependencies in this package.")
    (:done-when "Both apps import from @heavenly/types and typecheck.")
    (:note "ParsedInventoryBatch is a type only. It is the OCR seam. Building
            the OCR parser is forbidden."))

  ;; ---- Phase 1: design system ---------------------------------------------

  (task T03-design-tokens
    (:title     "Design tokens and global styles")
    (:spec-ref  "§4.2 §4.3 §4.4 §4.6")
    (:deps      (T00-scaffold))
    (:steps
      "Declare every --hf-* colour token from §4.2 in globals.css :root."
      "Declare typography custom properties for the §4.3 scale."
      "Extend tailwind.config with the colour tokens, spacing scale, radius
       scale, and font stacks."
      "Load Inter from Google Fonts as explicit fallback."
      "Set body base to 17px / 400 / 1.44 line-height with -0.374px tracking."
      "Set global focus-visible to 2px solid var(--hf-primary-focus).")
    (:done-when "A test page renders every type scale step and every colour
                 token correctly, and body text measures 17px.")
    (:hard-rules
      "Body 17px, never 16px."
      "Weight 500 must not appear in any token."
      "No gradient tokens. None."))

  (task T04-shadcn-restyle
    (:title     "Vendor and restyle shadcn components")
    (:spec-ref  "§4.5 §4.6 §4.7 §4.10 §4.11")
    (:deps      (T03-design-tokens))
    (:steps
      "Vendor: button, card, input, switch, dialog, badge, table, tabs,
       select, toast, dropdown-menu."
      "Apply every override in the §4.7 mapping table."
      "AUDIT each vendored file: remove every shadow-* class."
      "AUDIT each vendored file: replace rounded-md per the §4.6 grammar."
      "Add active:scale-95 to every button variant."
      "Add a 150ms ease-out transition on colour and transform only."
      "Wrap the scale transform in a prefers-reduced-motion guard.")
    (:done-when "Grepping components/ui for 'shadow-' returns zero results,
                 and every button visibly scales on press.")
    (:hard-rules
      "ZERO drop shadows anywhere in the application."
      "One accent colour: #0066cc."
      "Radius grammar is sm(8) / lg(18) / pill only, plus the rare md(11)."
      "Dialog separates from the page with an rgba(0,0,0,0.4) backdrop, not
       a shadow."))

  ;; ---- Phase 2: auth -------------------------------------------------------

  (task T05-auth
    (:title     "PIN authentication and role guards")
    (:spec-ref  "§2.7")
    (:deps      (T01-convex-schema T04-shadcn-restyle))
    (:steps
      "Convex: hashPin, verifyPin using crypto.subtle PBKDF2, >=100k
       iterations, per-user salt."
      "Convex: signIn mutation with the 5-attempt / 15-minute lockout."
      "Web: /login screen per §4.8, hero-display 56px, centred on parchment."
      "Web: signed session cookie, httpOnly, Secure, SameSite=Lax, 12h."
      "Web: middleware routing counter/waiter/manager by role."
      "Convex: a requireRole helper applied inside every privileged function.")
    (:done-when "Three seeded staff each reach exactly their own route; a
                 wrong PIN five times produces a lockout; a counter-role user
                 calling a manager Convex function is rejected server-side.")
    (:security (:authorize-in-convex :pin-hashed :rate-limit-pin)))

  ;; ---- Phase 3: counter dashboard -----------------------------------------

  (task T06-order-functions
    (:title     "Convex order functions")
    (:spec-ref  "§2.3.6 §2.4")
    (:deps      (T01-convex-schema))
    (:steps
      "Query orders.live — open orders only, newest first, limit 100."
      "Mutation orders.create — validates lines against live item state,
       snapshots name and price, computes total server-side, decrements
       quantityOnHand, writes with status pending."
      "Mutation orders.transition — enforces the status graph in §4 invariants."
      "Mutation orders.cancel — requires a reason of >=3 chars, records staff."
      "Query orders.byTable, orders.byPhone.")
    (:done-when "A unit test proves: a client-supplied wrong total is ignored;
                 served -> pending is rejected; ordering the last unit of a
                 tracked item auto-sets available false.")
    (:invariants (:order-lines-snapshot :server-computes-totals
                  :status-transitions-guarded :bounded-live-queries)))

  (task T07-counter-dashboard
    (:title     "Counter dashboard")
    (:spec-ref  "§2.4 §4.8")
    (:deps      (T05-auth T06-order-functions))
    (:steps
      "Route /counter, role-guarded."
      "Global nav 44px black, sub-nav 52px parchment @80% with backdrop blur."
      "Order queue as full-bleed alternating canvas/parchment tiles."
      "Per tile: table number display-lg 40/600, name tagline, lines
       body-strong/body, total lead 28px, elapsed fine-print live-ticking."
      "Status shown as a left bar plus a text label per §4.2. Never colour
       alone."
      "Action pills: acknowledge, preparing, ready, served, cancel."
      "Cancel opens a dialog requiring a reason."
      "Manual order creation with source 'counter'."
      "Stock strip: lg-radius utility card grid, switch per item, filter by
       category, search by name."
      "Optimistic toggle with visible revert and a toast on failure."
      "tel: link on each order card.")
    (:done-when "Two browsers open; a status change in one appears in the
                 other within 2 seconds with no refresh and no polling code
                 anywhere in the file.")
    (:hard-rules
      "No borders between tiles — the surface colour change is the divider."
      "No shadows on tiles."
      "Every action target >=44x44px."
      "No setInterval near data fetching. The elapsed-time ticker is the one
       permitted interval and it touches no data."))

  ;; ---- Phase 4: inventory --------------------------------------------------

  (task T08-item-functions
    (:title     "Convex item functions")
    (:spec-ref  "§2.1.1 §2.1.4 §2.1.5")
    (:deps      (T01-convex-schema))
    (:steps
      "items.list, items.available, items.byCategory."
      "items.create, items.update, items.archive."
      "items.setAvailable."
      "items.bulkUpsert — atomic, idempotent on (name, category)."
      "Validate priceKes is a positive integer at the mutation layer.")
    (:done-when "Re-running bulkUpsert with identical input creates zero new
                 rows; a price of 0 or -1 is rejected server-side.")
    (:invariants (:price-is-integer-kes :soft-delete-only)))

  (task T09-manager-inventory
    (:title     "Manager inventory UI and CSV import")
    (:spec-ref  "§2.1.1 §2.1.2 §4.7")
    (:deps      (T05-auth T08-item-functions))
    (:steps
      "Route /manager/inventory: table of items, inline availability switch,
       create and edit dialogs."
      "Route /manager/inventory/import."
      "Client-side parse of .csv and .xlsx — no server round trip for preview."
      "Column inference against the synonym table in §2.1.2, including the
       Swahili synonyms bei and idadi."
      "Per-column override dropdowns."
      "Live preview of the first 20 rows with inline per-row validation errors."
      "Invalid rows listed separately and excluded; valid subset can proceed."
      "Save the confirmed mapping to restaurant.columnMappingProfile."
      "Commit via items.bulkUpsert in one call.")
    (:done-when "A 20-row CSV with two invalid rows imports 18 items, lists
                 the 2 failures, and a re-upload of the same file creates no
                 duplicates.")
    (:forbidden "Any OCR. Any image upload. The import accepts .csv and .xlsx
                 only."))

  ;; ---- Phase 5: whatsapp transport ----------------------------------------

  (task T10-webhook-verify
    (:title     "WhatsApp webhook verification and signature validation")
    (:spec-ref  "§2.3.2 §2.3.3 §3.6")
    (:deps      (T00-scaffold))
    (:steps
      "GET /webhooks/whatsapp: constant-time compare of hub.verify_token,
       return hub.challenge as bare text/plain 200 on match, empty 403 on
       mismatch."
      "POST /webhooks/whatsapp: read raw body as text BEFORE parsing."
      "verifySignature: HMAC-SHA256 via crypto.subtle over the raw bytes,
       constant-time compare against x-hub-signature-256."
      "Return 401 and process nothing on mismatch."
      "GET /health returning the build sha."
      "wrangler.toml and .dev.vars.example with every key from §3.7, blank.")
    (:done-when "Unit tests cover valid signature, invalid signature, missing
                 header, and the body-mutated-after-read case. Meta webhook
                 registration succeeds against the deployed worker.")
    (:security (:raw-body-before-parse :constant-time-comparison
                :verify-token-no-echo))
    (:severity :critical))

  (task T11-session-functions
    (:title     "Convex session and idempotency functions")
    (:spec-ref  "§2.3.4 §2.3.5")
    (:deps      (T01-convex-schema))
    (:steps
      "sessions.getOrCreate by phone, 30-minute expiry."
      "sessions.transition — updates state, touches lastMessageAt and
       expiresAt."
      "sessions.addToCart, sessions.clearCart, sessions.setName,
       sessions.setConsent."
      "sessions.expire — an expired session receiving a message starts fresh,
       it does not resume a stale cart."
      "messages.claimWamid — checks and records in ONE mutation. Returns false
       if already seen."
      "A scheduled function pruning processedMessages past expiresAt.")
    (:done-when "Calling claimWamid twice concurrently with the same id
                 returns true exactly once.")
    (:security (:idempotency-by-wamid)))

  (task T12-bot-state-machine
    (:title     "WhatsApp conversation state machine")
    (:spec-ref  "§2.3.5 §2.3.6 §2.3.8 §2.3.10 §2.2.1")
    (:deps      (T10-webhook-verify T11-session-functions T06-order-functions))
    (:steps
      "Implement every state and edge in §2.3.5 as an explicit transition
       table. Not an LLM agent. Not free-form."
      "Parse the QR entry message with /^table\\s*(\\d{1,3})$/i; fall through
       to AWAITING_TABLE on no match."
      "Handle the global commands menu, cart, cancel, help from every state,
       checked BEFORE state-specific parsing."
      "cancel before PLACED clears the cart; cancel after PLACED tells the
       diner to speak to their waiter and does not cancel the order."
      "Render the menu from live item state on every render — no cache."
      "Interactive list messages where options <=10, paginated beyond.
       Accept free-text number entry as a fallback in every case."
      "Every outbound message under 1024 characters — paginate, never
       truncate."
      "Capture name, then ask consent once, storing the tri-state."
      "Consent is NOT a gate — a declined or ignored answer still places the
       order."
      "On confirm, call orders.create; on any line failure report exactly
       which item became unavailable."
      "handleInbound catches and logs its own errors.")
    (:done-when "An order placed from a real phone appears on /counter within
                 2 seconds; replaying the identical webhook payload creates
                 exactly one order; a message from every state is handled
                 without an unhandled exception.")
    (:security (:ack-then-process :waituntil-swallows-errors))
    (:hard-rules
      "The bot is a state machine. The LLM does not drive the flow."
      "Menu content is read live. There is no cached menu."))

  (task T13-recommendations
    (:title     "Deterministic selection with LLM phrasing")
    (:spec-ref  "§2.3.7 §3.8")
    (:deps      (T12-bot-state-machine))
    (:steps
      "Filter available non-archived items by stated budget and category."
      "Rank by order count over the last 7 days descending, then price
       ascending."
      "Take the top three."
      "Send ONLY those three to the LLM, with a prompt instructing one warm
       sentence per item using only the supplied name, price, description."
      "2000ms hard timeout, zero retries."
      "Validate the response: any price or item name not among the three
       supplied means discard and use the template."
      "Deterministic template fallback on every failure path.")
    (:done-when "With NVIDIA_API_KEY removed, recommendations still return via
                 template and ordering is unaffected.")
    (:security (:llm-sees-three-items :validate-llm-output))
    (:hard-rules "The LLM phrases. It never selects."))

  ;; ---- Phase 6: feedback, analytics, tables -------------------------------

  (task T14-feedback
    (:title     "Post-order feedback")
    (:spec-ref  "§2.3.9")
    (:deps      (T12-bot-state-machine T07-counter-dashboard))
    (:steps
      "On transition to served, schedule a feedback prompt after a
       configurable delay, default 10 minutes."
      "One interactive 1-5 rating message."
      "On rating <=3, one free-text follow-up asking what went wrong."
      "Store rating, comment, denormalised itemIds, and waiterId."
      "Feedback is optional. No reminders, no second prompt.")
    (:done-when "Marking an order served produces a rating prompt; a rating of
                 2 triggers exactly one follow-up; the comment appears on
                 manager analytics."))

  (task T15-waiter-dashboard
    (:title     "Waiter dashboard, reduced scope")
    (:spec-ref  "§2.5")
    (:deps      (T05-auth T06-order-functions))
    (:steps
      "Route /waiter, role-guarded."
      "Orders filtered to tables assigned to the signed-in waiter."
      "Mark served, stamping servedAt and servedByStaffId."
      "Personal stats: orders served today, median acknowledged-to-served
       time.")
    (:done-when "A waiter sees only their assigned tables' orders and marking
                 served stamps their id.")
    (:forbidden "Roster. Timetable. Shift auto-assignment. Ranking
                 leaderboard. All P2."))

  (task T16-tables-and-qr
    (:title     "Table management and QR generation")
    (:spec-ref  "§2.2.1 §2.6")
    (:deps      (T05-auth))
    (:steps
      "Route /manager/tables: create, edit, deactivate tables."
      "Assign a waiter to a table."
      "Generate a QR client-side encoding
       https://wa.me/<MSISDN>?text=Table%20<N>"
      "A print sheet laying out all table QRs, legible at 40cm."
      "Each table's QR is distinct. No generic QR.")
    (:done-when "Scanning a printed QR opens WhatsApp with 'Table 7'
                 pre-filled and the bot binds the table on send.")
    (:forbidden "Any server-side or third-party QR service. Generate client-side."))

  (task T17-manager-analytics
    (:title     "Manager analytics, live-computed")
    (:spec-ref  "§2.6")
    (:deps      (T06-order-functions T14-feedback))
    (:steps
      "Convex queries computing, live: orders today, revenue today, average
       order value; top five items by count over 7 days; lowest-rated items
       with their comments; orders by hour over 7 days; per-table orders,
       revenue, median turnaround; per-waiter served count, median serve
       time, mean rating."
      "Render metric figures as full-bleed alternating tiles per §4.8 —
       display-lg 40/600 figure, caption label above, fine-print window
       below."
      "Every figure states its time window in the UI."
      "Where a denominator is under 5, show the raw count instead of an
       average."
      "Charts use the single accent only; multi-series uses opacity steps.
       Hairline axes, no gridlines.")
    (:done-when "Every figure on the page displays its time window and no
                 average is shown over a denominator below 5.")
    (:forbidden "Rollup jobs. Scheduled reports. CockroachDB. All P2.")
    (:hard-rules
      "No bordered, shadowed metric cards. Figures sit on tiles with air."
      "No colour palette in charts. One accent, opacity steps."))

  (task T18-staff-management
    (:title     "Staff management")
    (:spec-ref  "§2.6 §2.7")
    (:deps      (T05-auth))
    (:steps
      "Route /manager/staff: add staff, set role, set PIN, enable/disable."
      "Disabling invalidates active sessions."
      "PIN set and reset go through the hashing path, never stored plain.")
    (:done-when "Disabling a signed-in staff member ends their session on
                 their next request."))

  ;; ---- Phase 7: hardening --------------------------------------------------

  (task T19-tests
    (:title     "Targeted unit tests")
    (:spec-ref  "§6")
    (:deps      (T06-order-functions T10-webhook-verify T12-bot-state-machine
                 T09-manager-inventory))
    (:steps
      "verifySignature: valid, invalid, missing header, mutated body."
      "Order total: client-supplied wrong total is ignored."
      "State machine: every edge in §2.3.5, plus global commands from every
       state."
      "CSV inference: the synonym table, and an unknown header."
      "Status guard: served -> pending rejected.")
    (:done-when "pnpm test passes with every listed case present.")
    (:forbidden "E2E browser automation. Load testing. Visual regression.
                 Not a good use of the available hours."))

  (task T20-design-audit
    (:title     "Design compliance audit")
    (:spec-ref  "§4.11")
    (:deps      (T07-counter-dashboard T09-manager-inventory
                 T15-waiter-dashboard T17-manager-analytics))
    (:steps
      "Grep the whole web app for 'shadow' — expect zero results outside the
       permitted backdrop-blur rules."
      "Grep for 'gradient' — expect zero results."
      "Grep for font-weight 500 and 'font-medium' — expect zero results."
      "Grep for hex colours outside globals.css — expect zero results."
      "Verify computed body font-size is 17px in the browser."
      "Verify every full-bleed tile has zero border-radius and no border."
      "Verify #2997ff appears only inside dark-tile rules."
      "Verify every interactive target measures >=44x44px."
      "Verify keyboard focus is visible on every control.")
    (:done-when "Every check above passes. This task is not complete on
                 'mostly'.")
    (:severity :high))

  (task T21-demo-rehearsal
    (:title     "Demo rehearsal")
    (:spec-ref  "§1.4 §6")
    (:deps      (T20-design-audit T19-tests T13-recommendations T16-tables-and-qr))
    (:steps
      "Run the full §1.4 sequence end to end."
      "Run it a second time from a clean session."
      "Run the manual checklist in §6."
      "Confirm zero console errors and zero unhandled promise rejections."
      "Confirm the LLM-down path by removing the key mid-run.")
    (:done-when "Two consecutive clean runs of §1.4 with no intervention.")))


;;; ============================================================================
;;; SECTION 7 — DEFINITION OF DONE
;;; ============================================================================

(defdone heavenly-foods

  (:functional
    "The §1.4 demo sequence runs end to end, twice, without intervention."
    "An order placed from a real phone via WhatsApp appears on /counter in
     under 2 seconds."
    "An item toggled unavailable disappears from the bot menu on next render."
    "A replayed webhook payload produces exactly one order."
    "Recommendations degrade to template when the LLM is unavailable."
    "Every role reaches exactly its own routes and no others.")

  (:design
    "Zero drop shadows in the application."
    "Zero gradients."
    "Zero occurrences of font-weight 500."
    "Body copy computes to 17px."
    "One accent colour, #0066cc."
    "Full-bleed tiles have no radius and no borders."
    "Every interactive target is at least 44x44px.")

  (:security
    "Webhook signature validated over raw bytes, constant-time."
    "Webhook returns 200 before processing."
    "WAMID idempotency enforced in a single mutation."
    "PINs hashed with PBKDF2, never stored plain."
    "Role checks enforced inside Convex functions."
    "No secret committed to the repository.")

  (:hygiene
    "pnpm install, pnpm build, pnpm test all pass from a clean clone."
    ".env.example and .dev.vars.example committed with every key, blank."
    "No dependency from defstack :forbidden-additions present."
    "No [P2] feature implemented."))


;;; ============================================================================
;;; SECTION 8 — STOP CONDITIONS
;;; Halt and report to the human operator. Do not work around these.
;;; ============================================================================

(defstop-conditions

  (stop :spec-contradiction
    "This file and SPEC.md disagree on a material point.")

  (stop :missing-credentials
    "Any of WHATSAPP_TOKEN, PHONE_NUMBER_ID, VERIFY_TOKEN, META_APP_SECRET,
     CONVEX_DEPLOY_KEY is absent. Do not stub these. Do not fabricate them.")

  (stop :signature-never-validates
    "Signature validation fails against real Meta traffic. Check the
     :raw-body-before-parse directive before anything else — that is the
     cause in the overwhelming majority of cases.")

  (stop :p2-appears-necessary
    "A [P2] feature appears to be required for an [MVP] feature to work.
     This means the spec has a gap. Report it; do not build the P2 feature.")

  (stop :design-conflict
    "A §4 design rule appears to make a required interaction unusable.
     Report the specific conflict. Do not resolve it by relaxing the rule.")

  (stop :forbidden-dependency-needed
    "A task appears to require a dependency in :forbidden-additions.
     Report what and why. Do not add it.")

  (stop :scope-pressure
    "A task appears to need more than its stated scope to be useful.
     Report the gap rather than expanding scope unilaterally."))


;;; ============================================================================
;;; SECTION 9 — QUICK REFERENCE
;;; ============================================================================

(defquickref

  (:commands
    ("pnpm install"                          "install all workspaces")
    ("pnpm dev"                              "run web + api + convex")
    ("pnpm --filter @heavenly/web dev"       "web only")
    ("pnpm --filter @heavenly/api dev"       "worker only, wrangler dev")
    ("pnpm --filter @heavenly/convex dev"    "convex dev, watches schema")
    ("pnpm test"                             "unit tests")
    ("pnpm --filter @heavenly/api deploy"    "wrangler deploy")
    ("wrangler secret put WHATSAPP_TOKEN"    "set a worker secret"))

  (:webhook-url
    "https://<worker-subdomain>.workers.dev/webhooks/whatsapp")

  (:the-five-bugs-that-will-cost-you-the-demo
    "1. HMAC computed over re-serialized JSON instead of raw bytes."
    "2. Webhook processing before returning 200, tripping Meta's timeout."
    "3. Missing WAMID idempotency, producing duplicate orders on retry."
    "4. A cached menu that doesn't reflect an availability toggle."
    "5. shadcn's default shadows surviving the restyle audit.")

  (:spec-sections-most-often-skipped
    "§2.3.3 signature validation — read it twice"
    "§4.7 shadcn override table — every row matters"
    "§4.11 the ten design rules — audit against these, not against taste"))

;;; ============================================================================
;;; END BUILD.lisp
;;; ============================================================================