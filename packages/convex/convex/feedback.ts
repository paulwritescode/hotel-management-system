import { mutationGeneric, queryGeneric } from 'convex/server'
import { v } from 'convex/values'
import { requireStaff } from './_helpers'

export const submit = mutationGeneric({
  args: { restaurantId: v.id('restaurants'), orderId: v.id('orders'), phone: v.string(), rating: v.number(), comment: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!Number.isInteger(args.rating) || args.rating < 1 || args.rating > 5) throw new Error('Rating must be an integer from 1 to 5')
    const order = await ctx.db.get(args.orderId)
    if (!order || String(order.restaurantId) !== String(args.restaurantId) || order.customerPhone !== args.phone) throw new Error('Order not found')
    if (order.status !== 'served' && order.status !== 'closed') throw new Error('Feedback is accepted only after service')
    const existing = await ctx.db.query('feedback').withIndex('by_order', (query) => query.eq('orderId', args.orderId)).unique()
    if (existing) throw new Error('Feedback was already submitted')
    const comment = args.comment?.trim()
    if (comment && comment.length > 2000) throw new Error('Feedback comment is too long')
    if (args.rating > 3 && comment) throw new Error('Comments are collected only for ratings of 3 or below')
    const feedbackId = await ctx.db.insert('feedback', {
      restaurantId: args.restaurantId,
      orderId: args.orderId,
      rating: args.rating,
      comment: comment || undefined,
      itemIds: [...new Set(order.lines.map((line: { itemId: any }) => line.itemId))],
      waiterId: order.servedByStaffId,
      createdAt: Date.now(),
    })
    const session = await ctx.db.query('sessions').withIndex('by_phone', (query) => query.eq('phone', args.phone)).unique()
    if (session && String(session.activeOrderId) === String(args.orderId) && args.rating > 3) await ctx.db.patch(session._id, { state: 'CLOSED', cart: [] })
    return feedbackId
  },
})

export const addComment = mutationGeneric({
  args: { restaurantId: v.id('restaurants'), orderId: v.id('orders'), phone: v.string(), comment: v.string() },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId)
    if (!order || String(order.restaurantId) !== String(args.restaurantId) || order.customerPhone !== args.phone) throw new Error('Order not found')
    const feedback = await ctx.db.query('feedback').withIndex('by_order', (query) => query.eq('orderId', args.orderId)).unique()
    if (!feedback || feedback.rating > 3) throw new Error('A low rating is required before adding a comment')
    if (feedback.comment) throw new Error('Feedback comment was already submitted')
    const comment = args.comment.trim()
    if (!comment || comment.length > 2000) throw new Error('Comment must be 1 to 2000 characters')
    await ctx.db.patch(feedback._id, { comment })
    const session = await ctx.db.query('sessions').withIndex('by_phone', (query) => query.eq('phone', args.phone)).unique()
    if (session && String(session.activeOrderId) === String(args.orderId)) await ctx.db.patch(session._id, { state: 'CLOSED', cart: [] })
  },
})

export const list = queryGeneric({
  args: { token: v.string(), restaurantId: v.id('restaurants') },
  handler: async (ctx, args) => {
    await requireStaff(ctx.db, args.token, ['manager'], String(args.restaurantId))
    return ctx.db.query('feedback').withIndex('by_restaurant', (query) => query.eq('restaurantId', args.restaurantId)).order('desc').collect()
  },
})
