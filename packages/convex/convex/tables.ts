import { mutationGeneric, queryGeneric } from 'convex/server'
import { v } from 'convex/values'
import { assertPositiveInteger, requireStaff } from './_helpers'

export const list = queryGeneric({
  args: { token: v.string(), restaurantId: v.id('restaurants') },
  handler: async (ctx, args) => {
    await requireStaff(ctx.db, args.token, ['counter', 'waiter', 'manager'], String(args.restaurantId))
    return ctx.db.query('tables').withIndex('by_restaurant_number', (query: any) => query.eq('restaurantId', args.restaurantId)).collect()
  },
})

export const create = mutationGeneric({
  args: { token: v.string(), restaurantId: v.id('restaurants'), number: v.number(), seats: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireStaff(ctx.db, args.token, ['manager'], String(args.restaurantId))
    assertPositiveInteger(args.number, 'number')
    if (args.number > 999) throw new Error('Table number must be at most 999')
    if (args.seats !== undefined) assertPositiveInteger(args.seats, 'seats')
    const existing = await ctx.db.query('tables').withIndex('by_restaurant_number', (query: any) =>
      query.eq('restaurantId', args.restaurantId).eq('number', args.number),
    ).unique()
    if (existing) throw new Error(`Table ${args.number} already exists`)
    return ctx.db.insert('tables', { restaurantId: args.restaurantId, number: args.number, seats: args.seats, active: true })
  },
})

export const update = mutationGeneric({
  args: { token: v.string(), tableId: v.id('tables'), number: v.optional(v.number()), seats: v.optional(v.number()), active: v.boolean() },
  handler: async (ctx, args) => {
    const table = await ctx.db.get(args.tableId)
    if (!table) throw new Error('Table not found')
    await requireStaff(ctx.db, args.token, ['manager'], String(table.restaurantId))
    if (args.number !== undefined) {
      assertPositiveInteger(args.number, 'number')
      if (args.number > 999) throw new Error('Table number must be at most 999')
      const existing = await ctx.db.query('tables').withIndex('by_restaurant_number', (query: any) =>
        query.eq('restaurantId', table.restaurantId).eq('number', args.number!),
      ).unique()
      if (existing && String(existing._id) !== String(args.tableId)) throw new Error(`Table ${args.number} already exists`)
    }
    if (args.seats !== undefined) assertPositiveInteger(args.seats, 'seats')
    await ctx.db.patch(args.tableId, { number: args.number ?? table.number, seats: args.seats, active: args.active })
  },
})

export const remove = mutationGeneric({
  args: { token: v.string(), tableId: v.id('tables') },
  handler: async (ctx, args) => {
    const table = await ctx.db.get(args.tableId)
    if (!table) throw new Error('Table not found')
    await requireStaff(ctx.db, args.token, ['manager'], String(table.restaurantId))
    const orders = await ctx.db.query('orders').withIndex('by_restaurant_table', (query: any) =>
      query.eq('restaurantId', table.restaurantId).eq('tableNumber', table.number),
    ).collect()
    if (orders.some((order) => !['served', 'closed', 'cancelled'].includes(order.status))) {
      throw new Error('A table with open orders cannot be removed')
    }
    await ctx.db.delete(args.tableId)
    return args.tableId
  },
})

export const assignWaiter = mutationGeneric({
  args: { token: v.string(), tableId: v.id('tables'), waiterId: v.optional(v.id('staff')) },
  handler: async (ctx, args) => {
    const table = await ctx.db.get(args.tableId)
    if (!table) throw new Error('Table not found')
    await requireStaff(ctx.db, args.token, ['manager'], String(table.restaurantId))
    if (args.waiterId) {
      const waiter = await ctx.db.get(args.waiterId)
      if (!waiter || !waiter.enabled || waiter.role !== 'waiter' || String(waiter.restaurantId) !== String(table.restaurantId)) {
        throw new Error('Assigned staff member must be an enabled waiter in this restaurant')
      }
    }
    await ctx.db.patch(args.tableId, { assignedWaiterId: args.waiterId })
  },
})
