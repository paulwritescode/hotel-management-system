import { mutationGeneric, queryGeneric } from 'convex/server'
import { v } from 'convex/values'
import { ROLE_LEVEL, assertMayManage, requireStaff, type StaffRole } from './_helpers'

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
      : rows.filter((row) => row.actorRole === 'system' || ROLE_LEVEL[row.actorRole as StaffRole] < ROLE_LEVEL[viewer.role])
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

// Most recent activity timestamp per staff member, for the staff screen's "Last active" column.
// Manager/owner only; the caller maps it against rows they are already permitted to see.
export const lastActiveByStaff = queryGeneric({
  args: { token: v.string(), restaurantId: v.id('restaurants') },
  handler: async (ctx, args) => {
    await requireStaff(ctx.db, args.token, ['manager', 'owner'], String(args.restaurantId))
    const rows = await ctx.db
      .query('activityLog')
      .withIndex('by_restaurant_at', (query: any) => query.eq('restaurantId', args.restaurantId))
      .order('desc')
      .take(1000)
    const latest: Record<string, number> = {}
    for (const row of rows) {
      if (!row.actorStaffId) continue
      const key = String(row.actorStaffId)
      if (!(key in latest)) latest[key] = row.at
    }
    return latest
  },
})

// The latest sign-in for each visible staff member today. Sign-in is the roster clock-in event.
// Keeping this derived from the audit log means the manager sees the same event that powers the
// existing activity feed, without introducing a second clock-in record that can drift.
export const clockInTimes = queryGeneric({
  args: { token: v.string(), restaurantId: v.id('restaurants') },
  handler: async (ctx, args) => {
    const viewer = await requireStaff(ctx.db, args.token, ['manager', 'owner'], String(args.restaurantId))
    const now = new Date()
    const localDayStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - 3 * 60 * 60 * 1000
    const rows = await ctx.db.query('activityLog')
      .withIndex('by_restaurant_at', (query: any) => query.eq('restaurantId', args.restaurantId).gte('at', localDayStart))
      .order('desc').collect()
    const latest: Record<string, number> = {}
    for (const row of rows) {
      if (row.action !== 'sign_in') continue
      if (viewer.role !== 'owner' && row.actorRole && row.actorRole !== 'counter' && row.actorRole !== 'waiter') continue
      if (!row.actorStaffId) continue
      const key = String(row.actorStaffId)
      if (!(key in latest)) latest[key] = row.at
    }
    return latest
  },
})

export const roster = queryGeneric({
  args: { token: v.string(), restaurantId: v.id('restaurants') },
  handler: async (ctx, args) => {
    await requireStaff(ctx.db, args.token, ['manager', 'owner'], String(args.restaurantId))
    const start = Date.now() - 36 * 60 * 60 * 1000
    const rows = await ctx.db.query('activityLog').withIndex('by_restaurant_at', (query: any) => query.eq('restaurantId', args.restaurantId).gte('at', start)).order('desc').collect()
    const latest: Record<string, { status: 'clocked_in' | 'clocked_out'; at: number }> = {}
    for (const row of rows) if ((row.action === 'clock_in' || row.action === 'clock_out') && !(String(row.actorStaffId) in latest)) {
      latest[String(row.actorStaffId)] = { status: row.action === 'clock_in' ? 'clocked_in' : 'clocked_out', at: row.at }
    }
    return latest
  },
})

export const rosterHistory = queryGeneric({
  args: { token: v.string(), restaurantId: v.id('restaurants') },
  handler: async (ctx, args) => {
    await requireStaff(ctx.db, args.token, ['manager', 'owner'], String(args.restaurantId))
    return ctx.db.query('staffShifts').withIndex('by_restaurant_clockin', (query: any) => query.eq('restaurantId', args.restaurantId)).order('desc').take(100)
  },
})

async function changeRoster(ctx: any, args: { token: string; staffId: any; restaurantId: any; action: 'clock_in' | 'clock_out' }) {
  const actor = await requireStaff(ctx.db, args.token, ['manager', 'owner'], String(args.restaurantId))
  const target = await ctx.db.get(args.staffId)
  if (!target || String(target.restaurantId) !== String(args.restaurantId)) throw new Error('Staff member not found')
  if (!['counter', 'waiter'].includes(target.role)) throw new Error('Only counter and waiter staff have roster shifts')
  assertMayManage(actor.role, target.role as StaffRole, String(actor._id), String(target._id))
  const openShift = (await ctx.db.query('staffShifts').withIndex('by_staff_clockin', (query: any) => query.eq('staffId', target._id)).order('desc').take(20)).find((shift: any) => shift.clockOutAt === undefined)
  const now = Date.now()
  if (args.action === 'clock_in') {
    if (openShift) throw new Error(`${target.name} is already clocked in`)
    await ctx.db.insert('staffShifts', { restaurantId: target.restaurantId, staffId: target._id, staffName: target.name, staffRole: target.role, clockInAt: now, clockedInByStaffId: actor._id })
  } else {
    if (!openShift) throw new Error(`${target.name} is not clocked in`)
    await ctx.db.patch(openShift._id, { clockOutAt: now, clockedOutByStaffId: actor._id })
  }
  await ctx.db.insert('activityLog', { restaurantId: target.restaurantId, actorStaffId: target._id, actorName: target.name, actorRole: target.role, action: args.action, detail: `${args.action === 'clock_in' ? 'Clocked in' : 'Clocked out'} by ${actor.name}`, at: now })
  return target._id
}

export const clockIn = mutationGeneric({
  args: { token: v.string(), restaurantId: v.id('restaurants'), staffId: v.id('staff') },
  handler: async (ctx, args) => changeRoster(ctx, { ...args, action: 'clock_in' }),
})

export const clockOut = mutationGeneric({
  args: { token: v.string(), restaurantId: v.id('restaurants'), staffId: v.id('staff') },
  handler: async (ctx, args) => changeRoster(ctx, { ...args, action: 'clock_out' }),
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
      : rows.filter((row) => row.actorRole === 'system' || ROLE_LEVEL[row.actorRole as StaffRole] < ROLE_LEVEL[viewer.role])
    return {
      total: scoped.length,
      signIns: scoped.filter((row) => row.action === 'sign_in').length,
      activeStaff: new Set(scoped.map((row) => String(row.actorName))).size,
    }
  },
})
