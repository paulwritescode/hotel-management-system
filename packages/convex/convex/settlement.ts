import { mutationGeneric, queryGeneric } from 'convex/server'
import { v } from 'convex/values'
import { logActivity, requireStaff } from './_helpers'

// Addendum 04 — Payment Settlement.
//
// Settlement is a dimension independent of the fulfilment status graph (§1.2). "paid" is an
// attestation by a staff member, not a verified fact (§1.4): no payment is initiated, processed,
// or verified here. Every settlement change writes exactly one settlementLedger row in the same
// mutation (§5.2); the ledger is append-only and corrections append rather than overwrite.
//
// Observability (§6): events are emitted through logActivity and MUST NOT carry the diner's name
// or phone number — only orderId/reference, amountKes, method and staffId.

const paymentMethod = v.union(
  v.literal('cash'), v.literal('mpesa'), v.literal('card'), v.literal('other'),
)
const paymentStatus = v.union(
  v.literal('unpaid'), v.literal('paid'), v.literal('waived'),
)

const NAIROBI_OFFSET_MS = 3 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

function shortRef(order: { reference?: string; tableNumber: number }): string {
  return order.reference?.split('-').at(-1) ?? String(order.tableNumber)
}

// Records a settlement event alongside the order change, in the same mutation.
async function writeLedger(
  ctx: any,
  order: { _id: unknown; restaurantId: unknown; totalKes: number },
  entry: { kind: 'paid' | 'waived' | 'correction'; fromStatus: string; toStatus: string; method?: string | undefined; reason?: string | undefined; staffId: unknown },
): Promise<void> {
  await ctx.db.insert('settlementLedger', {
    restaurantId: order.restaurantId,
    orderId: order._id,
    kind: entry.kind,
    fromStatus: entry.fromStatus,
    toStatus: entry.toStatus,
    ...(entry.method ? { method: entry.method } : {}),
    amountKes: order.totalKes,
    ...(entry.reason ? { reason: entry.reason } : {}),
    staffId: entry.staffId,
    at: Date.now(),
  })
}

// §2.2/§2.3 — Mark an order paid. Counter staff and above. Method selection is the confirmation.
export const markPaid = mutationGeneric({
  args: { token: v.string(), orderId: v.id('orders'), method: paymentMethod },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId)
    if (!order) throw new Error('Order not found')
    const staff = await requireStaff(ctx.db, args.token, ['counter', 'manager'], String(order.restaurantId))
    const current = order.paymentStatus ?? 'unpaid'
    if (current !== 'unpaid') throw new Error(`This order is already ${current}`)
    const now = Date.now()
    await ctx.db.patch(args.orderId, {
      paymentStatus: 'paid', paymentMethod: args.method, paidAt: now, paidByStaffId: staff._id,
      settledByName: staff.name,
    })
    await writeLedger(ctx, order, { kind: 'paid', fromStatus: 'unpaid', toStatus: 'paid', method: args.method, staffId: staff._id })
    await logActivity(ctx.db, staff, 'settlement.paid', `Order #${shortRef(order)} paid by ${args.method} · KES ${order.totalKes}`)
    return args.orderId
  },
})

// §2.4 — Waive an order (comp, staff meal, service recovery). Manager and owner only, enforced
// here in the mutation, not merely by hiding the control. A waived meal is NOT revenue (§1.3).
export const waive = mutationGeneric({
  args: { token: v.string(), orderId: v.id('orders'), reason: v.string() },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId)
    if (!order) throw new Error('Order not found')
    const staff = await requireStaff(ctx.db, args.token, ['manager'], String(order.restaurantId))
    const current = order.paymentStatus ?? 'unpaid'
    if (current !== 'unpaid') throw new Error(`This order is already ${current}`)
    const reason = args.reason.trim()
    if (reason.length < 3 || reason.length > 500) throw new Error('A waive reason of at least 3 characters is required')
    await ctx.db.patch(args.orderId, { paymentStatus: 'waived', waivedReason: reason, settledByName: staff.name })
    await writeLedger(ctx, order, { kind: 'waived', fromStatus: 'unpaid', toStatus: 'waived', reason, staffId: staff._id })
    await logActivity(ctx.db, staff, 'settlement.waived', `Order #${shortRef(order)} waived · KES ${order.totalKes} · ${reason}`)
    return args.orderId
  },
})

// §2.5 — Correct a wrongly recorded settlement. Manager and owner only. This APPENDS a correction
// row recording the previous and new state; it never deletes or overwrites a ledger row.
export const correct = mutationGeneric({
  args: { token: v.string(), orderId: v.id('orders'), toStatus: paymentStatus, method: v.optional(paymentMethod), reason: v.string() },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId)
    if (!order) throw new Error('Order not found')
    const staff = await requireStaff(ctx.db, args.token, ['manager'], String(order.restaurantId))
    const reason = args.reason.trim()
    if (reason.length < 3 || reason.length > 500) throw new Error('A correction reason of at least 3 characters is required')
    const fromStatus = (order.paymentStatus ?? 'unpaid') as string
    if (args.toStatus === 'paid' && !args.method) throw new Error('A payment method is required when correcting to paid')
    // A correction must change something: either the status, or (for a paid order) the method —
    // the canonical case is fixing a wrongly recorded payment method (Add. 05 §3.5).
    const methodUnchanged = args.method === undefined || args.method === order.paymentMethod
    if (args.toStatus === fromStatus && (args.toStatus !== 'paid' || methodUnchanged)) {
      throw new Error('The settlement is already in that state')
    }

    const now = Date.now()
    const patch: Record<string, unknown> = { paymentStatus: args.toStatus }
    if (args.toStatus === 'paid') {
      patch.paymentMethod = args.method
      patch.paidAt = now
      patch.paidByStaffId = staff._id
      patch.settledByName = staff.name
      patch.waivedReason = undefined
    } else if (args.toStatus === 'waived') {
      patch.waivedReason = reason
      patch.settledByName = staff.name
      patch.paymentMethod = undefined
      patch.paidAt = undefined
      patch.paidByStaffId = undefined
    } else {
      // Back to unpaid — clear the settlement attributes but leave the append-only ledger intact.
      patch.paymentMethod = undefined
      patch.paidAt = undefined
      patch.paidByStaffId = undefined
      patch.settledByName = undefined
      patch.waivedReason = undefined
    }
    await ctx.db.patch(args.orderId, patch)
    await writeLedger(ctx, order, { kind: 'correction', fromStatus, toStatus: args.toStatus, method: args.method, reason, staffId: staff._id })
    await logActivity(ctx.db, staff, 'settlement.corrected', `Order #${shortRef(order)} settlement corrected ${fromStatus} → ${args.toStatus} · ${reason}`)
    return args.orderId
  },
})

// §4.2/§4.5 — Today's settlement summary. Method breakdown, waived excluded from revenue, unpaid
// called out. settledRevenueKes (paymentStatus = 'paid') is THE revenue figure. Also returns the
// list of unresolved unpaid served/closed orders that the §4.3 unpaid gate would surface.
export const summary = queryGeneric({
  args: { token: v.string(), restaurantId: v.id('restaurants') },
  handler: async (ctx, args) => {
    await requireStaff(ctx.db, args.token, ['manager'], String(args.restaurantId))
    const now = Date.now()
    const todayStart = Math.floor((now + NAIROBI_OFFSET_MS) / DAY_MS) * DAY_MS - NAIROBI_OFFSET_MS
    const orders = await ctx.db.query('orders').withIndex('by_restaurant_placedAt', (query: any) =>
      query.eq('restaurantId', args.restaurantId).gte('placedAt', todayStart),
    ).collect()

    const nonCancelled = orders.filter((order) => order.status !== 'cancelled')
    const served = nonCancelled.filter((order) => order.status === 'served' || order.status === 'closed')
    const paid = nonCancelled.filter((order) => order.paymentStatus === 'paid')
    const waived = nonCancelled.filter((order) => order.paymentStatus === 'waived')
    // §4.5 — unpaid value counts only orders that have actually been served (or closed). A pre-
    // backfill order with no paymentStatus is treated as unpaid, per the §5.1 contract.
    const unpaid = served.filter((order) => (order.paymentStatus ?? 'unpaid') === 'unpaid')

    const methods: Array<'cash' | 'mpesa' | 'card' | 'other'> = ['cash', 'mpesa', 'card', 'other']
    const byMethod = methods.map((method) => {
      const rows = paid.filter((order) => order.paymentMethod === method)
      return { method, count: rows.length, valueKes: rows.reduce((sum, order) => sum + order.totalKes, 0) }
    }).filter((entry) => entry.count > 0)

    const sum = (rows: typeof nonCancelled) => rows.reduce((total, order) => total + order.totalKes, 0)

    return {
      window: { from: todayStart, to: now },
      ordersServed: served.length,
      orderedValueKes: sum(nonCancelled),
      settledRevenueKes: sum(paid),
      waivedValueKes: sum(waived),
      unpaidValueKes: sum(unpaid),
      paidCount: paid.length,
      waivedCount: waived.length,
      unpaidCount: unpaid.length,
      refundsDueCount: nonCancelled.filter((order) => order.refundDue).length,
      byMethod,
      // Resolve surface for the unpaid gate (§4.3): reference, table, name, total, servedAt.
      unpaidOrders: unpaid
        .sort((left, right) => (left.servedAt ?? left.placedAt) - (right.servedAt ?? right.placedAt))
        .map((order) => ({
          _id: order._id,
          reference: order.reference,
          tableNumber: order.tableNumber,
          customerName: order.customerName,
          totalKes: order.totalKes,
          servedAt: order.servedAt ?? order.placedAt,
        })),
    }
  },
})
