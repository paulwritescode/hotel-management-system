import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  restaurants: defineTable({
    name: v.string(),
    phoneMsisdn: v.string(),
    currency: v.literal('KES'),
    columnMappingProfile: v.optional(v.any()),
    // Addendum 04 §5.4 — display-only payment configuration. The system never transacts against
    // any of these; the till number is rendered on the order summary PDF and nowhere else.
    acceptedPaymentMethods: v.optional(v.array(v.union(
      v.literal('cash'), v.literal('mpesa'), v.literal('card'), v.literal('other'),
    ))),
    mpesaTillNumber: v.optional(v.string()),
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
    imageStorageId: v.optional(v.id('_storage')),
    externalImageUrl: v.optional(v.string()),
    imageAlt: v.optional(v.string()),
    imageCredit: v.optional(v.string()),
    imageCreditUrl: v.optional(v.string()),
    lastStockChangeBy: v.optional(v.id('staff')),
    lastStockChangeAt: v.optional(v.number()),
    lastStockChangeKind: v.optional(v.union(
      v.literal('availability'), v.literal('restock'),
      v.literal('set_quantity'), v.literal('auto_depleted'),
    )),
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
    role: v.union(v.literal('owner'), v.literal('manager'), v.literal('counter'), v.literal('waiter')),
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
    reference: v.optional(v.string()),
    receiptSentAt: v.optional(v.number()),
    status: v.union(
      v.literal('pending'), v.literal('acknowledged'), v.literal('preparing'),
      v.literal('ready'), v.literal('served'), v.literal('closed'),
      v.literal('cancelled'),
    ),
    // Addendum 04 §1 — settlement is a dimension independent of the fulfilment status above.
    // Contractually paymentStatus always exists and defaults to 'unpaid' (§5.1): every insert
    // sets it and every read coalesces a missing value to 'unpaid'. It is stored as optional
    // only so the schema can be deployed onto pre-Addendum-04 orders; run orders:backfillPayment
    // once to populate them, after which it can be tightened to a required union.
    paymentStatus: v.optional(v.union(
      v.literal('unpaid'), v.literal('paid'), v.literal('waived'),
    )),
    paymentMethod: v.optional(v.union(
      v.literal('cash'), v.literal('mpesa'), v.literal('card'), v.literal('other'),
    )),
    paidAt: v.optional(v.number()),
    paidByStaffId: v.optional(v.id('staff')),
    // Snapshot of the staff member who set the current settlement state, so the counter card can
    // render "Paid · <name>" / "Waived · <name>" without a join (Addendum 04 §2.2).
    settledByName: v.optional(v.string()),
    waivedReason: v.optional(v.string()),
    refundDue: v.optional(v.boolean()),
    acknowledgedByStaffId: v.optional(v.id('staff')),
    servedByStaffId: v.optional(v.id('staff')),
    servedByName: v.optional(v.string()),
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
    .index('by_restaurant_reference', ['restaurantId', 'reference'])
    .index('by_restaurant_payment', ['restaurantId', 'paymentStatus'])
    .index('by_phone', ['customerPhone']),

  staffAudit: defineTable({
    restaurantId: v.id('restaurants'),
    actorStaffId: v.id('staff'),
    actorRole: v.union(v.literal('owner'), v.literal('manager'), v.literal('counter'), v.literal('waiter')),
    action: v.union(
      v.literal('create'), v.literal('update_role'),
      v.literal('enable'), v.literal('disable'), v.literal('reset_pin'),
      v.literal('delete'),
    ),
    targetStaffId: v.id('staff'),
    targetRoleBefore: v.optional(v.string()),
    targetRoleAfter: v.optional(v.string()),
    at: v.number(),
  })
    .index('by_restaurant_at', ['restaurantId', 'at'])
    .index('by_target', ['targetStaffId']),

  activityLog: defineTable({
    restaurantId: v.id('restaurants'),
    actorStaffId: v.id('staff'),
    actorName: v.string(),
    actorRole: v.union(v.literal('owner'), v.literal('manager'), v.literal('counter'), v.literal('waiter')),
    action: v.string(),
    detail: v.optional(v.string()),
    at: v.number(),
  }).index('by_restaurant_at', ['restaurantId', 'at']),

  stockLedger: defineTable({
    restaurantId: v.id('restaurants'),
    itemId: v.id('items'),
    kind: v.union(v.literal('restock'), v.literal('set_quantity'), v.literal('order')),
    delta: v.number(),
    quantityAfter: v.number(),
    staffId: v.optional(v.id('staff')),
    orderId: v.optional(v.id('orders')),
    at: v.number(),
  })
    .index('by_restaurant_at', ['restaurantId', 'at'])
    .index('by_item_at', ['itemId', 'at']),

  // Addendum 04 §5.2 — append-only record of every settlement event. A settlement change
  // without a matching ledger row written in the same mutation is a bug. Corrections append a
  // new row; they never modify or delete an existing one.
  settlementLedger: defineTable({
    restaurantId: v.id('restaurants'),
    orderId: v.id('orders'),
    kind: v.union(
      v.literal('paid'), v.literal('waived'), v.literal('correction'),
    ),
    fromStatus: v.string(),
    toStatus: v.string(),
    method: v.optional(v.string()),
    amountKes: v.number(),
    reason: v.optional(v.string()),
    staffId: v.id('staff'),
    at: v.number(),
  })
    .index('by_restaurant_at', ['restaurantId', 'at'])
    .index('by_order_at', ['orderId', 'at']),

  sessions: defineTable({
    restaurantId: v.id('restaurants'),
    phone: v.string(),
    state: v.string(),
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
    rating: v.number(),
    comment: v.optional(v.string()),
    itemIds: v.array(v.id('items')),
    waiterId: v.optional(v.id('staff')),
    createdAt: v.number(),
  })
    .index('by_restaurant', ['restaurantId'])
    .index('by_order', ['orderId']),
})
