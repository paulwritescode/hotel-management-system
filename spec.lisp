;;; heavenly-foods.lisp --- Machine-readable system specification
;;;
;;; Project:  Heavenly Foods AI-Powered Restaurant Management System
;;; Client:   Heavenly Foods Restaurant (via Biasharawatch Technologies)
;;; Author:   Paul Kinyatti
;;; Date:     2026-07-22
;;; Version:  1.0.0-mvp
;;; Companion: HEAVENLY_FOODS_SPEC.md
;;;
;;; PURPOSE
;;;   This file is the agent-readable projection of the human-readable spec.
;;;   It is intended for consumption by kiro-cli, Claude Code, MCP tooling, or
;;;   any agent that benefits from structured rather than prose input.
;;;
;;;   Every form is data. Nothing here is meant to be evaluated as a program.
;;;   Read it as a knowledge base.
;;;
;;; CONVENTIONS
;;;   :keyword          — a field name
;;;   (a b c)           — an ordered list
;;;   #t / #f           — boolean true / false
;;;   nil               — absent / null
;;;   "string"          — literal text
;;;   'symbol           — an identifier referenced elsewhere in this file
;;;
;;; NAVIGATION
;;;   (system-meta)          §1
;;;   (scope-traceability)   §2
;;;   (architecture)         §3
;;;   (features)             §4
;;;   (data-model)           §5
;;;   (api-contract)         §6
;;;   (conversation-engine)  §7
;;;   (design-system)        §8
;;;   (toolchain)            §9
;;;   (build-plan)           §10
;;;   (cost-model)           §11
;;;   (risks)                §12

;;; ═══════════════════════════════════════════════════════════════════════
;;; §1  SYSTEM META
;;; ═══════════════════════════════════════════════════════════════════════

(system-meta
  :name           "Heavenly Foods"
  :slug           "heavenly-foods"
  :kind           :restaurant-management-system
  :client         "Heavenly Foods Restaurant"
  :prepared-by    "Biasharawatch Technologies"
  :parent-brand   "Samchi Digital"
  :market         :kenya
  :locales        (:en :sw)
  :currency       "KES"
  :timezone       "Africa/Nairobi"
  :version        "1.0.0-mvp"
  :spec-date      "2026-07-22"

  :thesis
  "WhatsApp is the primary ordering surface; the web app is the operations
   console. Distribution beats polish in this market: the diner already has
   WhatsApp open, and the restaurant already runs informal operations there."

  :mvp-posture
  (:timeline    :hours
   :not         :weeks
   :scale       :single-restaurant
   :purpose     :demo
   :client-quoted-timeline "11 weeks"
   :rationale
   "The client PDF scopes 11 weeks for full rollout. This spec targets a
    demo-grade MVP in a single day, then hardens toward full scope. The
    deferral boundary is drawn at features with external dependencies
    (Meta template approval) or high build cost relative to demo value
    (OCR, roster, rollup pipeline)."))

;;; ═══════════════════════════════════════════════════════════════════════
;;; §2  SCOPE TRACEABILITY
;;;     Every line item from the client PDF, mapped and phased.
;;; ═══════════════════════════════════════════════════════════════════════

(scope-traceability
  :source-document "HEAVENLY_FOODS_AI_POWERED_RESTAURANT_MANAGEMENT_SYSTEM.pdf"
  :total-line-items 38
  :mvp-count        27
  :p2-count         11
  :mvp-coverage     0.71

  :sections
  ((:section "I. Data Upload For Inventory Management"
    :items
    ((:id F-INV-001 :phase :mvp :desc "New restaurant onboarding")
     (:id F-INV-002 :phase :mvp :desc "Excel & CSV upload, live preview"
                    :note "MVP ships CSV; XLSX is P2")
     (:id F-INV-003 :phase :p2  :desc "Handwritten book image OCR")
     (:id F-INV-004 :phase :p2  :desc "Template field mapping, EN+SW")
     (:id F-INV-005 :phase :mvp :desc "Preview, edit, approve workflow")
     (:id F-INV-006 :phase :mvp :desc "Retain original column names")
     (:id F-INV-007 :phase :mvp :desc "Final data preview and upload")))

   (:section "II. Stock Updation"
    :items
    ((:id F-STK-001 :phase :mvp :desc "Real-time updates for in-house orders")
     (:id F-STK-002 :phase :mvp :desc "Available/unavailable toggle")))

   (:section "III. In-House Ordering via WhatsApp"
    :items
    ((:id F-WA-001 :phase :mvp :desc "Natural conversation flow, menu display")
     (:id F-WA-002 :phase :mvp :desc "Recommendations by budget/category/availability")
     (:id F-WA-003 :phase :mvp :desc "Order placement, queuing, staff callback")
     (:id F-WA-004 :phase :mvp :desc "QR code on tables, scan to chat")
     (:id F-WA-005 :phase :mvp :desc "Anti-scam: waiter verification")
     (:id F-WA-006 :phase :mvp :desc "Anti-scam: table number input")
     (:id F-WA-007 :phase :mvp :desc "Anti-scam: customer name & details")
     (:id F-WA-008 :phase :mvp :desc "Anti-scam: timestamp recording")
     (:id F-WA-009 :phase :mvp :desc "Post-order automated feedback")
     (:id F-WA-010 :phase :mvp :desc "Consent for offers via WhatsApp")))

   (:section "IV.a Staff Dashboard — Counter"
    :items
    ((:id F-CTR-001 :phase :mvp :desc "View and manage orders")
     (:id F-CTR-002 :phase :mvp :desc "Complete or cancel orders")
     (:id F-CTR-003 :phase :mvp :desc "Manually create orders")
     (:id F-CTR-004 :phase :mvp :desc "Update stock availability")
     (:id F-CTR-005 :phase :mvp :desc "Contact customer, verified number")))

   (:section "IV.b Staff Dashboard — Waiter"
    :items
    ((:id F-WTR-001 :phase :mvp :desc "View orders for assigned tables")
     (:id F-WTR-002 :phase :p2  :desc "Timetable/roster integration")
     (:id F-WTR-003 :phase :mvp :desc "Record service timestamps")
     (:id F-WTR-004 :phase :mvp :desc "Track waiter performance"
                    :note "MVP: raw metrics only. Composite score is P2.")))

   (:section "IV.c Admin Dashboard — Manager"
    :items
    ((:id F-MGR-001 :phase :mvp :desc "Top-rated dishes/drinks")
     (:id F-MGR-002 :phase :mvp :desc "Low-rated items with reasons")
     (:id F-MGR-003 :phase :p2  :desc "Categorized improvement summaries")
     (:id F-MGR-004 :phase :mvp :desc "Order patterns by day")
     (:id F-MGR-005 :phase :mvp :desc "Table performance, peak times")
     (:id F-MGR-006 :phase :p2  :desc "Waiter ranking")
     (:id F-MGR-007 :phase :p2  :desc "Daily and weekly reports")
     (:id F-MGR-008 :phase :mvp :desc "Add new dishes")
     (:id F-MGR-009 :phase :p2  :desc "Create offers")
     (:id F-MGR-010 :phase :p2  :desc "Broadcast to opted-in users"
                    :blocker "Meta template approval, 24-48h, process not code")
     (:id F-MGR-011 :phase :mvp :desc "Full user management")
     (:id F-MGR-012 :phase :mvp :desc "Table allocation")
     (:id F-MGR-013 :phase :p2  :desc "Roster management")))))

;;; ═══════════════════════════════════════════════════════════════════════
;;; §3  ARCHITECTURE
;;; ═══════════════════════════════════════════════════════════════════════

(architecture

  (component :id 'frontend
    :name         "Next.js 15 App Router"
    :host         :vercel
    :runtime      :node-and-edge
    :responsibility
    (:staff-dashboards :menu-management :analytics-ui :qr-generation :auth-ui)
    :rationale
    ("Server Components render config data with zero client JS"
     "Route groups map cleanly to role scoping"
     "Server Actions handle CSV import without an API route"
     "git push deploy — zero infra work during an hours-long sprint")
    :explicitly-not-used-for
    (:whatsapp-webhook)
    :not-used-reason
    "Vercel cold starts risk exceeding Meta's 20s webhook timeout, which
     triggers retries and duplicate message processing.")

  (component :id 'backend
    :name         "Hono on Cloudflare Workers"
    :host         :cloudflare-workers
    :runtime      :workerd
    :responsibility
    (:whatsapp-webhook :conversation-engine :llm-orchestration
     :rest-api :rate-limiting)
    :rationale
    ("Sub-millisecond cold start — critical for Meta's retry semantics"
     "Express-shaped routing with Workers-native TypeScript inference"
     "Global edge, low latency from Nairobi-adjacent PoPs"
     "100k req/day free tier vs ~3k/day actual for one restaurant")
    :constraints
    ((:name :cpu-time         :limit "10ms"   :mitigation "LLM call is I/O wait, not CPU")
     (:name :wall-duration    :limit "30s"    :mitigation "ACK <1s, process in waitUntil")
     (:name :subrequests      :limit 50       :mitigation "We make 2-3 per request")
     (:name :no-node-builtins :limit nil      :mitigation "Web Crypto for HMAC")))

  (component :id 'hot-store
    :name         "Convex"
    :role         :source-of-truth
    :responsibility
    (:live-operational-state :realtime-subscriptions :scheduled-functions
     :transactional-mutations)
    :rationale
    ("useQuery is a live subscription — removes websocket plumbing entirely"
     "Mutations are serializable; two waiters cannot double-claim an order"
     "TypeScript-native schema shared across web, worker, and DB with no codegen"
     "ctx.scheduler handles session TTL and feedback prompts without cron infra")
    :tradeoff
    "Not SQL. Ad-hoc analytical queries are awkward. This is precisely why
     the cold store exists.")

  (component :id 'cold-store
    :name         "CockroachDB Serverless"
    :role         :analytics-and-audit
    :mvp-status   :provisioned-not-in-read-path
    :responsibility
    (:analytical-sql :time-bucketing :window-functions :immutable-audit)
    :rationale
    ("Postgres-wire SQL for the aggregations the manager dashboard needs"
     "Append-only fact tables give a tamper-evident record for anti-scam"
     "Free tier far exceeds single-restaurant volume")
    :mvp-cut-rationale
    "Analytics come from Convex aggregations in MVP. The rollup job is P2.
     This removes a whole integration from the critical path while keeping
     the door open.")

  (component :id 'llm
    :name         "Provider-agnostic inference layer"
    :interface    "packages/ai/src/provider.ts"
    :providers
    ((:id :nvidia :model "meta/llama-3.1-70b-instruct"
          :cost :free-tier :latency-ms 800  :role :mvp-default)
     (:id :groq   :model "llama-3.3-70b-versatile"
          :cost :free-tier :latency-ms 200  :role :best-latency)
     (:id :ollama :model "llama3.1:8b"
          :cost :self-host :latency-ms :varies :role :offline-fallback))

    :critical-constraint
    (:name "LLM has no write access"
     :statement
     "The model does exactly two things: classify intent from a closed set,
      and format a structured result into prose. It never creates an order,
      changes a price, or marks stock available. All state transitions are
      deterministic TypeScript."
     :consequences
     ("Prompt injection cannot corrupt business logic"
      "A hallucinating model degrades conversation quality, never data integrity"
      "The system remains fully functional with the LLM disabled")))

  (data-flow :id 'diner-places-order
    :steps
    ((1  :actor :diner    :action "Scan QR at table 7"
         :detail "Opens wa.me/<number>?text=TABLE-07")
     (2  :actor :meta     :action "Deliver webhook to Hono"
         :detail "Verify X-Hub-Signature-256, return 200 in <50ms, process in waitUntil")
     (3  :actor :backend  :action "Load or create session by phone"
         :detail "Regex /^TABLE-(\\d{1,3})$/i binds table, state -> AWAITING_NAME")
     (4  :actor :backend  :action "Capture customer name"
         :detail "state -> BROWSING")
     (5  :actor :backend  :action "Classify intent, filter menu, format response"
         :detail "LLM classify -> deterministic filter -> LLM format -> WA send")
     (6  :actor :backend  :action "Resolve numbered selection against lastOffered"
         :detail "Cart mutation in Convex")
     (7  :actor :backend  :action "Create order on explicit confirm"
         :detail "status=PLACED. Convex subscription pushes to counter INSTANTLY.")
     (8  :actor :counter  :action "Confirm order"
         :detail "status=CONFIRMED, confirmedBy set. Callback message names the staff member.
                  Satisfies F-WA-003 and F-WA-005 in one transition.")
     (9  :actor :counter  :action "Mark ready" :detail "status=READY")
     (10 :actor :waiter   :action "Mark served"
         :detail "status=SERVED, serviceEvents row written — raw material for all analytics")
     (11 :actor :scheduler :action "Fire feedback prompt +10min"
         :detail "Feeds F-MGR-001, F-MGR-002, F-WTR-004")))

  (idempotency
    :problem "Meta retries webhooks up to 24h if no 200 is received"
    :key     "message.id (wamid)"
    :mechanism
    "Attempt insert into processedMessages with a unique index on wamid.
     Convex makes this atomic. Insert failure means retry — ACK 200 and drop."
    :table 'processedMessages))

;;; ═══════════════════════════════════════════════════════════════════════
;;; §4  FEATURES
;;; ═══════════════════════════════════════════════════════════════════════

(features

  ;; ─── INVENTORY ──────────────────────────────────────────────────────

  (feature :id F-INV-001 :phase :mvp :group :inventory
    :name "New restaurant onboarding"
    :goal "Zero to working menu in under five minutes"
    :flow
    ("Manager lands on empty-state menu screen"
     "Two paths: add items individually, or import a spreadsheet"
     "Manual path uses inline row-add with optimistic insert"
     "Category is free-text with autocomplete, no fixed taxonomy")
    :design-note
    "Kenyan restaurant categories are idiosyncratic (Nyama, Vipande,
     Soda Baridi). A fixed taxonomy would be wrong."
    :acceptance
    ("Empty state renders both CTAs without console errors"
     "New item appears in WhatsApp menu within 2 seconds"
     "Category autocomplete suggests existing values and allows new ones"))

  (feature :id F-INV-002 :phase :mvp :group :inventory
    :name "CSV / Excel upload with live preview"
    :mvp-scope  (:csv)
    :p2-scope   (:xlsx)
    :parser     "papaparse"
    :p2-parser  "sheetjs"
    :pipeline
    (:parse :heuristic-map :user-confirm :validate :preview :approve :commit)

    :column-mapper
    (:strategy :normalised-token-match
     :bilingual #t
     :targets
     ((:field :name      :tokens ("name" "item" "dish" "product" "jina"
                                  "chakula" "description"))
      (:field :price     :tokens ("price" "cost" "amount" "ksh" "kes" "bei"
                                  "rate" "sh"))
      (:field :category  :tokens ("category" "type" "section" "group" "aina" "menu"))
      (:field :quantity  :tokens ("qty" "quantity" "stock" "count" "idadi" "units"))
      (:field :unit      :tokens ("unit" "uom" "measure" "kipimo"))
      (:field :available :tokens ("available" "in stock" "status" "active" "ipo")))
     :note
     "Swahili tokens ship in the MVP mapper even though the full template
      UI (F-INV-004) is P2. Costs nothing, materially improves first-import
      accuracy in this market.")

    :price-normalisation
    (:strip ("currency symbols" "thousands separators" "whitespace")
     :accepts ("KES 1,200" "1200/-" "1200.00" "Ksh1200")
     :stores-as :integer-cents
     :example (:input "KES 1,200" :output 120000))

    :acceptance
    ("CSV with headers Jina,Bei,Aina maps with zero user input"
     "Non-numeric price is flagged error, not silently dropped"
     "Preview shows first 50 rows with total count displayed"
     "Import is atomic — all valid rows commit or none do"))

  (feature :id F-INV-003 :phase :p2 :group :inventory
    :name "Handwritten book image OCR"
    :problem-shape
    ("Kenyan restaurants track stock in exercise books"
     "Columns may or may not have ruled lines"
     "Handwriting varies widely"
     "Language mixes English and Swahili"
     "Units are inconsistent: 20kg, 15 bnd, 30pcs")

    :approach :vision-model
    :not-approach :classical-ocr
    :rationale
    "Tesseract fails on cursive and unruled columns. A vision model
     understands that 'Sukuma Wiki' is a vegetable and '15 bnd' means
     fifteen bundles."

    :pipeline
    ("Client-side downscale to max 1568px long edge (~4x token reduction)"
     "Upload to Cloudflare R2"
     "POST /api/ocr/extract"
     "Vision model with structured-output prompt"
     "JSON rows with per-row confidence"
     "Rows below 0.75 confidence flagged for review"
     "Reuse the F-INV-005 preview/approve UI"
     "Commit")

    :cost (:per-page-usd 0.03 :per-tenant-typical-usd 0.15 :recurrence :one-time)
    :fallback-ladder (:vision-model :paddleocr-selfhost :manual-entry)
    :fallback-principle "Always offer manual entry. Never trap a user in a
                         failed extraction.")

  (feature :id F-INV-004 :phase :p2 :group :inventory
    :name "Template mapping with EN/SW explanations"
    :design-intent
    "After auto-mapping, show each mapped column with a plain-language
     explanation of what the system will do with it, in the manager's chosen
     language. Manager can override any mapping. Mappings are saveable as
     named templates for repeat imports.")

  (feature :id F-INV-005 :phase :mvp :group :inventory
    :name "Preview, edit, approve workflow"
    :shared-by (F-INV-002 F-INV-003)
    :states (:parsing :mapping :preview :committing :done :failed)
    :row-status (:ok :warn :error)
    :row-status-meaning
    ((:ok    "All required fields present and valid")
     (:warn  "Optional field missing")
     (:error "Required field missing or invalid"))
    :commit-gate
    "Commit disabled while any error rows remain, with a count:
     '3 rows need attention.'"
    :acceptance
    ("Editing a cell re-runs validation for that row only"
     "Commit is blocked with errors present, and says why"
     "Cancelling discards everything with no partial writes"))

  (feature :id F-INV-006 :phase :mvp :group :inventory
    :name "Retain original column names"
    :mechanism
    "Every imported item stores sourceColumns: Record<string,string> —
     the raw header->value pairs from the source file."
    :rationale
    "Preserves information the canonical schema drops (a Supplier column,
     a Shelf column) and lets the manager see their own vocabulary."
    :ui "Collapsed 'Original data' section in the item detail drawer")

  (feature :id F-INV-007 :phase :mvp :group :inventory
    :name "Final data preview and upload"
    :shows (:total-rows :rows-to-insert :rows-to-update :rows-skipped
            :resulting-menu-size)
    :match-key "item name"
    :design-note
    "This is the last reversible moment and it should feel like one.
     Single primary action.")

  ;; ─── STOCK ──────────────────────────────────────────────────────────

  (feature :id F-STK-001 :phase :mvp :group :stock
    :name "Real-time stock updates"
    :goal "Stock state propagates to every surface within ~1 second"
    :mechanism :convex-reactive-queries
    :subscribers (:counter-dashboard :waiter-dashboard :whatsapp-bot)
    :critical-path
    "The bot must read availability at response-generation time, not from
     a cached menu snapshot. A diner must never be offered an item that
     went unavailable 30 seconds ago.")

  (feature :id F-STK-002 :phase :mvp :group :stock
    :name "Availability toggle"
    :significance "The single most-used control in the system"
    :usage-context
    "Counter staff hit this dozens of times per shift, often one-handed,
     on a phone, in a hurry."
    :interaction (:optimistic-ui #t :revert-on-failure #t :toast-on-failure #t)
    :design-requirements
    ((:touch-target "44x44px minimum")
     (:press-feedback "scale(0.96) on :active, mandatory")
     (:state-encoding "colour AND thumb position — never colour alone")
     (:keyboard "Space/Enter operable")
     (:aria "role=switch with aria-checked"))
    :bulk-action
    "Select all in category -> mark unavailable. When the kitchen runs out
     of ugali, everything ugali-based goes at once."
    :acceptance
    ("Toggle reflects in WhatsApp bot menu within 2s"
     "Failed mutation reverts the switch and shows a toast"
     "Keyboard operable, announces state to assistive tech"
     "Works at 44px target on a 375px viewport"))

  ;; ─── WHATSAPP ───────────────────────────────────────────────────────

  (feature :id F-WA-001 :phase :mvp :group :whatsapp
    :name "Natural conversation flow"
    :see-also 'conversation-engine
    :principles
    ((:deterministic-core
      "State transitions are code. The LLM classifies intent and writes
       prose; it never decides what happens next.")
     (:always-escapable
      "Every message accepts menu/help/waiter/cancel regardless of state.")
     (:numbered-lists
      "'2 and 5' is far more reliable to parse than 'the chicken one and
       the soda'.")
     (:short-messages
      "Max ~4 lines per message. Split long menus rather than sending a wall.")
     (:confirm-before-commit
      "Never create an order without an explicit affirmative in the
       immediately preceding turn.")))

  (feature :id F-WA-002 :phase :mvp :group :whatsapp
    :name "Smart recommendations"
    :inputs (:budget-ceiling :category :dietary-exclusions :availability
             :historical-ratings)
    :algorithm :deterministic
    :llm-role :formatting-only

    :filter-chain
    (:available :max-price :category :exclude-tags)

    :ranking
    (:method :bayesian-smoothed-rating
     :formula "(ratingSum + PRIOR_MEAN * PRIOR_WEIGHT) / (ratingCount + PRIOR_WEIGHT)"
     :prior-mean 3.5
     :prior-weight 5
     :rationale
     "Without smoothing, a single 5-star rating on a new item outranks a
      4.6-average item with 200 ratings.")

    :result-limit 3

    :empty-result-relaxation
    (:order (:drop-category :raise-budget-20-percent :never-drop-dietary)
     :note "Never silently violate a dietary exclusion. Say so instead."))

  (feature :id F-WA-003 :phase :mvp :group :whatsapp
    :name "Order placement, queuing, staff callback"
    :queue-semantics
    (:entry-state "PLACED"
     :ordering "placedAt ascending"
     :auto-confirm #f
     :rationale
     "A human must confirm. This is the anti-scam requirement's core —
      every order is human-verified before it reaches the kitchen.")
    :callback
    "On confirmation, the diner receives a message naming the confirming
     staff member. Closes the loop and creates accountability.")

  (feature :id F-WA-004 :phase :mvp :group :whatsapp
    :name "QR code table binding"
    :encoding "https://wa.me/<restaurant_wa_number>?text=TABLE-{NN}"
    :binding-regex "/^TABLE-(\\d{1,3})$/i"
    :generation
    (:where :manager-dashboard
     :library "qrcode"
     :render :client-side
     :output "A4 printable sheet, 6 per page, table number in large type, cut lines"
     :stored #f)
    :failure-mode
    "If a diner messages without the prefix, ask for a table number and
     validate against the tables list. Never assume.")

  (feature-group :id anti-scam :phase :mvp :group :whatsapp
    :covers (F-WA-005 F-WA-006 F-WA-007 F-WA-008)
    :name "Anti-scam verification chain"

    :threat-model
    "In a cash-heavy in-person restaurant, the realistic fraud is staff-side:
     an order served but not rung up, or rung up at a lower price. The
     countermeasure is that every order has a WhatsApp-originated paper trail
     with a customer phone attached, and every state transition names the
     staff member who caused it. The customer's phone becomes an independent
     witness."

    :measures
    ((:id F-WA-005 :measure "Waiter verification"
          :impl "Order requires staff confirm; confirmedBy foreign key")
     (:id F-WA-006 :measure "Table number input"
          :impl "QR prefill, or explicit prompt with validation")
     (:id F-WA-007 :measure "Customer name and details"
          :impl "Name captured before browsing; phone from WhatsApp")
     (:id F-WA-008 :measure "Timestamp recording"
          :impl "Immutable serviceEvents row per lifecycle step"))

    :append-only-guarantee
    (:table 'serviceEvents
     :enforcement
     "Enforced at the Convex function layer — there is simply no mutation
      exported that modifies an existing row."))

  (feature :id F-WA-009 :phase :mvp :group :whatsapp
    :name "Post-order automated feedback"
    :trigger (:type :convex-scheduled-function
              :delay-minutes 10
              :after "status = SERVED")
    :sequence (:rating :likes :dislikes :thanks)
    :rating-scale (1 5)
    :skip-token "skip"

    :item-attribution
    (:method :fuzzy-match
     :algorithm "Levenshtein ratio"
     :threshold 0.7
     :scope "items in that specific order only"
     :on-match "update menuItem ratingSum and ratingCount"
     :on-no-match "store free text on the feedback row for F-MGR-002")

    :rate-limiting
    (:per-order 1 :per-phone-per-hours 4))

  (feature :id F-WA-010 :phase :mvp :group :whatsapp
    :name "Marketing consent"
    :legal-basis "Kenya Data Protection Act 2019"
    :legal-note
    "Requires explicit, informed, revocable consent for marketing
     communications. Not a nice-to-have."
    :rules
    ((:timing "Asked once, after the first completed order, never before")
     (:explicit "Reply YES to opt in, NO to skip")
     (:default "Silence is NO. Never default to opted-in.")
     (:revocation "STOP at any point in any conversation revokes immediately")
     (:audit "Store consentedAt, consentText (exact wording shown), revokedAt"))
    :audit-rationale
    "consentText is the exact wording shown to the user. This is the record
     a regulator would ask for.")

  ;; ─── COUNTER ────────────────────────────────────────────────────────

  (feature :id F-CTR-001 :phase :mvp :group :counter
    :name "Order queue management"
    :layout
    (:columns
     ((:label "Incoming"   :statuses (PLACED))
      (:label "In Kitchen" :statuses (CONFIRMED PREPARING))
      (:label "Ready"      :statuses (READY)))
     :driven-by :convex-subscription)
    :card-contents
    (:table-number :customer-name :item-lines :total :elapsed-time)
    :visual-hierarchy "Table number is the largest element"
    :urgency-encoding
    (:thresholds ((:label :fresh  :max-minutes 5)
                  (:label :aging  :max-minutes 10)
                  (:label :urgent :max-minutes nil))
     :rendering "border accent colour"
     :pairing "always paired with the literal elapsed number"
     :rationale "Colour is the secondary cue, never the only one."))

  (feature :id F-CTR-002 :phase :mvp :group :counter
    :name "Complete or cancel orders"
    :actions (:confirm :cancel :mark-ready :mark-served)
    :cancel-requires :reason)

  (feature :id F-CTR-003 :phase :mvp :group :counter
    :name "Manual order creation"
    :use-case "Walk-ins and phone orders"
    :record-shape "Same as WhatsApp orders, source = MANUAL"
    :required (:table-number)
    :optional (:customer-name :customer-phone)
    :item-picker "Searchable, filtered to available items only, running total"
    :reuses "Same recommendation filter logic as the bot")

  (feature :id F-CTR-004 :phase :mvp :group :counter
    :name "Stock availability from counter"
    :component "Same toggle as manager menu screen"
    :placement :slide-over-panel
    :rationale
    "Counter staff never leave the order queue. The moment you discover
     you're out of something is while looking at an order for it.")

  (feature :id F-CTR-005 :phase :mvp :group :counter
    :name "Contact customer"
    :mechanism "Tap opens wa.me/<number> from the verified WABA number"
    :privacy-rule
    "No number is displayed in a way that could be copied to a personal
     device. The action is a link, not a phone number string.")

  ;; ─── WAITER ─────────────────────────────────────────────────────────

  (feature :id F-WTR-001 :phase :mvp :group :waiter
    :name "Assigned tables view"
    :scoping "Orders for tables assigned to this waiter in the current shift"
    :assignment-source 'tableAssignments
    :roster-integration :p2
    :form-factor
    (:primary :mobile-portrait
     :viewport "375-430px"
     :posture "moving, one hand"
     :layout "single column, large targets, no horizontal scroll at 375px"))

  (feature :id F-WTR-002 :phase :p2 :group :waiter
    :name "Roster / timetable integration"
    :design-intent
    "Shifts define time windows; table assignments inherit from the active
     shift; a waiter's dashboard scopes automatically by current time."
    :mvp-substitute "Manual assignment set by the manager")

  (feature :id F-WTR-003 :phase :mvp :group :waiter
    :name "Service timestamps"
    :writes-to 'serviceEvents
    :row-shape
    (:orderId :tableNumber :staffId :event :at :previousEvent :deltaMs)
    :denormalisation-note
    "deltaMs is denormalised deliberately — it makes every downstream
     analytic a simple aggregate instead of a self-join."
    :derived-metrics
    ((:name "time to confirm" :formula "CONFIRMED.at - order.placedAt")
     (:name "kitchen time"    :formula "READY.at - CONFIRMED.at")
     (:name "service time"    :formula "SERVED.at - READY.at")
     (:name "table turn"      :formula "CLOSED.at - order.placedAt")))

  (feature :id F-WTR-004 :phase :mvp :group :waiter
    :name "Waiter performance tracking"
    :mvp-scope
    (:metrics (:orders-served-today :median-service-time :average-rating)
     :visibility :self-only)
    :p2-scope :composite-ranking
    :deferral-rationale
    "A ranking algorithm that staff perceive as unfair is worse than no
     ranking. The composite needs real data to calibrate before it goes live."
    :proposed-p2-formula
    (:weights ((:inverse-median-service-time 0.40)
               (:mean-customer-rating        0.40)
               (:orders-handled              0.20))
     :normalisation :per-period-minmax
     :exclusion "waiters with fewer than 20 orders in the period"))

  ;; ─── MANAGER ────────────────────────────────────────────────────────

  (feature :id F-MGR-001 :phase :mvp :group :manager
    :name "Top-rated items"
    :ranking :bayesian-smoothed
    :minimum-ratings 5
    :columns (:item :category :smoothed-score :rating-count :orders-in-period))

  (feature :id F-MGR-002 :phase :mvp :group :manager
    :name "Low-rated items with reasons"
    :ranking "Same as F-MGR-001, inverted"
    :additional "Free-text dislike comments attached to each item"
    :rationale
    "The comments are the actionable part. 'Chapati was cold' tells the
     manager something '2.1 stars' does not.")

  (feature :id F-MGR-003 :phase :p2 :group :manager
    :name "Categorized improvement summaries"
    :design-intent
    "LLM clusters free-text feedback into themes (temperature, portion,
     speed, taste, price) and produces a weekly digest with counts and
     representative quotes.")

  (feature :id F-MGR-004 :phase :mvp :group :manager
    :name "Order patterns by day"
    :views
    ((:type :line :x "day" :y "order count" :range "selected period")
     (:type :bar  :x "hour of day" :y "average order count"))
    :operational-value
    "The hourly view is the useful one — it tells the manager when to
     schedule staff.")

  (feature :id F-MGR-005 :phase :mvp :group :manager
    :name "Table performance"
    :metrics (:total-orders :total-revenue :average-turn-time :average-rating)
    :peak-detection "Hour bucket with highest order count, per table"
    :interpretation
    "Identifies both best-performing tables (replicate the conditions) and
     slow ones (investigate: bad location, poor waiter coverage).")

  (feature :id F-MGR-006 :phase :p2 :group :manager
    :name "Waiter ranking"
    :see 'F-WTR-004)

  (feature :id F-MGR-007 :phase :p2 :group :manager
    :name "Daily / weekly reports"
    :design-intent
    "Scheduled generation, PDF export, optional WhatsApp delivery to the
     owner's number."
    :note "All data exists in MVP. This is a presentation layer.")

  (feature :id F-MGR-008 :phase :mvp :group :manager
    :name "Add new dishes"
    :implemented-by 'F-INV-001)

  (feature :id F-MGR-009 :phase :p2 :group :manager
    :name "Create offers"
    :blocked-by 'F-MGR-010)

  (feature :id F-MGR-010 :phase :p2 :group :manager
    :name "Broadcast to opted-in users"
    :external-dependency
    (:what "Meta pre-approved message templates"
     :lead-time "24-48 hours"
     :nature :process-not-code
     :consequence
     "This is P2 rather than MVP because it cannot be built in hours
      regardless of engineering effort.")
    :constraints
    ((:respect-opt-in 'F-WA-010)
     (:respect-meta-rate-limits #t)
     (:self-imposed-max "one broadcast per opted-in user per week")))

  (feature :id F-MGR-011 :phase :mvp :group :manager
    :name "User management"
    :operations (:add :assign-role :enable :disable :delete)
    :roles (OWNER MANAGER COUNTER WAITER)
    :enforcement "Role determines route access via Next.js middleware"
    :deletion
    (:type :soft
     :fields (:disabled :disabledAt)
     :rationale
     "Hard deletion would orphan serviceEvents rows and break the audit
      trail that F-WA-008 exists to create. A deleted staff member's
      historical actions remain attributable."))

  (feature :id F-MGR-012 :phase :mvp :group :manager
    :name "Table allocation"
    :defines (:number :seat-count :zone)
    :assigns "waiters to tables"
    :feeds 'F-WTR-001)

  (feature :id F-MGR-013 :phase :p2 :group :manager
    :name "Roster management"
    :deferred-with 'F-WTR-002))

;;; ═══════════════════════════════════════════════════════════════════════
;;; §5  DATA MODEL
;;; ═══════════════════════════════════════════════════════════════════════

(data-model

  (principles
    ((:id :multi-tenant-from-day-one
      :rule "Every operational table carries restaurantId, even though MVP
             has one restaurant."
      :rationale "Retrofitting tenancy is expensive. Carrying an unused
                  column is free.")
     (:id :money-as-integer-cents
      :rule "priceCents: number. Never floats."
      :example "KES 1,200.50 is 120050")
     (:id :time-as-epoch-ms
      :rule "number, not Date, not ISO string"
      :rationale "Convex stores numbers efficiently; comparison is trivial")
     (:id :append-only-where-it-matters
      :tables (serviceEvents feedback processedMessages consentLog)
      :rule "Never updated, never deleted")
     (:id :denormalise-for-read
      :rule "Order items snapshot name and price at order time"
      :rationale "If the manager changes a price tomorrow, yesterday's order
                  still shows what the customer actually paid")))

  ;; ─── CONVEX (HOT STORE) ─────────────────────────────────────────────

  (convex-schema

    (table restaurants
      :fields
      ((name            :string)
       (waPhoneNumberId :string  :note "Meta's phone_number_id")
       (waDisplayNumber :string  :note "E.164, for wa.me links")
       (currency        :string  :default "KES")
       (timezone        :string  :default "Africa/Nairobi")
       (active          :boolean)
       (createdAt       :number))
      :indexes ((by_wa_phone_id (waPhoneNumberId))))

    (table staff
      :fields
      ((restaurantId :id-restaurants)
       (name         :string)
       (phone        :string :note "E.164")
       (email        :optional-string)
       (role         :union (OWNER MANAGER COUNTER WAITER))
       (disabled     :boolean)
       (disabledAt   :optional-number)
       (createdAt    :number))
      :indexes ((by_restaurant      (restaurantId))
                (by_phone           (phone))
                (by_restaurant_role (restaurantId role))))

    (table tables
      :fields
      ((restaurantId :id-restaurants)
       (number       :number :note "7 renders as TABLE-07")
       (seats        :number)
       (zone         :optional-string :example "Terrace")
       (active       :boolean))
      :indexes ((by_restaurant        (restaurantId))
                (by_restaurant_number (restaurantId number))))

    (table tableAssignments
      :fields
      ((restaurantId :id-restaurants)
       (tableId      :id-tables)
       (staffId      :id-staff)
       (assignedAt   :number)
       (unassignedAt :optional-number))
      :indexes ((by_staff_active (staffId unassignedAt))
                (by_table_active (tableId unassignedAt))))

    (table menuItems
      :fields
      ((restaurantId  :id-restaurants)
       (name          :string)
       (description   :optional-string)
       (category      :string)
       (priceCents    :number)
       (available     :boolean)
       (tags          :array-string :example ("vegetarian" "spicy" "meat"))
       (quantity      :optional-number :note "nullable — many items are made-to-order")
       (unit          :optional-string)
       (ratingSum     :number :note "aggregate, updated by feedback mutations")
       (ratingCount   :number)
       (sourceColumns :optional-record :note "F-INV-006: raw header->value from import")
       (createdAt     :number)
       (updatedAt     :number))
      :indexes ((by_restaurant           (restaurantId))
                (by_restaurant_available (restaurantId available))
                (by_restaurant_category  (restaurantId category)))
      :search-indexes
      ((search_name :field name :filter-fields (restaurantId available))))

    (table sessions
      :fields
      ((restaurantId  :id-restaurants)
       (phone         :string :note "E.164 — the session key")
       (state         :union (AWAITING_TABLE AWAITING_NAME BROWSING
                              CART_REVIEW CONFIRMING ORDER_PLACED
                              AWAITING_FEEDBACK_RATING
                              AWAITING_FEEDBACK_LIKES
                              AWAITING_FEEDBACK_DISLIKES
                              IDLE))
       (tableNumber   :optional-number)
       (customerName  :optional-string)
       (cart          :array-object
                      :shape (menuItemId name priceCents qty))
       (lastOffered   :array-id-menuItems
                      :note "The last numbered list sent, so '2 and 5' resolves")
       (activeOrderId :optional-id-orders)
       (lastMessageAt :number)
       (expiresAt     :number :note "lastMessageAt + 30 min")
       (createdAt     :number))
      :indexes ((by_phone  (phone))
                (by_expiry (expiresAt))))

    (table orders
      :fields
      ((restaurantId  :id-restaurants)
       (orderNumber   :number :note "human-facing, per-restaurant sequence")
       (tableNumber   :number)
       (customerName  :optional-string)
       (customerPhone :optional-string)
       (status        :union (PLACED CONFIRMED PREPARING READY
                              SERVED CLOSED CANCELLED))
       (source        :union (WHATSAPP MANUAL))
       (items         :array-object
                      :shape (menuItemId name priceCents qty notes)
                      :note "name and priceCents are snapshots at order time")
       (totalCents    :number)
       (confirmedBy   :optional-id-staff  :note "F-WA-005 attribution")
       (servedBy      :optional-id-staff)
       (cancelledBy   :optional-id-staff)
       (cancelReason  :optional-string)
       (placedAt      :number)
       (confirmedAt   :optional-number)
       (readyAt       :optional-number)
       (servedAt      :optional-number)
       (closedAt      :optional-number)
       (feedbackRequestedAt :optional-number))
      :indexes ((by_restaurant_status (restaurantId status))
                (by_restaurant_placed (restaurantId placedAt))
                (by_table             (restaurantId tableNumber))
                (by_phone             (customerPhone))
                (by_order_number      (restaurantId orderNumber))))

    (table serviceEvents
      :append-only #t
      :fields
      ((restaurantId  :id-restaurants)
       (orderId       :id-orders)
       (tableNumber   :number)
       (staffId       :optional-id-staff)
       (event         :string :note "matches order status values")
       (previousEvent :optional-string)
       (deltaMs       :optional-number)
       (at            :number))
      :indexes ((by_order         (orderId))
                (by_restaurant_at (restaurantId at))
                (by_staff_at      (staffId at))))

    (table feedback
      :append-only #t
      :fields
      ((restaurantId    :id-restaurants)
       (orderId         :id-orders)
       (tableNumber     :number)
       (servedBy        :optional-id-staff)
       (rating          :number :range (1 5))
       (likedText       :optional-string)
       (dislikedText    :optional-string)
       (likedItemIds    :array-id-menuItems)
       (dislikedItemIds :array-id-menuItems)
       (at              :number))
      :indexes ((by_restaurant_at (restaurantId at))
                (by_order         (orderId))
                (by_staff         (servedBy))))

    (table consentLog
      :append-only #t
      :fields
      ((restaurantId :id-restaurants)
       (phone        :string)
       (granted      :boolean)
       (consentText  :string :note "exact wording shown to the user")
       (at           :number))
      :indexes ((by_phone_at (phone at))))

    (table processedMessages
      :append-only #t
      :purpose :idempotency
      :fields
      ((wamid :string :note "Meta's message id")
       (at    :number))
      :indexes ((by_wamid (wamid))))

    (table importJobs
      :fields
      ((restaurantId   :id-restaurants)
       (startedBy      :id-staff)
       (kind           :union (CSV XLSX OCR))
       (status         :union (PARSING MAPPING PREVIEW COMMITTING DONE FAILED))
       (sourceFileName :optional-string)
       (rowsTotal      :number)
       (rowsValid      :number)
       (rowsCommitted  :number)
       (columnMapping  :optional-record)
       (error          :optional-string)
       (createdAt      :number)
       (completedAt    :optional-number))
      :indexes ((by_restaurant (restaurantId)))))

  ;; ─── COCKROACHDB (COLD STORE) ───────────────────────────────────────

  (cockroach-schema
    :pattern :star-schema
    :mvp-status :provisioned-migrated-not-in-read-path
    :populated-by "nightly rollup (P2)"

    (dimensions
      (dim_restaurant (restaurant_id name timezone currency))
      (dim_staff      (staff_id restaurant_id name role disabled))
      (dim_menu_item  (menu_item_id restaurant_id name category price_cents
                       valid_from valid_to)
                      :scd-type 2
                      :note "Type 2 preserves price history"))

    (facts
      (fact_order
        :grain "one row per order"
        :measures (total_cents item_count
                   secs_to_confirm secs_in_kitchen secs_to_serve secs_total_turn)
        :degenerate (order_number table_number status source)
        :fks (restaurant_id confirmed_by served_by)
        :time (placed_at confirmed_at ready_at served_at closed_at
               order_date order_hour order_dow)
        :denormalisation-note
        "Precomputed durations make every downstream query a simple aggregate.
         order_hour and order_dow are restaurant-local, denormalised for fast
         GROUP BY.")

      (fact_order_item
        :grain "one row per line item"
        :measures (qty price_cents line_total)
        :note "price_cents is a snapshot, not a join to dim_menu_item")

      (fact_feedback
        :grain "one row per feedback submission"
        :measures (rating)
        :text (liked_text disliked_text))

      (fact_service_event
        :grain "one row per lifecycle transition"
        :measures (delta_ms))))

  (representative-queries
    ((:id :orders-by-hour :feature F-MGR-004
      :sql "SELECT order_hour, COUNT(*) AS orders,
                   ROUND(AVG(total_cents)/100.0, 2) AS avg_ticket_kes
            FROM fact_order
            WHERE restaurant_id = $1
              AND order_date >= current_date - INTERVAL '30 days'
              AND status <> 'CANCELLED'
            GROUP BY order_hour ORDER BY order_hour")

     (:id :table-performance :feature F-MGR-005
      :technique "CTE + ROW_NUMBER() window for peak-hour detection")

     (:id :item-ratings :feature (F-MGR-001 F-MGR-002)
      :technique "Bayesian smoothing: (sum + 3.5*5) / (count + 5), min 5 ratings"))))

;;; ═══════════════════════════════════════════════════════════════════════
;;; §6  API CONTRACT
;;; ═══════════════════════════════════════════════════════════════════════

(api-contract
  :base-url "https://api.heavenlyfoods.workers.dev"
  :content-type "application/json"
  :auth "Authorization: Bearer <session_token> on /api/*"
  :webhook-auth "Meta HMAC signature, not bearer token"
  :correlation-header "X-Request-Id"

  :error-shape
  (:error (:code :string :message :string :details :object))

  (endpoints

    (group :webhook
      (endpoint :method GET :path "/webhook/whatsapp"
        :purpose "Meta verification handshake"
        :query ((hub.mode :required "must equal 'subscribe'")
                (hub.verify_token :required "must match WA_VERIFY_TOKEN")
                (hub.challenge :required "echoed back as plain text 200"))
        :returns (200 "challenge as text/plain")
        :errors  (403 "token mismatch"))

      (endpoint :method POST :path "/webhook/whatsapp"
        :purpose "Inbound WhatsApp messages"
        :security
        (:header "X-Hub-Signature-256"
         :algorithm "HMAC-SHA256"
         :implementation "Web Crypto (Workers has no Node crypto)"
         :comparison :constant-time
         :verify-before-parse #t)
        :behaviour
        (:ack-target-ms 50
         :ack-unconditional #t
         :processing "ctx.waitUntil()"
         :note "Meta does not inspect the 200 body")))

    (group :menu
      (endpoint :method GET    :path "/api/menu"                  :auth :any-staff)
      (endpoint :method GET    :path "/api/menu/:id"              :auth :any-staff)
      (endpoint :method POST   :path "/api/menu"                  :auth :manager+)
      (endpoint :method PATCH  :path "/api/menu/:id"              :auth :manager+)
      (endpoint :method PATCH  :path "/api/menu/:id/availability" :auth :counter+
                :request  (:available :boolean)
                :response (:id :name :available :updatedAt))
      (endpoint :method POST   :path "/api/menu/bulk-availability" :auth :counter+)
      (endpoint :method DELETE :path "/api/menu/:id"              :auth :manager+
                :semantics :soft-delete)
      (endpoint :method POST   :path "/api/menu/import"           :auth :manager+))

    (group :orders
      (endpoint :method GET  :path "/api/orders"             :auth :any-staff)
      (endpoint :method GET  :path "/api/orders/:id"         :auth :any-staff)
      (endpoint :method POST :path "/api/orders"             :auth :counter+)
      (endpoint :method POST :path "/api/orders/:id/confirm" :auth :counter+)
      (endpoint :method POST :path "/api/orders/:id/ready"   :auth :counter+)
      (endpoint :method POST :path "/api/orders/:id/serve"   :auth :waiter+)
      (endpoint :method POST :path "/api/orders/:id/close"   :auth :waiter+)
      (endpoint :method POST :path "/api/orders/:id/cancel"  :auth :counter+
                :request (:reason :string :required)))

    (group :analytics
      :auth :manager+
      :common-query "?from=<epoch>&to=<epoch>, defaults to last 30 days"
      (endpoint :method GET :path "/api/analytics/overview")
      (endpoint :method GET :path "/api/analytics/items")
      (endpoint :method GET :path "/api/analytics/tables")
      (endpoint :method GET :path "/api/analytics/staff")
      (endpoint :method GET :path "/api/analytics/patterns")))

  (order-state-machine
    :states (PLACED CONFIRMED PREPARING READY SERVED CLOSED CANCELLED)
    :initial PLACED
    :terminal (CLOSED CANCELLED)
    :transitions
    ((PLACED    -> CONFIRMED :via confirm :actor :counter+)
     (CONFIRMED -> PREPARING :via prepare :actor :counter+)
     (CONFIRMED -> READY     :via ready   :actor :counter+)
     (PREPARING -> READY     :via ready   :actor :counter+)
     (READY     -> SERVED    :via serve   :actor :waiter+)
     (SERVED    -> CLOSED    :via close   :actor :waiter+)
     (PLACED    -> CANCELLED :via cancel  :actor :counter+)
     (CONFIRMED -> CANCELLED :via cancel  :actor :counter+)
     (PREPARING -> CANCELLED :via cancel  :actor :counter+)
     (READY     -> CANCELLED :via cancel  :actor :counter+))
    :validation :server-side
    :invalid-transition-response (409 "INVALID_TRANSITION" :includes-current-status #t))

  (rate-limits
    ((:scope "inbound WA per phone"      :limit "20/min"  :enforcement "Convex counter + TTL")
     (:scope "/api/* per staff token"    :limit "120/min" :enforcement "Workers KV counter")
     (:scope "outbound WA per recipient" :limit "1/2s"    :enforcement "in-worker queue delay")
     (:scope "feedback prompt per phone" :limit "1/4h"    :enforcement "checked before send"))))

;;; ═══════════════════════════════════════════════════════════════════════
;;; §7  CONVERSATION ENGINE
;;; ═══════════════════════════════════════════════════════════════════════

(conversation-engine

  (architecture
    :pattern "deterministic core, LLM periphery"
    :pipeline
    ((1 :stage :global-commands :type :regex
        :note "checked first, in every state; short-circuits on match")
     (2 :stage :state-handler   :type :deterministic
        :note "switch on session.state")
     (3 :stage :llm-classify    :type :llm :access :read-only
        :note "free text -> {intent, slots}, closed intent set, JSON output")
     (4 :stage :business-logic  :type :deterministic
        :note "queries Convex, applies rules, performs mutations")
     (5 :stage :llm-format      :type :llm :access :read-only :optional #t
        :note "structured result -> friendly prose; templates preferred")
     (6 :stage :send            :type :io))

    :invariant
    "The LLM never mutates. It receives read-only context and returns either
     a classification or a string. Every database write is a TypeScript
     function with validated arguments.")

  (global-commands
    :checked :before-state-logic
    :available-in :every-state
    :commands
    (((:en "menu"   :sw "orodha")  :effect "send category list, state -> BROWSING")
     ((:en "help"   :sw "msaada")  :effect "send command help")
     ((:en "waiter" :sw "mhudumu") :effect "flag for staff attention, notify counter")
     ((:en "cancel" :sw "ghairi")  :effect "clear cart, state -> BROWSING")
     ((:en "stop")                 :effect "revoke marketing consent, confirm")
     ((:en "status")               :effect "report current order status if one exists")))

  (state-machine
    :key "phone number (E.164)"
    :ttl-minutes 30
    :ttl-effect "state -> IDLE, cart cleared"
    :ttl-enforcement "Convex scheduled function scanning by_expiry index"

    :states
    ((AWAITING_TABLE
      :entry "new phone, or session reset"
      :expects "TABLE-NN or a bare number"
      :on-match "bind tableNumber, -> AWAITING_NAME"
      :on-invalid "re-prompt, max 3 attempts")

     (AWAITING_NAME
      :expects "any non-empty text"
      :on-match "store customerName, -> BROWSING")

     (BROWSING
      :expects "category selection, budget query, or item query"
      :intents (BROWSE_CATEGORY RECOMMEND ASK_PRICE ASK_AVAILABILITY ADD_TO_CART)
      :on-add "-> CART_REVIEW")

     (CART_REVIEW
      :expects "confirm, add more, or remove"
      :intents (CONFIRM_ORDER ADD_TO_CART REMOVE_FROM_CART VIEW_CART)
      :on-confirm "-> CONFIRMING"
      :on-add-more "-> BROWSING")

     (CONFIRMING
      :expects "explicit yes/no"
      :on-yes "create order, -> ORDER_PLACED"
      :on-no  "-> CART_REVIEW")

     (ORDER_PLACED
      :terminal-until "feedback trigger or new order")

     (AWAITING_FEEDBACK_RATING
      :entry "scheduled, +10min after SERVED"
      :expects "1-5"
      :on-match "-> AWAITING_FEEDBACK_LIKES")

     (AWAITING_FEEDBACK_LIKES
      :expects "free text or skip"
      :on-any "-> AWAITING_FEEDBACK_DISLIKES")

     (AWAITING_FEEDBACK_DISLIKES
      :expects "free text or skip"
      :on-any "write feedback row, -> IDLE")

     (IDLE
      :entry "TTL expiry or feedback complete"
      :on-any-message "-> AWAITING_TABLE or resume")))

  (intent-set
    :closed #t
    :unknown-fallback UNKNOWN
    :intents
    ((BROWSE_CATEGORY  :slots (category))
     (RECOMMEND        :slots (maxPriceCents category exclude))
     (ADD_TO_CART      :slots (selections qty))
     (REMOVE_FROM_CART :slots (selections))
     (VIEW_CART        :slots ())
     (CONFIRM_ORDER    :slots ())
     (ASK_PRICE        :slots (itemQuery))
     (ASK_AVAILABILITY :slots (itemQuery))
     (SMALL_TALK       :slots ())
     (UNKNOWN          :slots ())))

  (classification-prompt
    :output-format :json-only
    :no-markdown #t
    :no-code-fences #t
    :validation :zod
    :retry-on-parse-failure 1
    :fallback-after-retry UNKNOWN

    :localisation-rules
    (("Kenyan slang for money: 'bob' = KES. '500 bob' -> maxPriceCents 50000")
     ("'K' suffix means thousands: '2K' -> 200000 cents")
     ("Swahili: nataka = I want, bei = price, chakula = food,
       nyama = meat, samaki = fish, mboga = vegetables"))

    :disambiguation-rules
    (("Bare numbers after a numbered list was sent -> ADD_TO_CART with
       those numbers as selections")
     ("Dietary exclusions go in exclude as lowercase tags:
       meat, pork, beef, chicken, fish, dairy, gluten, nuts")
     ("When genuinely unclear, return UNKNOWN. Do not guess."))

    :context-injected (LAST_OFFERED CATEGORIES MESSAGE))

  (message-templates
    :preference "deterministic templates over LLM generation"
    :rationale "faster, free, never hallucinate"
    :llm-used-when "genuine variability improves the response"
    :max-lines-per-message 4
    :keys
    (greetTable askTable askName categoryList itemList cartSummary
     orderPlaced orderConfirmed outOfStock askRating askLikes askDislikes
     feedbackDone consentAsk))

  (failure-handling
    ((:failure "LLM timeout >3s"
      :response "Fall back to numbered category menu, no error shown to user")
     (:failure "LLM returns invalid JSON"
      :response "Retry once, then send a clarifying question")
     (:failure "Item went unavailable mid-conversation"
      :response "outOfStock template + recommend 2 alternatives")
     (:failure "3 consecutive UNKNOWN intents"
      :response "Offer human handoff: 'Reply *waiter* for help'")
     (:failure "WhatsApp send returns 5xx"
      :response "Retry x3 with backoff 1s/3s/9s, then log and drop")
     (:failure "Convex mutation fails"
      :response "Do not send success message. Apologise, ask to retry."))))

;;; ═══════════════════════════════════════════════════════════════════════
;;; §8  DESIGN SYSTEM
;;; ═══════════════════════════════════════════════════════════════════════

(design-system
  :derived-from "supplied reference design specification"
  :philosophy
  "Reverent content presentation framed by near-invisible UI. Translated
   from a marketing catalogue to an operations console."

  (principles
    ((:id :data-is-the-product
      :statement "An order card is the artifact. Chrome recedes.")
     (:id :surface-change-is-the-divider
      :statement "Alternating surface tones separate regions instead of
                  borders and shadows.")
     (:id :one-accent-universally
      :statement "A single interactive colour carries every actionable
                  element. There is no second accent.")
     (:id :shadow-is-reserved
      :statement "Exactly one elevation treatment exists, used sparingly.
                  Not on cards, not on buttons.")
     (:id :typography-confident-but-quiet
      :statement "Negative tracking at display sizes, generous body leading,
                  a weight ladder that skips 500."))

    :adaptation-note
    "The reference optimises for a marketing catalogue viewed at leisure.
     This system optimises for a counter tablet in a loud room and a
     waiter's phone held one-handed.")

  (tokens

    (colour
      (accent
        (--hf-accent         "#0066cc" :role "the single interactive colour")
        (--hf-accent-focus   "#0071e3" :role "focus ring only")
        (--hf-accent-on-dark "#2997ff" :role "links on dark surfaces"))

      (surface
        (--hf-canvas        "#ffffff")
        (--hf-canvas-alt    "#f5f5f7" :role "parchment — the rhythm surface")
        (--hf-surface-pearl "#fafafc" :role "ghost button fill")
        (--hf-tile-1        "#272729")
        (--hf-tile-2        "#2a2a2c")
        (--hf-tile-3        "#252527")
        (--hf-void          "#000000" :role "top nav only"))

      (ink
        (--hf-ink               "#1d1d1f" :note "not pure black — photographic")
        (--hf-ink-80            "#333333")
        (--hf-ink-48            "#7a7a7a")
        (--hf-ink-on-dark       "#ffffff")
        (--hf-ink-muted-on-dark "#cccccc"))

      (hairline
        (--hf-divider-soft "rgba(0,0,0,0.04)")
        (--hf-hairline     "#e0e0e0"))

      (status
        :classification :functional-not-brand
        (--hf-status-fresh  "#1d9e75" :threshold "<5min")
        (--hf-status-aging  "#ba7517" :threshold "5-10min")
        (--hf-status-urgent "#d85a30" :threshold ">10min")))

    (elevation
      (--hf-shadow-object "rgba(0,0,0,0.22) 3px 5px 30px 0")
      :count 1
      :rule "The single shadow is for object elevation, never UI hierarchy.")

    (radius
      (--hf-r-none 0)  (--hf-r-sm 8) (--hf-r-md 11)
      (--hf-r-lg 18)   (--hf-r-pill 9999)
      :grammar
      ((:sm   "compact utility buttons, inline card imagery")
       (:md   "pearl capsule buttons")
       (:lg   "cards, panels")
       (:pill "primary actions, toggles, search — the action signal")
       (:none "full-bleed sections"))
      :rule "Do not mix grammars. No intermediate values.")

    (spacing
      :base 8
      (--hf-sp-xxs 4)  (--hf-sp-xs 8)   (--hf-sp-sm 12)
      (--hf-sp-md 17)  (--hf-sp-lg 24)  (--hf-sp-xl 32)
      (--hf-sp-xxl 48) (--hf-sp-sect 80))

    (motion
      (--hf-dur-instant "90ms")
      (--hf-dur-fast    "160ms")
      (--hf-dur-base    "240ms")
      (--hf-dur-slow    "400ms")
      (--hf-ease-out    "cubic-bezier(0.22, 1, 0.36, 1)")
      (--hf-ease-spring "linear(...)" :note "approximates a spring; CSS has no native spring")))

  (typography
    :display-family "system-ui, -apple-system, BlinkMacSystemFont, Inter, sans-serif"
    :substitute-notes
    ("On Apple platforms system-ui resolves to the real system display face"
     "Inter is the closest open substitute elsewhere"
     "Tighten tracking by -0.01em at display sizes when substituting"
     "Reduce body leading by 0.03 to compensate for Inter's taller x-height")

    :scale
    ((hero        :size 56 :weight 600 :lh 1.07 :tracking "-0.28px"  :use "landing hero only")
     (display-lg  :size 40 :weight 600 :lh 1.10 :tracking "0"        :use "KPI values")
     (display-md  :size 34 :weight 600 :lh 1.47 :tracking "-0.374px" :use "section heads")
     (lead        :size 28 :weight 400 :lh 1.14 :tracking "0.196px"  :use "table number on order card")
     (lead-airy   :size 24 :weight 300 :lh 1.5  :tracking "0"        :use "empty-state copy")
     (tagline     :size 21 :weight 600 :lh 1.19 :tracking "0.231px"  :use "column headers")
     (body-strong :size 17 :weight 600 :lh 1.24 :tracking "-0.374px" :use "item names")
     (body        :size 17 :weight 400 :lh 1.47 :tracking "-0.374px" :use "default paragraph")
     (dense-link  :size 17 :weight 400 :lh 2.41 :tracking "0"        :use "sidebar nav stacks")
     (caption     :size 14 :weight 400 :lh 1.43 :tracking "-0.224px" :use "metadata, buttons")
     (caption-str :size 14 :weight 600 :lh 1.29 :tracking "-0.224px" :use "emphasised captions")
     (fine-print  :size 12 :weight 400 :lh 1.0  :tracking "-0.12px"  :use "timestamps, legal")
     (micro       :size 10 :weight 400 :lh 1.3  :tracking "-0.08px"  :use "micro legal only"))

    :inviolable-rules
    (("Body copy is 17px, not 16px — the extra pixel sets the reading pace")
     ("Weight ladder is 300/400/600/700. Weight 500 does not exist.")
     ("Negative tracking at 17px and above only. Never at 12px or below.")
     ("Sentence case everywhere. Never Title Case, never ALL CAPS."))

    :operational-adaptations
    (("Table numbers use lead (28px) — legible from a metre away")
     ("Elapsed-time values use tabular-nums so digits don't shift as seconds tick")))

  (modern-css
    :posture "progressive enhancement with graceful bases"

    (technique :id :light-dark
      :feature "light-dark()"
      :status :baseline
      :use "colour values that differ by scheme"
      :limitation "colours only")

    (technique :id :scheme-boolean
      :feature "custom property + style query"
      :use "non-colour properties that must differ by scheme"
      :pattern
      "Set --hf-scheme: light on :root, override to dark in a
       prefers-color-scheme media query, then branch with
       @container style(--hf-scheme: dark)"
      :example-use "drop font-weight 600 -> 400 on dark surfaces, where
                    type reads heavier"
      :note "works in stable browsers today without @function")

    (technique :id :contrast-color
      :feature "contrast-color()"
      :status :stable-all-browsers
      :use "derive foreground for data-driven tinted chips"
      :limitation "returns only black or white; uses WCAG2 algorithm"
      :extension-pattern
      "Register a @property, assign contrast-color() to it, then branch with
       @container style(--hf-contrast: white) to substitute softer tones
       than pure black/white")

    (technique :id :transparent-half-elevation
      :feature "light-dark() with transparent"
      :use "one box-shadow declaration serving both schemes"
      :pattern
      "Six shadow values where the first three are visible in light and the
       second three in dark, with the unused half set to transparent"
      :application "light-mode drop shadow, dark-mode inset ring tinted from
                    the card's own background via relative colour syntax")

    (technique :id :scroll-state-queries
      :feature "@container scroll-state()"
      :status :chrome-only
      :posture :progressive-enhancement
      :use "auto-hiding counter dashboard header"
      :states-used (scrolled:none scrolled:top scrolled:bottom)
      :idiom
      "@container not scroll-state(scrolled: none) reads as 'a scroll has
       happened' — the idiom for switching from static to sticky only after
       the user begins scrolling"
      :fallback "header stays put, which is the current behaviour and
                 perfectly usable")

    (technique :id :scroll-driven-animation
      :feature "animation-timeline: view()"
      :use "reveal analytics charts as they enter the viewport"
      :guard "@supports + prefers-reduced-motion: no-preference")

    (technique :id :sibling-index
      :feature "sibling-index()"
      :use "staggered entry for order cards"
      :delay-per-item "40ms"
      :cap-note "40ms x 12 cards = 480ms, at the edge of acceptable.
                 Clamp for longer lists."
      :rationale "Cards entering all at once is visually flat. Staggering
                  guides the eye through the list in reading order.")

    (technique :id :view-transitions
      :feature "startViewTransition, scoped"
      :use "order card morphing between queue columns"
      :scoped-rationale
      "The counter dashboard has a live subscription pushing updates
       constantly. A document-scoped transition would freeze the whole page
       every time any order changed."
      :naming "view-transition-name set inline per order id")

    (technique :id :directional-counter
      :feature "view transitions + direction custom property"
      :use "orders-today counter rolls up on increment, down on decrement"
      :rationale "A directionless cross-fade throws away information the
                  user could have got for free")

    (technique :id :motion-blur-substitute
      :feature "filter: blur() mid-keyframe"
      :use "approximate the sense of travel"
      :caution "expensive to composite; single elements only, never list items")

    (technique :id :popover
      :feature "popover attribute"
      :provides (:light-dismiss :escape-binding :focus-management :top-layer)
      :use "item detail panels")

    (technique :id :interest-invokers
      :feature "interestfor attribute"
      :status :chrome-shipped-spec-in-discussion
      :polyfill-available #t
      :polyfill-gap "mobile long-press interaction"
      :use "waiter hovering a table cell sees recent order history"
      :popover-type "hint"
      :hint-rationale
      "A hint popover does not dismiss other open popovers. A tooltip
       appearing should not close the panel the user was reading."
      :ux-tuning
      "The 0.5s UA delay is right for the first item in a group and wrong
       for subsequent ones. Once the user is exploring a toolbar, delay
       feels like lag. Set interest-delay-start: 0s on siblings when any
       sibling has :interest-source.")

    (technique :id :anchor-positioning
      :feature "anchor-name / position-anchor / position-area"
      :status "in every modern browser, not yet baseline"
      :use (:popover-placement :dynamic-refollowing-indicator)
      :fallbacks "position-try-fallbacks: flip-block, flip-inline")

    (technique :id :container-queries
      :feature "@container inline-size"
      :preference "over media queries for component responsiveness"
      :rationale "Order cards appear in three different layouts. They should
                  respond to their container, not the viewport.")

    (technique :id :scroll-snap-swipe
      :feature "scroll-snap-type + overscroll-behavior"
      :use "swipe-to-dismiss panels on waiter mobile"
      :rationale "No gesture library, no touch-event handling. Waiters expect
                  to swipe panels away; a scroller with snap points gives
                  this for free."))

  (motion-principles
    ((:id :feedback-always
      :statement "A tap that produces no visible response reads as broken,
                  and the user taps again — creating duplicate orders.")
     (:id :animate-from-source
      :statement "A panel opening from a button should originate at that
                  button, not fade in from nowhere.")
     (:id :approximate-physics
      :statement "CSS has no native spring, but linear() easing approximates
                  one closely enough to feel right.")
     (:id :motion-directs-attention
      :statement "Movement is the strongest attention cue available.
                  Spend it on things that matter.")
     (:id :reduced-not-zero
      :statement "prefers-reduced-motion means reduced, not none. Preserve
                  the feedback signal, shorten the duration."
      :example "press feedback shrinks from scale(0.95) to scale(0.98)
                rather than disappearing")))

  (components
    ((:id :btn-primary
      :radius :pill :min-height 44
      :press "scale(0.95)"
      :focus "2px --hf-accent-focus, 2px offset"
      :note "The full-pill radius IS the action signal. Do not use it on
             non-actionable elements.")

     (:id :btn-ghost
      :radius :pill :border "1px accent" :background :transparent)

     (:id :btn-utility
      :radius :sm :background :ink
      :note "Compact rect, not a pill — radius grammar distinguishes
             utility from action"
      :touch-target "44px via padding, visual height 30px")

     (:id :availability-toggle
      :significance "the most-used control in the system"
      :track "52x32" :thumb 26
      :state-encoding (:colour :thumb-position)
      :state-encoding-rule "never colour alone"
      :easing :spring
      :easing-rationale
      "The spring settle makes the control feel mechanical rather than
       digital — the 'little big thing' that separates a considered UI
       from a generated one.")

     (:id :order-card
      :radius :lg
      :urgency-accent "3px border-inline-start"
      :radius-note "single-sided border means border-start-start-radius and
                    border-end-start-radius must be 0"
      :table-number-size 28
      :elapsed "tabular-nums, coloured by urgency, always shown as a literal number")

     (:id :metric-card
      :background :canvas-alt :border :none :radius :lg
      :value "40px/600, tabular-nums")))

  (form-factors
    ((:role :counter :device "tablet landscape" :viewport "1024px+"
      :posture "fixed, two hands" :density :intentionally-high
      :density-rationale "staff need maximum orders visible without scrolling")
     (:role :waiter  :device "phone portrait" :viewport "375-430px"
      :posture "moving, one hand" :layout "single column, large targets")
     (:role :manager :device "laptop" :viewport "1280px+" :posture "seated, mouse")
     (:role :owner   :device "phone" :viewport "375px+" :posture "glancing")))

  (accessibility
    ((:req "Every interactive element keyboard reachable and operable")
     (:req "Focus visible at all times: 2px accent-focus, 2px offset")
     (:req "Status never encoded by colour alone")
     (:req "aria-live=polite on the order queue so SR users hear new orders")
     (:req "prefers-reduced-motion respected, reducing rather than removing")
     (:req "Contrast 4.5:1 body text, 3:1 large text and UI components")
     (:req "Toggles expose role=switch with aria-checked")
     (:req "Form errors associated via aria-describedby, announced on change")
     (:req "Minimum 44x44px touch targets on waiter and counter surfaces")))

  (dos
    ("Use one accent colour for every interactive element"
     "Set headlines with negative tracking at display sizes"
     "Run body copy at 17px"
     "Alternate surface tones for section rhythm"
     "Reserve the pill radius for genuinely actionable elements"
     "Give every press a scale feedback"
     "Pair every colour-encoded status with a text or shape cue"
     "Use container queries for component-level responsiveness"
     "Treat modern CSS features as progressive enhancements"))

  (donts
    ("Don't introduce a second brand accent — status colours are functional"
     "Don't add shadows to cards or buttons"
     "Don't use gradients as decoration"
     "Don't use font-weight 500"
     "Don't round full-bleed sections"
     "Don't tighten body line-height below 1.47"
     "Don't put rounded corners on single-sided borders"
     "Don't rely on hover for essential information — waiters are on touch"
     "Don't animate more than two properties at once on list items")))

;;; ═══════════════════════════════════════════════════════════════════════
;;; §9  TOOLCHAIN
;;; ═══════════════════════════════════════════════════════════════════════

(toolchain

  (package-manager
    :recommendation :pnpm
    :version "10.x"
    :setup "corepack enable && corepack prepare pnpm@latest --activate"

    :comparison
    ((:pm :npm  :cold-install "~55s" :warm "~20s" :disk "~1.1GB"
          :workspace-protocol :partial :strict-isolation #f
          :wrangler :ok :convex :ok :verdict :adequate)
     (:pm :pnpm :cold-install "~18s" :warm "~4s"  :disk "~380MB"
          :workspace-protocol :excellent :strict-isolation #t
          :wrangler :ok :convex :ok :verdict :recommended)
     (:pm :bun  :cold-install "~7s"  :warm "~2s"  :disk "~1.0GB"
          :workspace-protocol :good :strict-isolation #f
          :wrangler :known-issues :convex :mostly :verdict :not-for-this-project))

    :why-pnpm
    ((:reason :strict-isolation
      :detail
      "Symlinked node_modules means a package can only import what it
       explicitly declares. In a monorepo where apps/api must run on Workers
       with no Node built-ins, this catches an accidental
       `import fs from 'node:fs'` at install time in development rather than
       at deploy time in production."
      :weight :decisive)
     (:reason :content-addressable-store
      :detail
      "Three workspaces sharing React, TypeScript, and Zod store one physical
       copy. On a laptop doing an hours-long sprint with repeated installs,
       this is the difference between waiting and working.")
     (:reason :workspace-protocol
      :detail
      "@heavenly/types resolves to the local package with zero configuration,
       and pnpm publish rewrites it to a real version if the package ever ships."))

    :why-not-bun
    ((:reason "Wrangler + Bun has known friction"
      :detail "Cloudflare's toolchain assumes Node semantics in places.
               Debugging a Wrangler-Bun interaction mid-sprint is exactly
               the kind of unbudgeted time sink that kills an hours-long MVP.")
     (:reason "Convex CLI is Node-first"
      :detail "Works under Bun in most cases. 'Most cases' is not a property
               you want on the critical path.")
     (:reason "The saving does not justify the risk"
      :detail "~15s per install, perhaps 8 installs. Two minutes saved
               against a real risk of losing an hour to a toolchain bug."))

    :where-bun-is-right
    "Use bunx for one-off script execution and bun as the test runner if you
     want fast tests. Use it as a tool, not as the package manager of record."

    :why-not-npm
    "Works, but slower, weaker workspace protocol, and no strict-isolation
     safety property. No reason to choose it over pnpm here.")

  (repo-strategy
    :recommendation :monorepo

    :decisive-argument
    "The shared type package. The order state machine, the menu item shape,
     and the API response contracts must be identical in the Next.js app,
     the Hono worker, and the Convex functions. In a monorepo that is one
     file. In a polyrepo it is a published package with a version bump on
     every change, or — realistically, under time pressure — two copies that
     silently diverge."

    :secondary-arguments
    ("Atomic commits: 'add cancel reason' touches schema, API, and UI in one"
     "Single repo to showcase, which matters for build-in-public"
     "Independent deploys preserved: Vercel watches apps/web, Wrangler
      deploys apps/api. Monorepo does not mean monolith.")

    :build-orchestration :turborepo)

  (layout
    (apps
      (web   :framework "Next.js 15" :host :vercel
             :route-groups ((auth) (counter) (waiter) (manager)))
      (api   :framework "Hono" :host :cloudflare-workers
             :modules (routes conversation whatsapp ai middleware)))
    (packages
      (types  :purpose "shared contracts — the reason for the monorepo")
      (convex :purpose "schema + server functions")
      (ui     :purpose "extracted design system" :optional #t))
    (infra
      (cockroach/migrations)
      (scripts (seed-demo.ts generate-qr.ts)))
    (docs
      (HEAVENLY_FOODS_SPEC.md)
      (heavenly-foods.lisp)))

  (dependencies
    (web
      (next "^15.1.0") (react "^19.0.0") (react-dom "^19.0.0")
      (convex "^1.17.0") (zod "^3.24.0")
      (papaparse "^5.4.1" :purpose "CSV parsing, MVP")
      (qrcode "^1.5.4" :purpose "table QR generation")
      (recharts "^2.15.0" :purpose "analytics charts")
      (date-fns "^4.1.0")
      ("@heavenly/types" "workspace:*")
      ("@heavenly/convex" "workspace:*")
      (xlsx "^0.18.5" :phase :p2))

    (api
      (hono "^4.6.0")
      ("@hono/zod-validator" "^0.4.1")
      (zod "^3.24.0") (convex "^1.17.0")
      ("@heavenly/types" "workspace:*")
      :dev ((wrangler "^3.99.0")
            ("@cloudflare/workers-types" "^4.20250101.0")))

    (convex-pkg
      (convex "^1.17.0")
      ("@heavenly/types" "workspace:*")))

  (env-vars
    (whatsapp
      (WA_PHONE_NUMBER_ID  :source "Meta > WhatsApp > API Setup")
      (WA_ACCESS_TOKEN     :source "permanent system-user token" :secret #t)
      (WA_VERIFY_TOKEN     :source "any random string, must match webhook config" :secret #t)
      (WA_APP_SECRET       :source "Meta app secret, for HMAC" :secret #t)
      (WA_DISPLAY_NUMBER   :note "E.164, for wa.me links"))
    (convex
      (CONVEX_DEPLOYMENT)
      (NEXT_PUBLIC_CONVEX_URL)
      (CONVEX_DEPLOY_KEY :secret #t))
    (llm
      (AI_PROVIDER :default "nvidia" :options (nvidia groq ollama))
      (NVIDIA_API_KEY :secret #t)
      (NVIDIA_MODEL :default "meta/llama-3.1-70b-instruct")
      (GROQ_API_KEY :secret #t)
      (GROQ_MODEL :default "llama-3.3-70b-versatile")
      (OLLAMA_BASE_URL :default "http://localhost:11434")
      (OLLAMA_MODEL :default "llama3.1:8b"))
    (cockroach
      (COCKROACH_DATABASE_URL :secret #t :phase :p2-read-path))
    (app
      (NEXT_PUBLIC_APP_URL)
      (AUTH_SECRET :secret #t)
      (DEFAULT_RESTAURANT_ID)))

  (wrangler-config
    :compatibility-date "2026-07-01"
    :compatibility-flags ("nodejs_compat")
    :observability #t
    :kv-namespaces ((RATE_LIMIT))
    :r2-buckets ((OCR_UPLOADS :phase :p2))
    :secrets-set-via "wrangler secret put <NAME>"))

;;; ═══════════════════════════════════════════════════════════════════════
;;; §10  BUILD PLAN
;;; ═══════════════════════════════════════════════════════════════════════

(build-plan
  :unit :hours
  :total 8
  :assumption "WABA already provisioned — a Meta-side dependency measured in
               days, which must be started before hour 0"

  (hour 0 :name "Prerequisites" :when "the day before"
    :tasks
    ("Meta Business account created and verified"
     "WhatsApp Business App created in Meta dev console"
     "Test phone number provisioned, permanent access token generated"
     "Convex account and project created"
     "Cloudflare account, Workers enabled"
     "Vercel account linked to GitHub"
     "NVIDIA NIM or Groq API key obtained"))

  (hour 1 :name "Scaffold and types"
    :tasks
    ("corepack enable, pnpm activate"
     "Create workspace layout and pnpm-workspace.yaml"
     "create-next-app in apps/web"
     "create-hono cloudflare-workers template in apps/api"
     "Initialise packages/types and packages/convex"
     "pnpm install")
    :deliverable "pnpm typecheck passes across all workspaces")

  (hour 2 :name "Convex schema and seed"
    :tasks
    ("Write packages/convex/schema.ts, full schema"
     "convex dev to push schema"
     "Write infra/scripts/seed-demo.ts"
     "Seed: 1 restaurant, 8 tables, 4 staff, ~25 menu items, 5 categories"
     "Verify in Convex dashboard")
    :deliverable "Real data queryable in the Convex dashboard")

  (hour 3 :name "Design tokens and primitives"
    :tasks
    ("globals.css with all design tokens"
     "Button, Toggle, Card, MetricCard components"
     "Verify keyboard focus, 44px targets, reduced-motion"
     "Dark mode check")
    :deliverable "Primitives page rendering every component in both schemes")

  (hour 4 :name "Menu management"
    :features (F-INV-001 F-INV-002 F-INV-005 F-INV-006 F-INV-007 F-STK-002)
    :tasks
    ("Menu table with live Convex query"
     "Availability toggle wired to mutation"
     "Add/edit item form"
     "CSV import wizard: upload -> map -> preview -> commit")
    :deliverable "Menu fully manageable; availability toggle is instant")

  (hour 5 :name "WhatsApp webhook and state machine"
    :features (F-WA-004 F-WA-006 F-WA-007)
    :tasks
    ("GET verification handshake"
     "POST handler with HMAC verification and immediate 200"
     "Idempotency via processedMessages"
     "Session create/load by phone"
     "Handlers: AWAITING_TABLE, AWAITING_NAME, BROWSING"
     "WhatsApp send client"
     "wrangler dev --remote plus tunnel for Meta callback")
    :deliverable "Messaging the test number returns a table prompt and a menu")

  (hour 6 :name "Ordering flow and LLM"
    :features (F-WA-001 F-WA-002 F-WA-003 F-WA-008)
    :tasks
    ("AI provider abstraction, NVIDIA/Groq implementation"
     "Intent classification with Zod-validated parsing"
     "Recommendation filter"
     "Cart handlers: CART_REVIEW, CONFIRMING"
     "Order creation mutation, order number sequence"
     "serviceEvents write on every transition")
    :deliverable "Full order placed end-to-end over WhatsApp, visible in Convex")

  (hour 7 :name "Counter and waiter dashboards"
    :features (F-CTR-001 F-CTR-002 F-CTR-003 F-WTR-001 F-WTR-003 F-WA-005)
    :tasks
    ("Counter three-column queue with live subscription"
     "Order actions: confirm, ready, serve, cancel"
     "Confirmation callback message to diner"
     "Urgency accent driven by elapsed time"
     "Waiter mobile view scoped to assigned tables"
     "Manual order creation")
    :deliverable
    "An order placed on WhatsApp appears on the counter screen within a
     second, and confirming it messages the diner back")

  (hour 8 :name "Manager dashboard, feedback, QR, deploy"
    :features (F-MGR-001 F-MGR-002 F-MGR-004 F-MGR-005 F-MGR-011 F-MGR-012
               F-WA-009 F-WA-010)
    :tasks
    ("Manager KPI tiles, item ratings, table performance, hourly pattern"
     "Staff management and table allocation"
     "QR code generator page"
     "Feedback scheduled function and conversation handlers"
     "Marketing consent prompt"
     "wrangler deploy, Vercel deploy, point Meta webhook at production"
     "Smoke test: scan printed QR, order, confirm, serve, feedback")
    :deliverable "Live demo URL and a working WhatsApp number")

  (post-mvp-priority
    ((1 F-INV-003 "OCR ingestion — highest onboarding leverage")
     (2 F-INV-002 "XLSX parsing, completing the import feature")
     (3 (F-WTR-002 F-MGR-013) "Roster and shift management")
     (4 :cockroach-rollup "Cold store rollup job and analytics read path")
     (5 (F-WTR-004 F-MGR-006) "Waiter ranking with calibrated weights")
     (6 (F-MGR-009 F-MGR-010) "Offers and broadcast, pending Meta templates")
     (7 F-MGR-007 "Daily/weekly report generation and delivery")
     (8 F-MGR-003 "LLM feedback clustering"))))

;;; ═══════════════════════════════════════════════════════════════════════
;;; §11  COST MODEL
;;; ═══════════════════════════════════════════════════════════════════════

(cost-model
  :currency :usd
  :period :monthly

  (demo-phase
    :restaurants 1
    :line-items
    ((:service "Vercel Hobby"           :tier :free :usage "<1GB bandwidth"  :cost 0)
     (:service "Cloudflare Workers"     :tier :free :usage "~3k req/day"     :cost 0)
     (:service "Convex"                 :tier :free :usage "~40k reads/mo"   :cost 0)
     (:service "CockroachDB Serverless" :tier :free :usage "provisioned, idle" :cost 0)
     (:service "NVIDIA NIM / Groq"      :tier :free :usage "~1.5k calls/mo"  :cost 0))
    :infrastructure-total 0

    :whatsapp-note
    (:classification :not-hosting
     :pricing-model "per-message since 2025-07-01"
     :free "service/utility messages within the customer-service window"
     :charged "business-initiated marketing and utility templates"
     :variability "rates vary by country and category"
     :estimate "order of a few hundred KES/month for one demo restaurant"
     :action-required "verify against Meta's current Kenya rate card before quoting"))

  (free-tier-headroom
    ((:service "Cloudflare Workers" :limit "100k req/day"       :usage-1r "~3k/day"  :capacity "~33 restaurants")
     (:service "Convex"             :limit "~1M fn calls/mo"    :usage-1r "~40k/mo"  :capacity "~25 restaurants")
     (:service "Vercel"             :limit "100GB bandwidth/mo" :usage-1r "<1GB"     :capacity "~100 restaurants")
     (:service "CockroachDB"        :limit "10GiB, 50M RU/mo"   :usage-1r "negligible" :capacity "~200 restaurants"))
    :binding-constraint
    (:service "Convex" :at-restaurants 25
     :resolution "Convex Professional at $25/mo, trivial against 25 restaurants of revenue"))

  (scale-projection
    ((:restaurants 1   :workers 0  :convex 0   :vercel 0  :cockroach 0  :total 0)
     (:restaurants 10  :workers 0  :convex 0   :vercel 0  :cockroach 0  :total 0)
     (:restaurants 25  :workers 0  :convex 25  :vercel 0  :cockroach 0  :total 25)
     (:restaurants 100 :workers 5  :convex 25  :vercel 20 :cockroach 0  :total 50)
     (:restaurants 500 :workers 25 :convex 100 :vercel 20 :cockroach 30 :total 175))
    :cost-per-restaurant-at-500 0.35
    :conclusion "The business model is not constrained by hosting.")

  (p2-incremental
    ((:item "Vision OCR"     :unit-cost 0.03 :unit "page"
            :at-100-onboardings 15 :recurrence :one-time)
     (:item "R2 storage"     :unit-cost 0    :note "free under 10GB, images are small")
     (:item "WA templates"   :unit-cost :variable :note "verify Meta rate card")))

  (against-client-quote
    :quoted-one-time-kes 177500
    :quoted-monthly-kes 5000
    :quoted-year-1-kes 237500
    :actual-infra-cost-at-demo-kes 0
    :observation
    "The monthly fee is almost entirely margin for support, monitoring, and
     iteration, which is a defensible position — but it should be understood
     internally that hosting is not the cost driver. Support time is."))

;;; ═══════════════════════════════════════════════════════════════════════
;;; §12  RISKS AND OPEN QUESTIONS
;;; ═══════════════════════════════════════════════════════════════════════

(risks
  ((:id 1  :risk "WABA approval delays"
    :impact :high :likelihood :medium
    :mitigation "Start Meta verification days before build")
   (:id 2  :risk "Meta template approval blocks broadcast"
    :impact :medium :likelihood :high
    :mitigation "Broadcast is P2; MVP uses in-window messages only")
   (:id 3  :risk "LLM latency degrades chat UX"
    :impact :medium :likelihood :medium
    :mitigation "3s timeout, fall back to deterministic menu")
   (:id 4  :risk "Staff resist digital workflow"
    :impact :high :likelihood :medium
    :mitigation "Toggle-first UI; nothing requires typing")
   (:id 5  :risk "Poor connectivity in the restaurant"
    :impact :high :likelihood :medium
    :mitigation "Convex offline queue; bot works on the diner's own data")
   (:id 6  :risk "Diner sends photo or voice note, not text"
    :impact :low :likelihood :high
    :mitigation "Detect non-text message type, reply asking for text")
   (:id 7  :risk "Convex free tier exceeded"
    :impact :low :likelihood :low
    :mitigation "Alert at 70% usage; $25 upgrade is trivial")
   (:id 8  :risk "Prompt injection via message content"
    :impact :medium :likelihood :low
    :mitigation "LLM has no write access; all mutations are deterministic")
   (:id 9  :risk "Duplicate orders from webhook retries"
    :impact :high :likelihood :medium
    :mitigation "processedMessages idempotency with unique index")
   (:id 10 :risk "Price float drift"
    :impact :medium :likelihood :low
    :mitigation "Integer cents throughout, never float")))

(open-questions
  ((:id 1 :question "WABA ownership"
    :detail "Does Heavenly Foods own the Meta Business account, or does
             Biasharawatch host it on their behalf?"
    :why-it-matters "Determines single-tenant vs shared-WABA multi-tenant
                     architecture. Easier to decide now than to migrate later."
    :blocks :architecture)

   (:id 2 :question "Payment collection"
    :detail "The PDF does not mention payment. Order-only with payment at
             the counter, or should M-Pesa STK push be in scope?"
    :why-it-matters "Significant scope question"
    :blocks :scope)

   (:id 3 :question "Kitchen display"
    :detail "Counter staff are specified. Is there a separate kitchen screen,
             or does the counter relay orders verbally?"
    :blocks :ui-surface-count)

   (:id 4 :question "Language default"
    :detail "Should the bot open in English or Swahili, and should it detect
             and switch mid-conversation?"
    :blocks :conversation-engine)

   (:id 5 :question "Menu volatility"
    :detail "How often does the menu change? Daily specials would justify a
             'today's menu' concept the current schema does not model."
    :blocks :data-model)

   (:id 6 :question "Table count and zones"
    :detail "How many tables, and are there zones affecting waiter assignment?"
    :blocks :seed-data)

   (:id 7 :question "Existing inventory format"
    :detail "For P2 OCR planning: ruled or unruled ledgers, English or
             Swahili, roughly how many pages?"
    :blocks :p2-ocr-planning)

   (:id 8 :question "Offline expectation"
    :detail "If internet drops, should the counter dashboard continue from
             cache, or is a hard failure acceptable?"
    :blocks :resilience-design)))

(out-of-scope
  :note "Not in the client PDF, not built, listed so they are not assumed"
  (:payment-processing "M-Pesa, card, cash reconciliation")
  (:delivery "delivery or takeaway ordering")
  (:procurement "supplier or purchasing management")
  (:recipe-costing "ingredient-level inventory depletion")
  (:accounting "accounting or tax integration")
  (:multi-branch "multi-branch management")
  (:loyalty "loyalty programmes")
  (:reservations "table booking"))

;;; ═══════════════════════════════════════════════════════════════════════
;;; APPENDIX — AGENT DIRECTIVES
;;;   Instructions for any agent implementing from this spec.
;;; ═══════════════════════════════════════════════════════════════════════

(agent-directives

  (invariants
    :description "Violating any of these is a bug, not a style choice"
    ((:id :llm-never-writes
      :rule "The LLM must never perform a database mutation. It classifies
             and it formats. Nothing else.")
     (:id :money-is-integer-cents
      :rule "No float arithmetic on prices, anywhere, ever.")
     (:id :append-only-tables-are-append-only
      :rule "serviceEvents, feedback, consentLog, processedMessages export
             no update or delete mutations.")
     (:id :webhook-acks-fast
      :rule "The WhatsApp webhook returns 200 before doing any work.
             Processing happens in waitUntil.")
     (:id :availability-read-at-response-time
      :rule "The bot reads menu availability when generating a response,
             never from a cached snapshot.")
     (:id :explicit-confirmation-before-order
      :rule "No order is created without an affirmative in the immediately
             preceding turn.")
     (:id :state-never-colour-only
      :rule "Every colour-encoded status is paired with text or shape.")
     (:id :soft-delete-staff
      :rule "Staff deletion sets disabled=true. Hard deletion breaks the
             audit trail.")
     (:id :touch-targets
      :rule "44x44px minimum on all waiter and counter surfaces.")
     (:id :reduced-motion-reduces
      :rule "prefers-reduced-motion shortens durations and softens
             transforms. It never removes feedback entirely.")))

  (build-order
    :rationale "Each step is independently verifiable; nothing is blocked
                on an unbuilt dependency"
    (1 "Types package — everything else imports from it")
    (2 "Convex schema — the contract the whole system reads and writes")
    (3 "Seed data — makes every subsequent step testable with real values")
    (4 "Design tokens and primitives — every screen depends on them")
    (5 "Menu management — the simplest full-stack vertical slice")
    (6 "WhatsApp webhook — the highest-risk integration, do it early")
    (7 "Conversation engine — depends on menu and webhook")
    (8 "Dashboards — depend on orders existing")
    (9 "Analytics — depends on orders and feedback existing")
    (10 "Deploy — last, but rehearse it at hour 4 with a hello-world"))

  (verification-per-step
    ("After types: pnpm typecheck passes"
     "After schema: rows visible in Convex dashboard"
     "After seed: menu query returns 25 items"
     "After primitives: every component renders in light and dark"
     "After menu: toggling availability changes the value in Convex"
     "After webhook: Meta verification handshake returns the challenge"
     "After conversation: a real phone can place a real order"
     "After dashboards: an order appears within 1s of placement"
     "After analytics: numbers match hand-computed values from seed data"
     "After deploy: the full flow works on the production URL"))

  (do-not
    ("Do not add a second brand accent colour"
     "Do not use font-weight 500"
     "Do not let the LLM decide state transitions"
     "Do not store prices as floats"
     "Do not update or delete rows in append-only tables"
     "Do not build P2 features during the MVP sprint"
     "Do not skip the idempotency check on webhook messages"
     "Do not display raw phone numbers in copyable form"
     "Do not default marketing consent to opted-in"
     "Do not hard-delete staff records"))

  (when-in-doubt
    ("Prefer the deterministic path over the LLM path"
     "Prefer a template over a generated string"
     "Prefer a larger touch target over a tighter layout"
     "Prefer showing the number over showing only the colour"
     "Prefer cutting a P2 feature over shipping a broken MVP feature"
     "Prefer asking the client (see open-questions) over assuming")))

;;; ═══════════════════════════════════════════════════════════════════════
;;; End of heavenly-foods.lisp
;;; Companion human-readable specification: HEAVENLY_FOODS_SPEC.md
;;; ═══════════════════════════════════════════════════════════════════════