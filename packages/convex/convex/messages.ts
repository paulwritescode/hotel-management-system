import { internalMutationGeneric, mutationGeneric } from 'convex/server'
import { v } from 'convex/values'

const WAMID_TTL_MS = 24 * 60 * 60 * 1000

export const claim = mutationGeneric({
  args: { wamid: v.string() },
  handler: async (ctx, args) => {
    const wamid = args.wamid.trim()
    if (!wamid || wamid.length > 512) throw new Error('Invalid WAMID')
    const now = Date.now()
    const existing = await ctx.db.query('processedMessages').withIndex('by_wamid', (query) => query.eq('wamid', wamid)).unique()
    if (existing && existing.expiresAt > now) return { claimed: false, expiresAt: existing.expiresAt }
    if (existing) await ctx.db.delete(existing._id)
    const expiresAt = now + WAMID_TTL_MS
    await ctx.db.insert('processedMessages', { wamid, processedAt: now, expiresAt })
    return { claimed: true, expiresAt }
  },
})

export const pruneExpired = internalMutationGeneric({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(Math.trunc(args.limit ?? 500), 1), 1000)
    const expired = await ctx.db.query('processedMessages').filter((query) => query.lt(query.field('expiresAt'), Date.now())).take(limit)
    for (const message of expired) await ctx.db.delete(message._id)
    return expired.length
  },
})
