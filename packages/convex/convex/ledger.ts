import { queryGeneric } from 'convex/server'
import { v } from 'convex/values'
import { ROLE_LEVEL, requireStaff, type StaffRole } from './_helpers'

// Addendum 05 — ledger visibility.
//
// §1.1 predicate: a viewer sees their own entries plus entries by anyone strictly below them.
// §1.2: corrections are visible only upward — a counter viewer sees the CURRENT STATE of orders
// they settled (queried from orders), never the ledger, so no correction row can reach them.
// §1.4: the predicate is enforced HERE, in the Convex function, never in the browser. Counter and
// manager use different queries and different data sources, by design (§1.2 implementation rule).

const NAIROBI_OFFSET_MS = 3 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000
// Add. 04 §2.6 — a served-and-unpaid order becomes "needs attention" past this many minutes.
const UNPAID_LINGER_MINUTES = 45
export const LEDGER_RETENTION_DAYS = 90

const windowKey = v.union(v.literal('today'), v.literal('7d'), v.literal('30d'), v.literal('90d'))

function windowFrom(key: string, now: number): number {
  if (key === 'today') return Math.floor((now + NAIROBI_OFFSET_MS) / DAY_MS) * DAY_MS - NAIROBI_OFFSET_MS
  const days = key === '7d' ? 7 : key === '30d' ? 30 : 90
  return now - days * DAY_MS
}

type StaffInfo = { name: string; role: StaffRole }

async function staffDirectory(ctx: any, restaurantId: unknown): Promise<Map<string, StaffInfo>> {
  const staff = await ctx.db.query('staff').withIndex('by_restaurant', (query: any) => query.eq('restaurantId', restaurantId)).collect()
  return new Map(staff.map((member: any) => [String(member._id), { name: member.name as string, role: member.role as StaffRole }]))
}

// The immediately preceding settlement row for an order, used to render a correction's "before"
// method/status ("Cash → M-Pesa") without storing it on the row (§3.5 / no schema change §11).
async function priorSettlement(ctx: any, orderId: unknown, beforeAt: number) {
  const rows = await ctx.db.query('settlementLedger').withIndex('by_order_at', (query: any) => query.eq('orderId', orderId)).order('desc').collect()
  return rows.find((row: any) => row.at < beforeAt) ?? null
}

// ── Manager / owner: the settlement ledger (Layer 3 source), plus summary + attention. ──────────
export const settlementLog = queryGeneric({
  args: {
    token: v.string(), restaurantId: v.id('restaurants'), window: windowKey,
    staffId: v.optional(v.id('staff')), method: v.optional(v.string()), kind: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const viewer = await requireStaff(ctx.db, args.token, ['manager'], String(args.restaurantId))
    const now = Date.now()
    const from = windowFrom(args.window, now)
    const viewerLevel = ROLE_LEVEL[viewer.role as StaffRole]
    const directory = await staffDirectory(ctx, args.restaurantId)

    const ledgerRows = await ctx.db.query('settlementLedger').withIndex('by_restaurant_at', (query: any) =>
      query.eq('restaurantId', args.restaurantId).gte('at', from),
    ).order('desc').take(1000)

    // §1.1 — visible if it is the viewer's own action, or the actor is strictly below the viewer.
    const visibleRows = ledgerRows.filter((row: any) => {
      if (String(row.staffId) === String(viewer._id)) return true
      const actor = directory.get(String(row.staffId))
      return actor ? ROLE_LEVEL[actor.role] < viewerLevel : false
    })

    const orderCache = new Map<string, any>()
    const getOrder = async (orderId: unknown) => {
      const key = String(orderId)
      if (!orderCache.has(key)) orderCache.set(key, await ctx.db.get(orderId as any))
      return orderCache.get(key)
    }

    const entries: any[] = []
    for (const row of visibleRows) {
      if (args.staffId && String(row.staffId) !== String(args.staffId)) continue
      if (args.method && row.method !== args.method) continue
      if (args.kind && row.kind !== args.kind) continue
      const order = await getOrder(row.orderId)
      const base = {
        _id: String(row._id), kind: row.kind, at: row.at, amountKes: row.amountKes,
        method: row.method, reason: row.reason,
        actorName: directory.get(String(row.staffId))?.name ?? 'Former staff',
        reference: order?.reference, tableNumber: order?.tableNumber, customerName: order?.customerName,
      }
      if (row.kind === 'correction') {
        const prior = await priorSettlement(ctx, row.orderId, row.at)
        entries.push({ ...base, fromLabel: prior?.method ?? prior?.fromStatus ?? row.fromStatus, toLabel: row.method ?? row.toStatus })
      } else {
        entries.push(base)
      }
    }

    // Summary + attention over the window, from the orders themselves.
    const orders = await ctx.db.query('orders').withIndex('by_restaurant_placedAt', (query: any) =>
      query.eq('restaurantId', args.restaurantId).gte('placedAt', from),
    ).collect()
    const nonCancelled = orders.filter((order: any) => order.status !== 'cancelled')
    const paid = nonCancelled.filter((order: any) => order.paymentStatus === 'paid')
    const waived = nonCancelled.filter((order: any) => order.paymentStatus === 'waived')
    const servedUnpaid = nonCancelled.filter((order: any) => (order.status === 'served' || order.status === 'closed') && (order.paymentStatus ?? 'unpaid') === 'unpaid')
    const methods = ['cash', 'mpesa', 'card', 'other']
    const byMethod = methods.map((method) => {
      const rows = paid.filter((order: any) => order.paymentMethod === method)
      return { method, count: rows.length, valueKes: rows.reduce((sum: number, order: any) => sum + order.totalKes, 0) }
    }).filter((entry) => entry.count > 0)
    const sum = (rows: any[]) => rows.reduce((total, order) => total + order.totalKes, 0)

    const lingerCutoff = now - UNPAID_LINGER_MINUTES * 60_000
    return {
      window: { from, to: now, key: args.window },
      retentionDays: LEDGER_RETENTION_DAYS,
      summary: {
        recordedCount: paid.length, recordedValueKes: sum(paid),
        waivedCount: waived.length, waivedValueKes: sum(waived),
        unpaidCount: servedUnpaid.length, unpaidValueKes: sum(servedUnpaid),
        byMethod,
      },
      attention: {
        unpaidOrders: servedUnpaid.filter((order: any) => (order.servedAt ?? order.placedAt) <= lingerCutoff)
          .sort((a: any, b: any) => (a.servedAt ?? a.placedAt) - (b.servedAt ?? b.placedAt))
          .map((order: any) => ({ _id: String(order._id), reference: order.reference, tableNumber: order.tableNumber, customerName: order.customerName, totalKes: order.totalKes, servedAt: order.servedAt ?? order.placedAt })),
        refundsDue: nonCancelled.concat(orders.filter((order: any) => order.status === 'cancelled')).filter((order: any) => order.refundDue)
          .map((order: any) => ({ _id: String(order._id), reference: order.reference, tableNumber: order.tableNumber, totalKes: order.totalKes })),
        waives: entries.filter((entry) => entry.kind === 'waived'),
        corrections: entries.filter((entry) => entry.kind === 'correction'),
      },
      entries: entries.slice(0, 300),
      totalEntries: entries.length,
    }
  },
})

// ── Counter: "My shift". Current state of the caller's own settlements — never the ledger, so a
// correction made above them can never surface here (§1.2). ────────────────────────────────────
export const myShift = queryGeneric({
  args: { token: v.string(), restaurantId: v.id('restaurants') },
  handler: async (ctx, args) => {
    const viewer = await requireStaff(ctx.db, args.token, ['counter', 'manager'], String(args.restaurantId))
    const now = Date.now()
    const from = windowFrom('today', now)
    const orders = await ctx.db.query('orders').withIndex('by_restaurant_placedAt', (query: any) =>
      query.eq('restaurantId', args.restaurantId).gte('placedAt', from),
    ).collect()

    const mine = orders.filter((order: any) => order.paymentStatus === 'paid' && String(order.paidByStaffId) === String(viewer._id))
    const methods = ['cash', 'mpesa', 'card', 'other']
    const byMethod = methods.map((method) => {
      const rows = mine.filter((order: any) => order.paymentMethod === method)
      return { method, count: rows.length, valueKes: rows.reduce((sum: number, order: any) => sum + order.totalKes, 0) }
    }).filter((entry) => entry.count > 0)

    const servedUnpaid = orders.filter((order: any) => (order.status === 'served' || order.status === 'closed') && (order.paymentStatus ?? 'unpaid') === 'unpaid')

    return {
      window: { from, to: now, key: 'today' as const },
      summary: {
        recordedCount: mine.length,
        recordedValueKes: mine.reduce((sum: number, order: any) => sum + order.totalKes, 0),
        byMethod,
      },
      attention: {
        unpaidOrders: servedUnpaid.sort((a: any, b: any) => (a.servedAt ?? a.placedAt) - (b.servedAt ?? b.placedAt))
          .map((order: any) => ({ _id: String(order._id), reference: order.reference, tableNumber: order.tableNumber, customerName: order.customerName, totalKes: order.totalKes, servedAt: order.servedAt ?? order.placedAt })),
      },
      // Current state only, reverse-chronological by when paid. No corrections, no other staff.
      entries: mine.sort((a: any, b: any) => (b.paidAt ?? 0) - (a.paidAt ?? 0)).map((order: any) => ({
        _id: String(order._id), kind: 'paid' as const, reference: order.reference, tableNumber: order.tableNumber,
        customerName: order.customerName, amountKes: order.totalKes, method: order.paymentMethod, at: order.paidAt ?? order.placedAt,
        actorName: viewer.name,
      })),
      totalEntries: mine.length,
    }
  },
})

// ── Per-order timeline (§4). Fulfilment reconstructed from the order document; settlement from the
// ledger for manager/owner, from current state for counter (no corrections). Waiter is rejected. ─
export const orderTimeline = queryGeneric({
  args: { token: v.string(), orderId: v.id('orders') },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId)
    if (!order) throw new Error('Order not found')
    const viewer = await requireStaff(ctx.db, args.token, ['counter', 'manager'], String(order.restaurantId))
    const directory = await staffDirectory(ctx, order.restaurantId)
    const nameOf = (id: unknown) => (id ? directory.get(String(id))?.name ?? 'Former staff' : 'System')

    type Event = { at: number; label: string; actor: string; exception?: boolean }
    const events: Event[] = []
    events.push({ at: order.placedAt, label: order.source === 'whatsapp' ? 'Placed via WhatsApp' : 'Placed at counter', actor: order.source === 'whatsapp' ? order.customerName : 'Counter' })
    if (order.acknowledgedAt) events.push({ at: order.acknowledgedAt, label: 'Acknowledged', actor: nameOf(order.acknowledgedByStaffId) })
    if (order.servedAt) events.push({ at: order.servedAt, label: 'Served', actor: order.servedByName ?? nameOf(order.servedByStaffId) })
    if (order.status === 'cancelled' && order.closedAt) events.push({ at: order.closedAt, label: `Cancelled${order.cancellationReason ? ` · "${order.cancellationReason}"` : ''}`, actor: nameOf(order.cancelledByStaffId), exception: true })
    else if (order.status === 'closed' && order.closedAt) events.push({ at: order.closedAt, label: 'Closed', actor: 'System' })

    const isManagerUp = ROLE_LEVEL[viewer.role as StaffRole] >= ROLE_LEVEL.manager
    if (isManagerUp) {
      const rows = await ctx.db.query('settlementLedger').withIndex('by_order_at', (query: any) => query.eq('orderId', args.orderId)).order('asc').collect()
      for (const row of rows) {
        if (row.kind === 'correction') {
          const prior = await priorSettlement(ctx, args.orderId, row.at)
          const fromLabel = prior?.method ?? prior?.fromStatus ?? row.fromStatus
          const toLabel = row.method ?? row.toStatus
          events.push({ at: row.at, label: `Settlement corrected · ${fromLabel} → ${toLabel}${row.reason ? ` · "${row.reason}"` : ''}`, actor: nameOf(row.staffId), exception: true })
        } else {
          const label = row.kind === 'paid' ? `Paid · ${row.method} · KES ${row.amountKes.toLocaleString()}` : `Waived${row.reason ? ` · "${row.reason}"` : ''}`
          events.push({ at: row.at, label, actor: nameOf(row.staffId) })
        }
      }
    } else if ((order.paymentStatus ?? 'unpaid') !== 'unpaid') {
      // Counter sees only the current settlement state, never that a correction happened.
      const label = order.paymentStatus === 'paid' ? `Paid · ${order.paymentMethod} · KES ${order.totalKes.toLocaleString()}` : 'Waived'
      events.push({ at: order.paidAt ?? order.servedAt ?? order.placedAt, label, actor: order.settledByName ?? 'You' })
    }

    events.sort((a, b) => a.at - b.at)
    return {
      order: { reference: order.reference, tableNumber: order.tableNumber, customerName: order.customerName },
      events,
    }
  },
})

// ── Fraud signals (§5). Owner-only. Patterns for human judgement, never verdicts: no score, no
// ranking, no accusatory language, no stored history. S6 (stock-variance correlation) is omitted
// because it requires the inventoryDays daily-close that this build does not have (§5.2/§14.3 —
// "remove it rather than tune"). Suppression (§5.3) is mandatory: the restraint is the feature. ─
const SIGNAL = {
  lateMinutes: 90,
  lateMinCount: 2,
  waiveMinCount: 3,
  waiveRateMultiple: 3,
  correctionMinCount: 3,
  cashMinSettlements: 20,
  cashSharePpAbove: 0.25,
  unpaidMinCount: 3,
  minTotalSettlements: 20,
} as const

export const signals = queryGeneric({
  args: { token: v.string(), restaurantId: v.id('restaurants'), window: windowKey },
  handler: async (ctx, args) => {
    await requireStaff(ctx.db, args.token, ['owner'], String(args.restaurantId))
    const now = Date.now()
    const from = windowFrom(args.window, now)
    const directory = await staffDirectory(ctx, args.restaurantId)
    const nameOf = (id: unknown) => directory.get(String(id))?.name ?? 'Former staff'

    const orders = await ctx.db.query('orders').withIndex('by_restaurant_placedAt', (query: any) =>
      query.eq('restaurantId', args.restaurantId).gte('placedAt', from),
    ).collect()
    const nonCancelled = orders.filter((order: any) => order.status !== 'cancelled')
    const paid = nonCancelled.filter((order: any) => order.paymentStatus === 'paid')
    const waivedOrders = nonCancelled.filter((order: any) => order.paymentStatus === 'waived')
    const totalSettlements = paid.length + waivedOrders.length

    // §5.3 — a window with fewer than 20 settlements produces NO signals at all.
    if (totalSettlements < SIGNAL.minTotalSettlements) {
      return { window: { from, to: now, key: args.window }, status: 'insufficient' as const, signals: [] as any[] }
    }

    const ledgerRows = await ctx.db.query('settlementLedger').withIndex('by_restaurant_at', (query: any) =>
      query.eq('restaurantId', args.restaurantId).gte('at', from),
    ).collect()

    // Per-staff settlement attribution (from orders for paid, from the ledger for waives).
    const paidByStaff = new Map<string, { paid: number; cash: number; late: number }>()
    for (const order of paid) {
      if (!order.paidByStaffId) continue
      const key = String(order.paidByStaffId)
      const entry = paidByStaff.get(key) ?? { paid: 0, cash: 0, late: 0 }
      entry.paid += 1
      if (order.paymentMethod === 'cash') entry.cash += 1
      if (order.servedAt && order.paidAt && order.paidAt - order.servedAt > SIGNAL.lateMinutes * 60_000) entry.late += 1
      paidByStaff.set(key, entry)
    }
    const waivesByStaff = new Map<string, number>()
    for (const row of ledgerRows) if (row.kind === 'waived') waivesByStaff.set(String(row.staffId), (waivesByStaff.get(String(row.staffId)) ?? 0) + 1)
    const settlingStaff = new Set<string>([...paidByStaff.keys(), ...waivesByStaff.keys()])
    const multiStaff = settlingStaff.size >= 2

    const out: any[] = []

    // S1 — late settlements. Does not require multiple staff.
    const lateTotal = [...paidByStaff.values()].reduce((sum, entry) => sum + entry.late, 0)
    if (lateTotal >= SIGNAL.lateMinCount) {
      const breakdown = [...paidByStaff.entries()].filter(([, entry]) => entry.late > 0)
        .map(([id, entry]) => ({ name: nameOf(id), count: entry.late, denominator: entry.paid }))
      out.push({
        id: 'S1', headline: 'Late settlements',
        summary: `${lateTotal} settlement${lateTotal === 1 ? '' : 's'} recorded more than ${SIGNAL.lateMinutes} minutes after service, out of ${paid.length} in this window.`,
        breakdown, benignNote: 'Diners who linger produce the same pattern.',
      })
    }

    // S3 — correction concentration (subject = the staff whose settlement was corrected). No
    // multi-staff requirement.
    const correctionsBySubject = new Map<string, number>()
    for (const row of ledgerRows) if (row.kind === 'correction') {
      const prior = await priorSettlement(ctx, row.orderId, row.at)
      if (prior?.staffId) correctionsBySubject.set(String(prior.staffId), (correctionsBySubject.get(String(prior.staffId)) ?? 0) + 1)
    }
    const correctionBreakdown = [...correctionsBySubject.entries()].filter(([, count]) => count >= SIGNAL.correctionMinCount)
      .map(([id, count]) => ({ name: nameOf(id), count, denominator: paidByStaff.get(id)?.paid ?? count }))
    if (correctionBreakdown.length > 0) {
      const total = correctionBreakdown.reduce((sum, entry) => sum + entry.count, 0)
      out.push({
        id: 'S3', headline: 'Repeated corrections',
        summary: `${total} settlement corrections concentrated on ${correctionBreakdown.length} staff member${correctionBreakdown.length === 1 ? '' : 's'} in this window.`,
        breakdown: correctionBreakdown, benignNote: 'This often reflects a training need rather than anything else.',
      })
    }

    if (multiStaff) {
      // S2 — waive concentration.
      const restaurantWaiveRate = totalSettlements > 0 ? waivedOrders.length / totalSettlements : 0
      const s2 = [...waivesByStaff.entries()].map(([id, waives]) => {
        const staffSettlements = (paidByStaff.get(id)?.paid ?? 0) + waives
        const rate = staffSettlements > 0 ? waives / staffSettlements : 0
        return { id, waives, staffSettlements, rate }
      }).filter((entry) => entry.waives >= SIGNAL.waiveMinCount && entry.rate >= SIGNAL.waiveRateMultiple * restaurantWaiveRate)
      if (s2.length > 0) {
        out.push({
          id: 'S2', headline: 'Waive concentration',
          summary: `${s2.reduce((sum, entry) => sum + entry.waives, 0)} waives concentrated with ${s2.length} staff member${s2.length === 1 ? '' : 's'}, against a restaurant waive rate of ${(restaurantWaiveRate * 100).toFixed(0)}%.`,
          breakdown: s2.map((entry) => ({ name: nameOf(entry.id), count: entry.waives, denominator: entry.staffSettlements })),
          benignNote: 'Comps, staff meals and service recovery all waive legitimately.',
        })
      }

      // S4 — cash skew.
      const totalPaid = paid.length
      const totalCash = paid.filter((order: any) => order.paymentMethod === 'cash').length
      const restaurantCashShare = totalPaid > 0 ? totalCash / totalPaid : 0
      const s4 = [...paidByStaff.entries()].map(([id, entry]) => ({ id, entry, share: entry.paid > 0 ? entry.cash / entry.paid : 0 }))
        .filter(({ entry, share }) => entry.paid >= SIGNAL.cashMinSettlements && share - restaurantCashShare >= SIGNAL.cashSharePpAbove)
      if (s4.length > 0) {
        out.push({
          id: 'S4', headline: 'Cash share above the floor average',
          summary: `${s4.length} staff member${s4.length === 1 ? '' : 's'} recording a cash share well above the restaurant-wide ${(restaurantCashShare * 100).toFixed(0)}%.`,
          breakdown: s4.map(({ id, entry }) => ({ name: nameOf(id), count: entry.cash, denominator: entry.paid })),
          benignNote: 'Shift and section assignment shape how much cash a person handles.',
        })
      }

      // S5 — unpaid concentration (by the staff who served).
      const unpaidByServer = new Map<string, number>()
      for (const order of nonCancelled) {
        if ((order.status === 'served' || order.status === 'closed') && (order.paymentStatus ?? 'unpaid') === 'unpaid' && order.servedByStaffId) {
          unpaidByServer.set(String(order.servedByStaffId), (unpaidByServer.get(String(order.servedByStaffId)) ?? 0) + 1)
        }
      }
      const s5 = [...unpaidByServer.entries()].filter(([, count]) => count >= SIGNAL.unpaidMinCount)
      if (s5.length > 0) {
        out.push({
          id: 'S5', headline: 'Unpaid orders concentrated with one server',
          summary: `${s5.reduce((sum, [, count]) => sum + count, 0)} unpaid served orders concentrated with ${s5.length} staff member${s5.length === 1 ? '' : 's'} in this window.`,
          breakdown: s5.map(([id, count]) => ({ name: nameOf(id), count, denominator: count })),
          benignNote: 'A diner who leaves without paying leaves the server holding an unpaid order.',
        })
      }
    }

    return { window: { from, to: now, key: args.window }, status: 'ok' as const, signals: out }
  },
})
