import { queryGeneric } from 'convex/server'
import { v } from 'convex/values'
import { ROLE_LEVEL, requireStaff, type StaffRole } from './_helpers'

// Role-scoped operational activity feed.
// - owner sees every actor's activity
// - manager sees only actors strictly below their level (counter, waiter)
// - counter/waiter cannot call this at all
// Filtering happens server-side so a lower role never receives rows it may not see.
export const feed = queryGeneric({
  args: { token: v.string(), restaurantId: v.id('restaurants'), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const viewer = await requireStaff(ctx.db, args.token, ['manager', 'owner'], String(args.restaurantId))
    const cap = Math.min(Math.max(args.limit ?? 100, 1), 200)
    const rows = await ctx.db
      .query('activityLog')
      .withIndex('by_restaurant_at', (query: any) => query.eq('restaurantId', args.restaurantId))
      .order('desc')
      .take(cap * 2)
    const visible = viewer.role === 'owner'
      ? rows
      : rows.filter((row) => ROLE_LEVEL[row.actorRole as StaffRole] < ROLE_LEVEL[viewer.role])
    return visible.slice(0, cap).map((row) => ({
      _id: row._id,
      actorName: row.actorName,
      actorRole: row.actorRole,
      action: row.action,
      detail: row.detail,
      at: row.at,
    }))
  },
})

// Compact counts for the last 24 hours, scoped the same way as the feed.
export const metrics = queryGeneric({
  args: { token: v.string(), restaurantId: v.id('restaurants') },
  handler: async (ctx, args) => {
    const viewer = await requireStaff(ctx.db, args.token, ['manager', 'owner'], String(args.restaurantId))
    const since = Date.now() - 24 * 60 * 60 * 1000
    const rows = await ctx.db
      .query('activityLog')
      .withIndex('by_restaurant_at', (query: any) => query.eq('restaurantId', args.restaurantId).gte('at', since))
      .collect()
    const scoped = viewer.role === 'owner'
      ? rows
      : rows.filter((row) => ROLE_LEVEL[row.actorRole as StaffRole] < ROLE_LEVEL[viewer.role])
    return {
      total: scoped.length,
      signIns: scoped.filter((row) => row.action === 'sign_in').length,
      activeStaff: new Set(scoped.map((row) => String(row.actorName))).size,
    }
  },
})
