import { queryGeneric } from 'convex/server'
import { v } from 'convex/values'
import { requireStaff } from './_helpers'

function median(values: number[]): number | null {
  if (values.length === 0) return null
  values.sort((a, b) => a - b)
  const middle = Math.floor(values.length / 2)
  return values.length % 2 ? values[middle]! : (values[middle - 1]! + values[middle]!) / 2
}

export const dashboard = queryGeneric({
  args: { token: v.string(), restaurantId: v.id('restaurants') },
  handler: async (ctx, args) => {
    await requireStaff(ctx.db, args.token, ['manager'], String(args.restaurantId))
    const now = Date.now()
    const eatOffsetMs = 3 * 60 * 60 * 1000
    const dayMs = 24 * 60 * 60 * 1000
    const todayStart = Math.floor((now + eatOffsetMs) / dayMs) * dayMs - eatOffsetMs
    const sevenDaysAgo = now - 7 * dayMs
    const orders = await ctx.db.query('orders').withIndex('by_restaurant_placedAt', (query: any) =>
      query.eq('restaurantId', args.restaurantId).gte('placedAt', sevenDaysAgo),
    ).collect()
    const valid = orders.filter((order) => order.status !== 'cancelled')
    const todayOrders = valid.filter((order) => order.placedAt >= todayStart)
    const revenueTodayKes = todayOrders.reduce((sum, order) => sum + order.totalKes, 0)

    const itemCounts = new Map<string, { itemId: string; name: string; quantity: number; orderCount: number }>()
    for (const order of valid) {
      const seen = new Set<string>()
      for (const line of order.lines) {
        const key = String(line.itemId)
        const entry = itemCounts.get(key) ?? { itemId: key, name: line.nameSnapshot, quantity: 0, orderCount: 0 }
        entry.quantity += line.quantity
        if (!seen.has(key)) entry.orderCount += 1
        seen.add(key)
        itemCounts.set(key, entry)
      }
    }

    const ordersByHour = Array.from({ length: 24 }, (_, hour) => ({ hour, orders: 0, revenueKes: 0 }))
    for (const order of valid) {
      const bucket = ordersByHour[(new Date(order.placedAt).getUTCHours() + 3) % 24]!
      bucket.orders += 1
      bucket.revenueKes += order.totalKes
    }

    const tableMap = new Map<number, { tableNumber: number; orders: number; revenueKes: number; turnarounds: number[] }>()
    for (const order of valid) {
      const entry = tableMap.get(order.tableNumber) ?? { tableNumber: order.tableNumber, orders: 0, revenueKes: 0, turnarounds: [] as number[] }
      entry.orders += 1
      entry.revenueKes += order.totalKes
      if (order.servedAt) entry.turnarounds.push(order.servedAt - order.placedAt)
      tableMap.set(order.tableNumber, entry)
    }

    const feedback = await ctx.db.query('feedback').withIndex('by_restaurant', (query: any) => query.eq('restaurantId', args.restaurantId)).collect()
    const recentFeedback = feedback.filter((entry) => entry.createdAt >= sevenDaysAgo)
    const itemRatings = new Map<string, { itemId: string; ratings: number[]; comments: string[] }>()
    for (const entry of recentFeedback) for (const itemId of entry.itemIds) {
      const key = String(itemId)
      const aggregate = itemRatings.get(key) ?? { itemId: key, ratings: [], comments: [] }
      aggregate.ratings.push(entry.rating)
      if (entry.comment) aggregate.comments.push(entry.comment)
      itemRatings.set(key, aggregate)
    }

    const waiterMap = new Map<string, { waiterId: string; ordersServed: number; serveTimes: number[]; ratings: number[] }>()
    for (const order of valid) if (order.servedByStaffId && order.servedAt) {
      const key = String(order.servedByStaffId)
      const aggregate = waiterMap.get(key) ?? { waiterId: key, ordersServed: 0, serveTimes: [], ratings: [] }
      aggregate.ordersServed += 1
      if (order.acknowledgedAt) aggregate.serveTimes.push(order.servedAt - order.acknowledgedAt)
      waiterMap.set(key, aggregate)
    }
    for (const entry of recentFeedback) if (entry.waiterId) {
      const key = String(entry.waiterId)
      const aggregate = waiterMap.get(key) ?? { waiterId: key, ordersServed: 0, serveTimes: [], ratings: [] }
      aggregate.ratings.push(entry.rating)
      waiterMap.set(key, aggregate)
    }

    const lowestRatedItems = [...itemRatings.values()].map((entry) => {
      const average = entry.ratings.reduce((sum, rating) => sum + rating, 0) / entry.ratings.length
      return {
        itemId: entry.itemId,
        name: itemCounts.get(entry.itemId)?.name ?? 'Archived item',
        ratingCount: entry.ratings.length,
        meanRating: entry.ratings.length >= 5 ? average : null,
        ratings: entry.ratings.length < 5 ? entry.ratings : undefined,
        comments: entry.comments,
        rank: average,
      }
    }).sort((a, b) => a.rank - b.rank).slice(0, 5).map(({ rank: _rank, ...entry }) => entry)

    const waiters = await Promise.all([...waiterMap.values()].map(async (entry) => {
      const staff = await ctx.db.get(entry.waiterId as any)
      return {
        waiterId: entry.waiterId,
        name: staff?.name ?? 'Former staff member',
        ordersServed: entry.ordersServed,
        medianServeTimeMs: median(entry.serveTimes),
        ratingCount: entry.ratings.length,
        meanRating: entry.ratings.length >= 5 ? entry.ratings.reduce((sum, rating) => sum + rating, 0) / entry.ratings.length : null,
        ratings: entry.ratings.length < 5 ? entry.ratings : undefined,
      }
    }))

    return {
      windows: { today: { from: todayStart, to: now }, last7Days: { from: sevenDaysAgo, to: now } },
      today: { orders: todayOrders.length, revenueKes: revenueTodayKes, averageOrderValueKes: todayOrders.length ? revenueTodayKes / todayOrders.length : 0 },
      topItems: [...itemCounts.values()].sort((a, b) => b.orderCount - a.orderCount || b.quantity - a.quantity).slice(0, 5),
      lowestRatedItems,
      ordersByHour,
      tables: [...tableMap.values()].map((entry) => ({ tableNumber: entry.tableNumber, orders: entry.orders, revenueKes: entry.revenueKes, medianTurnaroundMs: median(entry.turnarounds) })).sort((a, b) => a.tableNumber - b.tableNumber),
      waiters,
    }
  },
})
