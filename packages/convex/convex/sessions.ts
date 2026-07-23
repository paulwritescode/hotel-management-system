import { internalMutationGeneric, mutationGeneric, queryGeneric } from 'convex/server'
import { v } from 'convex/values'
import { CONVERSATION_TTL_MS, assertPositiveInteger, getActiveTable } from './_helpers'

const state = v.union(
  v.literal('IDLE'), v.literal('GREETED'), v.literal('AWAITING_TABLE'),
  v.literal('BROWSING'), v.literal('CATEGORY'), v.literal('CART'),
  v.literal('AWAITING_NAME'), v.literal('AWAITING_CONSENT'), v.literal('PLACED'),
  v.literal('AWAITING_FEEDBACK'), v.literal('CLOSED'),
)
const language = v.union(v.literal('en'), v.literal('sw'))
const consent = v.union(v.literal('granted'), v.literal('denied'), v.literal('unasked'))

const transitions: Record<string, readonly string[]> = {
  IDLE: ['GREETED'],
  GREETED: ['AWAITING_TABLE', 'BROWSING'],
  AWAITING_TABLE: ['BROWSING'],
  BROWSING: ['CATEGORY', 'CART'],
  CATEGORY: ['CART', 'BROWSING'],
  CART: ['BROWSING', 'AWAITING_NAME'],
  AWAITING_NAME: ['AWAITING_CONSENT'],
  AWAITING_CONSENT: ['PLACED'],
  PLACED: ['AWAITING_FEEDBACK'],
  AWAITING_FEEDBACK: ['CLOSED'],
  CLOSED: [],
}

async function current(ctx: any, phone: string) {
  return ctx.db.query('sessions').withIndex('by_phone', (query: any) => query.eq('phone', phone)).unique()
}

export const get = queryGeneric({
  args: { restaurantId: v.id('restaurants'), phone: v.string() },
  handler: async (ctx, args) => {
    const session = await current(ctx, args.phone)
    if (!session || String(session.restaurantId) !== String(args.restaurantId) || session.expiresAt <= Date.now()) return null
    return session
  },
})

export const receive = mutationGeneric({
  args: { restaurantId: v.id('restaurants'), phone: v.string(), language: v.optional(language) },
  handler: async (ctx, args) => {
    const phone = args.phone.trim()
    if (!/^\+[1-9]\d{7,14}$/.test(phone)) throw new Error('phone must be E.164')
    const now = Date.now()
    const existing = await current(ctx, phone)
    if (!existing) {
      return ctx.db.insert('sessions', {
        restaurantId: args.restaurantId, phone, state: 'GREETED', language: args.language ?? 'en', cart: [],
        marketingConsent: 'unasked', lastMessageAt: now, expiresAt: now + CONVERSATION_TTL_MS,
      })
    }
    if (String(existing.restaurantId) !== String(args.restaurantId)) throw new Error('Phone belongs to another restaurant')
    if (existing.expiresAt <= now) {
      await ctx.db.replace(existing._id, {
        restaurantId: args.restaurantId, phone, state: 'GREETED', language: args.language ?? existing.language, cart: [],
        marketingConsent: existing.marketingConsent, lastMessageAt: now, expiresAt: now + CONVERSATION_TTL_MS,
      })
    } else {
      await ctx.db.patch(existing._id, { lastMessageAt: now, expiresAt: now + CONVERSATION_TTL_MS })
    }
    return existing._id
  },
})

export const bindTable = mutationGeneric({
  args: { restaurantId: v.id('restaurants'), phone: v.string(), tableNumber: v.number() },
  handler: async (ctx, args) => {
    assertPositiveInteger(args.tableNumber, 'tableNumber')
    await getActiveTable(ctx.db, String(args.restaurantId), args.tableNumber)
    const session = await current(ctx, args.phone)
    if (!session || String(session.restaurantId) !== String(args.restaurantId) || session.expiresAt <= Date.now()) throw new Error('Session expired')
    if (session.state !== 'GREETED' && session.state !== 'AWAITING_TABLE') throw new Error('Table cannot be changed in this state')
    const now = Date.now()
    await ctx.db.patch(session._id, { tableNumber: args.tableNumber, state: 'BROWSING', lastMessageAt: now, expiresAt: now + CONVERSATION_TTL_MS })
  },
})

export const transition = mutationGeneric({
  args: { restaurantId: v.id('restaurants'), phone: v.string(), state },
  handler: async (ctx, args) => {
    const session = await current(ctx, args.phone)
    if (!session || String(session.restaurantId) !== String(args.restaurantId) || session.expiresAt <= Date.now()) throw new Error('Session expired')
    if (!(transitions[session.state] ?? []).includes(args.state)) throw new Error(`Invalid session transition: ${session.state} -> ${args.state}`)
    const now = Date.now()
    await ctx.db.patch(session._id, { state: args.state, lastMessageAt: now, expiresAt: now + CONVERSATION_TTL_MS })
  },
})

export const setCustomerName = mutationGeneric({
  args: { restaurantId: v.id('restaurants'), phone: v.string(), customerName: v.string() },
  handler: async (ctx, args) => {
    const session = await current(ctx, args.phone)
    if (!session || String(session.restaurantId) !== String(args.restaurantId) || session.expiresAt <= Date.now()) throw new Error('Session expired')
    if (session.state !== 'AWAITING_NAME') throw new Error('Customer name is not expected')
    const customerName = args.customerName.trim()
    if (customerName.length < 2 || customerName.length > 80) throw new Error('Customer name must be 2 to 80 characters')
    const now = Date.now()
    await ctx.db.patch(session._id, { customerName, state: 'AWAITING_CONSENT', lastMessageAt: now, expiresAt: now + CONVERSATION_TTL_MS })
  },
})

export const setConsent = mutationGeneric({
  args: { restaurantId: v.id('restaurants'), phone: v.string(), consent, explicitOverride: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const session = await current(ctx, args.phone)
    if (!session || String(session.restaurantId) !== String(args.restaurantId)) throw new Error('Session not found')
    if (session.expiresAt <= Date.now()) throw new Error('Session expired; send a new message to start again')
    if (args.consent === 'unasked') throw new Error('Consent cannot be reset')
    if (session.marketingConsent !== 'unasked' && !args.explicitOverride) throw new Error('Consent was already answered')
    const now = Date.now()
    await ctx.db.patch(session._id, { marketingConsent: args.consent, lastMessageAt: now, expiresAt: now + CONVERSATION_TTL_MS })
  },
})

export const addToCart = mutationGeneric({
  args: { restaurantId: v.id('restaurants'), phone: v.string(), itemId: v.id('items'), quantity: v.number() },
  handler: async (ctx, args) => {
    assertPositiveInteger(args.quantity, 'quantity')
    const session = await current(ctx, args.phone)
    if (!session || String(session.restaurantId) !== String(args.restaurantId) || session.expiresAt <= Date.now()) throw new Error('Session expired')
    if (!['BROWSING', 'CATEGORY', 'CART'].includes(session.state)) throw new Error('Cart cannot be changed in this state')
    const item = await ctx.db.get(args.itemId)
    if (!item || String(item.restaurantId) !== String(args.restaurantId) || item.archived || !item.available) throw new Error('Item is unavailable')
    const cart = [...session.cart]
    const line = cart.find((entry) => String(entry.itemId) === String(args.itemId))
    const nextQuantity = (line?.quantity ?? 0) + args.quantity
    if (item.quantityOnHand !== undefined && nextQuantity > item.quantityOnHand) throw new Error(`${item.name} has insufficient stock`)
    if (line) line.quantity = nextQuantity
    else cart.push({ itemId: args.itemId, quantity: args.quantity })
    const now = Date.now()
    await ctx.db.patch(session._id, { cart, state: 'CART', lastMessageAt: now, expiresAt: now + CONVERSATION_TTL_MS })
  },
})

export const removeFromCart = mutationGeneric({
  args: { restaurantId: v.id('restaurants'), phone: v.string(), itemId: v.id('items') },
  handler: async (ctx, args) => {
    const session = await current(ctx, args.phone)
    if (!session || String(session.restaurantId) !== String(args.restaurantId) || session.expiresAt <= Date.now()) throw new Error('Session expired')
    await ctx.db.patch(session._id, { cart: session.cart.filter((line: { itemId: any }) => String(line.itemId) !== String(args.itemId)) })
  },
})

export const cancelCart = mutationGeneric({
  args: { restaurantId: v.id('restaurants'), phone: v.string() },
  handler: async (ctx, args) => {
    const session = await current(ctx, args.phone)
    if (!session || String(session.restaurantId) !== String(args.restaurantId)) throw new Error('Session not found')
    if (['PLACED', 'AWAITING_FEEDBACK', 'CLOSED'].includes(session.state)) return { cancelled: false, reason: 'Speak to your waiter to cancel a placed order' }
    const now = Date.now()
    await ctx.db.patch(session._id, { cart: [], state: session.tableNumber ? 'BROWSING' : 'AWAITING_TABLE', lastMessageAt: now, expiresAt: now + CONVERSATION_TTL_MS })
    return { cancelled: true }
  },
})

export const markAwaitingFeedback = internalMutationGeneric({
  args: { phone: v.string(), orderId: v.id('orders') },
  handler: async (ctx, args) => {
    const session = await current(ctx, args.phone)
    if (session && String(session.activeOrderId) === String(args.orderId) && session.state === 'PLACED') {
      const now = Date.now()
      await ctx.db.patch(session._id, { state: 'AWAITING_FEEDBACK', lastMessageAt: now, expiresAt: now + CONVERSATION_TTL_MS })
    }
  },
})

export const closeFeedback = internalMutationGeneric({
  args: { phone: v.string(), orderId: v.id('orders') },
  handler: async (ctx, args) => {
    const session = await current(ctx, args.phone)
    if (session && String(session.activeOrderId) === String(args.orderId) && session.state === 'AWAITING_FEEDBACK') {
      await ctx.db.patch(session._id, { state: 'CLOSED', cart: [] })
    }
  },
})

export const closeExpiredFeedback = internalMutationGeneric({
  args: {},
  handler: async (ctx) => {
    const now = Date.now()
    const sessions = await ctx.db.query('sessions').collect()
    let closed = 0
    for (const session of sessions) {
      if (session.state === 'AWAITING_FEEDBACK' && session.expiresAt <= now) {
        await ctx.db.patch(session._id, { state: 'CLOSED', cart: [] })
        closed += 1
      }
    }
    return closed
  },
})
