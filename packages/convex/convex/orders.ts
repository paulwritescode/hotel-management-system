import { internalMutationGeneric, makeFunctionReference, mutationGeneric, queryGeneric } from 'convex/server'
import { v } from 'convex/values'
import { assertPositiveInteger, cleanRequired, getActiveTable, logActivity, requireStaff, type OrderStatus } from './_helpers'
import { assertOrderTransition, computeOrderTotal } from './_domain'

const orderStatus = v.union(
  v.literal('pending'), v.literal('acknowledged'), v.literal('preparing'),
  v.literal('ready'), v.literal('served'), v.literal('closed'), v.literal('cancelled'),
)
const cartLine = v.object({ itemId: v.id('items'), quantity: v.number() })
const feedbackRef = makeFunctionReference<'mutation', { phone: string; orderId: string }, unknown>('sessions:markAwaitingFeedback')
const closeFeedbackRef = makeFunctionReference<'mutation', { phone: string; orderId: string }, unknown>('sessions:closeFeedback')

async function snapshotLines(ctx: any, restaurantId: string, lines: Array<{ itemId: string; quantity: number }>) {
  if (lines.length === 0 || lines.length > 100) throw new Error('Order must contain 1 to 100 lines')
  const seen = new Set<string>()
  const snapshots: Array<{ itemId: any; nameSnapshot: string; priceKesSnapshot: number; quantity: number }> = []
  for (const line of lines) {
    assertPositiveInteger(line.quantity, 'quantity')
    if (seen.has(String(line.itemId))) throw new Error('Duplicate item lines are not allowed')
    seen.add(String(line.itemId))
    const item = await ctx.db.get(line.itemId)
    if (!item || String(item.restaurantId) !== restaurantId || item.archived || !item.available) {
      throw new Error(`${item?.name ?? 'An item'} is no longer available`)
    }
    if (!Number.isSafeInteger(item.priceKes) || item.priceKes <= 0) throw new Error(`${item.name} has an invalid price`)
    if (item.quantityOnHand !== undefined && item.quantityOnHand < line.quantity) {
      throw new Error(`${item.name} just ran out; only ${item.quantityOnHand} remain`)
    }
    snapshots.push({ itemId: item._id, nameSnapshot: item.name, priceKesSnapshot: item.priceKes, quantity: line.quantity })
  }
  return { snapshots, totalKes: computeOrderTotal(snapshots) }
}

const NAIROBI_OFFSET_MS = 3 * 60 * 60 * 1000

// Reference format HF-YYYYMMDD-NNNN. NNNN is a per-restaurant counter that resets at local
// midnight in Africa/Nairobi and is derived by counting the day's orders so it never drifts.
async function nextOrderReference(ctx: any, restaurantId: string, now: number): Promise<string> {
  const local = new Date(now + NAIROBI_OFFSET_MS)
  const yyyymmdd = `${local.getUTCFullYear()}${String(local.getUTCMonth() + 1).padStart(2, '0')}${String(local.getUTCDate()).padStart(2, '0')}`
  const dayStart = Math.floor((now + NAIROBI_OFFSET_MS) / (24 * 60 * 60 * 1000)) * (24 * 60 * 60 * 1000) - NAIROBI_OFFSET_MS
  const todays = await ctx.db.query('orders').withIndex('by_restaurant_placedAt', (query: any) =>
    query.eq('restaurantId', restaurantId).gte('placedAt', dayStart),
  ).collect()
  const seq = String(todays.length + 1).padStart(4, '0')
  return `HF-${yyyymmdd}-${seq}`
}

async function decrementStock(ctx: any, lines: Array<{ itemId: any; quantity: number }>) {
  for (const line of lines) {
    const item = await ctx.db.get(line.itemId)
    if (item.quantityOnHand !== undefined) {
      const remaining = item.quantityOnHand - line.quantity
      if (remaining < 0) throw new Error(`${item.name} just ran out`)
      const depletion = remaining === 0 ? { lastStockChangeKind: 'auto_depleted' as const, lastStockChangeBy: undefined, lastStockChangeAt: Date.now() } : {}
      await ctx.db.patch(item._id, { quantityOnHand: remaining, available: remaining > 0, updatedAt: Date.now(), ...depletion })
    }
  }
}

// Returns the ordered quantities to stock when an order is cancelled before it is served.
// Only tracked items are affected. An item that had sold out (quantity 0) is re-enabled once
// stock is restored; an item a manager deliberately disabled at a positive count is left as-is.
async function restoreStock(ctx: any, lines: Array<{ itemId: any; quantity: number }>) {
  for (const line of lines) {
    const item = await ctx.db.get(line.itemId)
    if (!item || item.quantityOnHand === undefined) continue
    const restored = item.quantityOnHand + line.quantity
    const available = item.quantityOnHand === 0 ? restored > 0 : item.available
    await ctx.db.patch(item._id, { quantityOnHand: restored, available, updatedAt: Date.now() })
  }
}

export const placeFromSession = mutationGeneric({
  args: { restaurantId: v.id('restaurants'), phone: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db.query('sessions').withIndex('by_phone', (query: any) => query.eq('phone', args.phone)).unique()
    const now = Date.now()
    if (!session || String(session.restaurantId) !== String(args.restaurantId) || session.expiresAt <= now) throw new Error('Session expired')
    if (session.state !== 'AWAITING_CONSENT') throw new Error('Order is not ready for placement')
    if (!session.tableNumber || !session.customerName) throw new Error('Table and customer name are required')
    await getActiveTable(ctx.db, String(args.restaurantId), session.tableNumber)
    const { snapshots, totalKes } = await snapshotLines(ctx, String(args.restaurantId), session.cart)
    await decrementStock(ctx, snapshots)
    const reference = await nextOrderReference(ctx, String(args.restaurantId), now)
    const orderId = await ctx.db.insert('orders', {
      restaurantId: args.restaurantId,
      tableNumber: session.tableNumber,
      source: 'whatsapp',
      customerName: cleanRequired(session.customerName, 'customerName', 80),
      customerPhone: session.phone,
      lines: snapshots,
      totalKes,
      reference,
      status: 'pending',
      placedAt: now,
    })
    await ctx.db.patch(session._id, { activeOrderId: orderId, state: 'PLACED', cart: [], lastMessageAt: now, expiresAt: now + 30 * 60 * 1000 })
    return { orderId, totalKes, lines: snapshots }
  },
})

export const placeManual = mutationGeneric({
  args: {
    token: v.string(), restaurantId: v.id('restaurants'), tableNumber: v.number(),
    customerName: v.string(), customerPhone: v.optional(v.string()), lines: v.array(cartLine),
  },
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx.db, args.token, ['counter', 'manager'], String(args.restaurantId))
    await getActiveTable(ctx.db, String(args.restaurantId), args.tableNumber)
    const { snapshots, totalKes } = await snapshotLines(ctx, String(args.restaurantId), args.lines)
    await decrementStock(ctx, snapshots)
    const customerPhone = args.customerPhone?.trim()
    if (customerPhone && !/^\+[1-9]\d{7,14}$/.test(customerPhone)) throw new Error('customerPhone must be E.164')
    const now = Date.now()
    const reference = await nextOrderReference(ctx, String(args.restaurantId), now)
    const orderId = await ctx.db.insert('orders', {
      restaurantId: args.restaurantId,
      tableNumber: args.tableNumber,
      source: 'counter',
      customerName: cleanRequired(args.customerName, 'customerName', 80),
      customerPhone: customerPhone || undefined,
      lines: snapshots,
      totalKes,
      reference,
      status: 'pending',
      placedAt: now,
    })
    await logActivity(ctx.db, staff, 'order_create', `Created order #${reference.split('-').at(-1)} for table ${args.tableNumber}`)
    return { orderId, totalKes, reference, lines: snapshots }
  },
})

export const live = queryGeneric({
  args: { token: v.string(), restaurantId: v.id('restaurants') },
  handler: async (ctx, args) => {
    await requireStaff(ctx.db, args.token, ['counter', 'manager'], String(args.restaurantId))
    const statuses = ['pending', 'acknowledged', 'preparing', 'ready', 'served'] as const
    const groups = await Promise.all(statuses.map((status) =>
      ctx.db.query('orders').withIndex('by_restaurant_status', (query: any) =>
        query.eq('restaurantId', args.restaurantId).eq('status', status),
      ).order('desc').take(100),
    ))
    return groups.flat().sort((left, right) => right.placedAt - left.placedAt).slice(0, 100)
  },
})

export const transition = mutationGeneric({
  args: { token: v.string(), orderId: v.id('orders'), status: orderStatus },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId)
    if (!order) throw new Error('Order not found')
    const staff = await requireStaff(ctx.db, args.token, ['counter', 'waiter', 'manager'], String(order.restaurantId))
    assertOrderTransition(order.status as OrderStatus, args.status)
    if (staff.role === 'waiter') {
      if (args.status !== 'served') throw new Error('Waiters can only mark orders served')
      const table = await ctx.db.query('tables').withIndex('by_restaurant_number', (query: any) =>
        query.eq('restaurantId', order.restaurantId).eq('number', order.tableNumber),
      ).unique()
      if (!table || String(table.assignedWaiterId) !== String(staff._id)) throw new Error('Order is not assigned to this waiter')
    }
    const now = Date.now()
    const patch: Record<string, unknown> = { status: args.status }
    if (args.status === 'acknowledged') {
      patch.acknowledgedByStaffId = staff._id
      patch.acknowledgedAt = now
    }
    if (args.status === 'served') {
      patch.servedByStaffId = staff._id
      patch.servedByName = staff.name
      patch.servedAt = now
      if (order.customerPhone) {
        await ctx.scheduler.runAfter(10 * 60 * 1000, feedbackRef, { phone: order.customerPhone, orderId: order._id })
        await ctx.scheduler.runAfter(40 * 60 * 1000, closeFeedbackRef, { phone: order.customerPhone, orderId: order._id })
      }
    }
    if (args.status === 'closed') patch.closedAt = now
    await ctx.db.patch(args.orderId, patch)
    await logActivity(ctx.db, staff, 'order_status', `Order #${order.reference?.split('-').at(-1) ?? order.tableNumber} → ${args.status}`)
    return args.orderId
  },
})

export const cancel = mutationGeneric({
  args: { token: v.string(), orderId: v.id('orders'), reason: v.string() },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId)
    if (!order) throw new Error('Order not found')
    const staff = await requireStaff(ctx.db, args.token, ['counter', 'manager'], String(order.restaurantId))
    if (['served', 'closed', 'cancelled'].includes(order.status)) throw new Error(`A ${order.status} order cannot be cancelled`)
    const reason = args.reason.trim()
    if (reason.length < 3 || reason.length > 500) throw new Error('Cancellation reason must be 3 to 500 characters')
    await restoreStock(ctx, order.lines)
    await ctx.db.patch(args.orderId, { status: 'cancelled', cancellationReason: reason, cancelledByStaffId: staff._id, closedAt: Date.now() })
    await logActivity(ctx.db, staff, 'order_cancel', `Cancelled order #${order.reference?.split('-').at(-1) ?? order.tableNumber} and returned stock`)
    return args.orderId
  },
})

export const waiterOrders = queryGeneric({
  args: { token: v.string(), restaurantId: v.id('restaurants') },
  handler: async (ctx, args) => {
    const waiter = await requireStaff(ctx.db, args.token, ['waiter'], String(args.restaurantId))
    const tables = await ctx.db.query('tables').withIndex('by_restaurant_number', (query: any) => query.eq('restaurantId', args.restaurantId)).collect()
    const numbers = new Set(tables.filter((table) => String(table.assignedWaiterId) === String(waiter._id) && table.active).map((table) => table.number))
    const statuses = ['pending', 'acknowledged', 'preparing', 'ready'] as const
    const groups = await Promise.all(statuses.map((status) => ctx.db.query('orders').withIndex('by_restaurant_status', (query: any) =>
      query.eq('restaurantId', args.restaurantId).eq('status', status),
    ).take(100)))
    return groups.flat().filter((order) => numbers.has(order.tableNumber)).sort((a, b) => b.placedAt - a.placedAt).slice(0, 100)
  },
})

export const waiterStats = queryGeneric({
  args: { token: v.string(), restaurantId: v.id('restaurants') },
  handler: async (ctx, args) => {
    const waiter = await requireStaff(ctx.db, args.token, ['waiter'], String(args.restaurantId))
    const now = Date.now()
    const dayMs = 24 * 60 * 60 * 1000
    const eatOffsetMs = 3 * 60 * 60 * 1000
    const todayStart = Math.floor((now + eatOffsetMs) / dayMs) * dayMs - eatOffsetMs
    const orders = await ctx.db.query('orders').withIndex('by_restaurant_placedAt', (query: any) =>
      query.eq('restaurantId', args.restaurantId),
    ).collect()
    const served = orders.filter((order) => String(order.servedByStaffId) === String(waiter._id) && order.servedAt && order.servedAt >= todayStart)
    const times = served.filter((order) => order.acknowledgedAt).map((order) => order.servedAt! - order.acknowledgedAt!).sort((a, b) => a - b)
    const medianMs = times.length === 0 ? null : times.length % 2 ? times[Math.floor(times.length / 2)]! : (times[times.length / 2 - 1]! + times[times.length / 2]!) / 2
    return { ordersServedToday: served.length, medianAcknowledgedToServedMs: medianMs }
  },
})

export const recommendations = queryGeneric({
  args: { restaurantId: v.id('restaurants'), budgetKes: v.optional(v.number()), category: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (args.budgetKes !== undefined) assertPositiveInteger(args.budgetKes, 'budgetKes')
    const items = await ctx.db.query('items').withIndex('by_restaurant_available', (query: any) =>
      query.eq('restaurantId', args.restaurantId).eq('available', true).eq('archived', false),
    ).collect()
    const candidates = items.filter((item) => (args.budgetKes === undefined || item.priceKes <= args.budgetKes) && (args.category === undefined || item.category === args.category))
    const since = Date.now() - 7 * 24 * 60 * 60 * 1000
    const recent = await ctx.db.query('orders').withIndex('by_restaurant_placedAt', (query: any) =>
      query.eq('restaurantId', args.restaurantId).gte('placedAt', since),
    ).collect()
    const counts = new Map<string, number>()
    for (const order of recent) if (order.status !== 'cancelled') for (const line of order.lines) counts.set(String(line.itemId), (counts.get(String(line.itemId)) ?? 0) + line.quantity)
    return candidates.sort((a, b) => (counts.get(String(b._id)) ?? 0) - (counts.get(String(a._id)) ?? 0) || a.priceKes - b.priceKes).slice(0, 3)
  },
})

export const closeStaleServed = internalMutationGeneric({
  args: { olderThan: v.number(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const served = await ctx.db.query('orders').withIndex('by_restaurant_status').filter((query: any) => query.lt(query.field('servedAt'), args.olderThan)).take(Math.min(args.limit ?? 100, 500))
    for (const order of served) if (order.status === 'served') await ctx.db.patch(order._id, { status: 'closed', closedAt: Date.now() })
    return served.length
  },
})
