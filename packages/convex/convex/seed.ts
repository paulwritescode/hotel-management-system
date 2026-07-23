import { actionGeneric, internalMutationGeneric, makeFunctionReference } from 'convex/server'
import { v } from 'convex/values'
import { hashPin } from './auth'

type StaffRole = 'counter' | 'waiter' | 'manager'
type ItemCategory = 'staple' | 'vegetable' | 'meat' | 'bread' | 'drink' | 'dessert' | 'side'
type OrderStatus = 'pending' | 'acknowledged' | 'preparing' | 'ready' | 'served' | 'closed' | 'cancelled'

type CatalogItem = {
  name: string
  nameSwahili: string
  description: string
  category: ItemCategory
  priceKes: number
  unit: string
  imageUrl: string
  imageAlt: string
  creditUrl: string
}

const inventoryCatalog: CatalogItem[] = [
  {
    name: 'Ugali', nameSwahili: 'Ugali', category: 'staple', priceKes: 120, unit: 'plate',
    description: 'Traditional Kenyan maize meal cooked until smooth and firm, served piping hot as the perfect accompaniment for stew, grilled meat or sautéed greens.',
    imageUrl: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=80', imageAlt: 'Freshly prepared maize meal with vegetables', creditUrl: 'https://unsplash.com/s/photos/african-food',
  },
  {
    name: 'Pilau', nameSwahili: 'Pilau', category: 'staple', priceKes: 300, unit: 'plate',
    description: 'Fragrant coastal rice simmered with warm cardamom, cumin, cinnamon and cloves, then finished with tender beef and fresh kachumbari.',
    imageUrl: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=1200&q=80', imageAlt: 'Aromatic spiced rice served with herbs', creditUrl: 'https://unsplash.com/s/photos/pilau',
  },
  {
    name: 'Chapati', nameSwahili: 'Chapati', category: 'bread', priceKes: 60, unit: 'pcs',
    description: 'Soft, flaky whole-wheat flatbread hand-rolled in layers and cooked on the griddle until golden with lightly crisp edges.',
    imageUrl: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=1200&q=80', imageAlt: 'Fresh golden flatbread stacked for serving', creditUrl: 'https://unsplash.com/s/photos/flatbread',
  },
  {
    name: 'Sukuma Wiki', nameSwahili: 'Sukuma Wiki', category: 'vegetable', priceKes: 100, unit: 'plate',
    description: 'Fresh collard greens finely sliced and sautéed with ripe tomato, onion and gentle seasoning for a light, savoury vegetable side.',
    imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=80', imageAlt: 'A colourful bowl of fresh leafy greens', creditUrl: 'https://unsplash.com/s/photos/greens',
  },
  {
    name: 'Beef Stew', nameSwahili: 'Mchuzi wa Ng’ombe', category: 'meat', priceKes: 380, unit: 'plate',
    description: 'Slow-braised beef with tomato, carrot, onion and aromatic herbs, finished in a rich savoury gravy made for scooping up with ugali.',
    imageUrl: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?auto=format&fit=crop&w=1200&q=80', imageAlt: 'Tender beef in a rich savoury sauce', creditUrl: 'https://unsplash.com/s/photos/beef-stew',
  },
  {
    name: 'Grilled Chicken', nameSwahili: 'Kuku wa Kuchoma', category: 'meat', priceKes: 450, unit: 'plate',
    description: 'Chicken marinated with garlic, lemon and house spices, then char-grilled until smoky outside and succulent at the centre.',
    imageUrl: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=1200&q=80', imageAlt: 'Char-grilled chicken with herbs and lemon', creditUrl: 'https://unsplash.com/s/photos/grilled-chicken',
  },
  {
    name: 'Nyama Choma', nameSwahili: 'Nyama Choma', category: 'meat', priceKes: 650, unit: 'plate',
    description: 'Kenyan-style goat seasoned simply and fire-roasted for deep smoky flavour, carved to order and served with kachumbari.',
    imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80', imageAlt: 'Fire-roasted sliced meat ready to serve', creditUrl: 'https://unsplash.com/s/photos/grilled-meat',
  },
  {
    name: 'Kachumbari', nameSwahili: 'Kachumbari', category: 'side', priceKes: 100, unit: 'plate',
    description: 'A crisp East African salad of ripe tomato, red onion, coriander and citrus, prepared fresh for a bright finish alongside grilled dishes.',
    imageUrl: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=1200&q=80', imageAlt: 'Fresh tomato, onion and herb salad', creditUrl: 'https://unsplash.com/s/photos/fresh-salad',
  },
  {
    name: 'Masala Chips', nameSwahili: 'Chips Masala', category: 'side', priceKes: 250, unit: 'plate',
    description: 'Crisp golden chips tossed in a sticky tomato masala with garlic, coriander and mild chilli for a bold sweet-spiced coating.',
    imageUrl: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=1200&q=80', imageAlt: 'Golden seasoned chips served hot', creditUrl: 'https://unsplash.com/s/photos/masala-fries',
  },
  {
    name: 'Fresh Passion Juice', nameSwahili: 'Juisi ya Passion', category: 'drink', priceKes: 180, unit: 'L',
    description: 'Ripe passion fruit blended to order and served chilled for a naturally sweet, tangy and refreshing tropical drink.',
    imageUrl: 'https://images.unsplash.com/photo-1546173159-315724a31696?auto=format&fit=crop&w=1200&q=80', imageAlt: 'Chilled glasses of fresh tropical fruit juice', creditUrl: 'https://unsplash.com/s/photos/passion-fruit-juice',
  },
  {
    name: 'Kenyan Tea', nameSwahili: 'Chai ya Maziwa', category: 'drink', priceKes: 100, unit: 'cup',
    description: 'Bold Kenyan black tea simmered with milk and warming spice, poured hot for a smooth and comforting finish to any meal.',
    imageUrl: 'https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?auto=format&fit=crop&w=1200&q=80', imageAlt: 'A warm cup of Kenyan-style milk tea', creditUrl: 'https://unsplash.com/s/photos/milk-tea',
  },
  {
    name: 'Fruit Salad', nameSwahili: 'Saladi ya Matunda', category: 'dessert', priceKes: 220, unit: 'plate',
    description: 'A chilled selection of ripe seasonal fruit cut fresh each day and lightly dressed with citrus for a clean, naturally sweet dessert.',
    imageUrl: 'https://images.unsplash.com/photo-1564093497595-593b96d80180?auto=format&fit=crop&w=1200&q=80', imageAlt: 'Colourful seasonal fruit salad', creditUrl: 'https://unsplash.com/s/photos/fruit-salad',
  },
]

const applySeedRef = makeFunctionReference<'mutation', {
  restaurant: { name: string; phoneMsisdn: string }
  staff: Array<{ name: string; role: StaffRole; pinHash: string; pinSalt: string }>
}, unknown>('seed:applySeed')
const applyEnrichmentRef = makeFunctionReference<'mutation', { restaurantId: string }, unknown>('seed:applyEnrichment')
const applyOwnerRef = makeFunctionReference<'mutation', {
  restaurantId: string; name: string; pinHash: string; pinSalt: string
}, unknown>('seed:applyOwner')
const applyOwnerPinRef = makeFunctionReference<'mutation', {
  restaurantId: string; pinHash: string; pinSalt: string
}, unknown>('seed:applyOwnerPin')

function secureEqual(left: string, right: string): boolean {
  const a = new TextEncoder().encode(left)
  const b = new TextEncoder().encode(right)
  if (a.length !== b.length) return false
  let difference = 0
  for (let index = 0; index < a.length; index += 1) difference |= a[index]! ^ b[index]!
  return difference === 0
}

function requireSeedSecret(value: string): void {
  const expected = (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process?.env?.SEED_SECRET
  if (!expected || !secureEqual(value, expected)) throw new Error('Seed authorization failed')
}

function cleanName(value: string, field: string): string {
  const cleaned = value.trim()
  if (!cleaned) throw new Error(`${field} is required`)
  if (cleaned.length > 100) throw new Error(`${field} must be at most 100 characters`)
  return cleaned
}

function cleanPhoneMsisdn(value: string): string {
  const cleaned = value.trim()
  if (!/^\+[1-9]\d{7,14}$/u.test(cleaned)) {
    throw new Error('Restaurant WhatsApp number must use E.164 format, for example +254712345678')
  }
  return cleaned
}

export const demo = actionGeneric({
  args: {
    seedSecret: v.string(), restaurantName: v.string(), phoneMsisdn: v.string(),
    managerName: v.string(), managerPin: v.string(), counterName: v.string(),
    counterPin: v.string(), waiterName: v.string(), waiterPin: v.string(),
  },
  handler: async (ctx, args) => {
    requireSeedSecret(args.seedSecret)
    if (new Set([args.managerPin, args.counterPin, args.waiterPin]).size !== 3) throw new Error('Each staff account must use a unique PIN')
    const [manager, counter, waiter] = await Promise.all([hashPin(args.managerPin), hashPin(args.counterPin), hashPin(args.waiterPin)])
    return ctx.runMutation(applySeedRef, {
      restaurant: { name: cleanName(args.restaurantName, 'Restaurant name'), phoneMsisdn: cleanPhoneMsisdn(args.phoneMsisdn) },
      staff: [
        { name: cleanName(args.managerName, 'Manager name'), role: 'manager', pinHash: manager.hash, pinSalt: manager.salt },
        { name: cleanName(args.counterName, 'Counter staff name'), role: 'counter', pinHash: counter.hash, pinSalt: counter.salt },
        { name: cleanName(args.waiterName, 'Waiter name'), role: 'waiter', pinHash: waiter.hash, pinSalt: waiter.salt },
      ],
    })
  },
})

export const enrichDemo = actionGeneric({
  args: { seedSecret: v.string(), restaurantId: v.id('restaurants') },
  handler: async (ctx, args) => {
    requireSeedSecret(args.seedSecret)
    return ctx.runMutation(applyEnrichmentRef, { restaurantId: String(args.restaurantId) })
  },
})

export const applySeed = internalMutationGeneric({
  args: {
    restaurant: v.object({ name: v.string(), phoneMsisdn: v.string() }),
    staff: v.array(v.object({
      name: v.string(), role: v.union(v.literal('counter'), v.literal('waiter'), v.literal('manager')),
      pinHash: v.string(), pinSalt: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    if (args.staff.length !== 3 || new Set(args.staff.map((entry) => entry.role)).size !== 3) throw new Error('Seed requires exactly one staff member per role')
    if ((await ctx.db.query('restaurants').take(1)).length > 0) throw new Error('Seed can run only on an empty deployment')
    const now = Date.now()
    const restaurantId = await ctx.db.insert('restaurants', { name: args.restaurant.name, phoneMsisdn: args.restaurant.phoneMsisdn, currency: 'KES', createdAt: now })
    const staffIds = new Map<string, any>()
    for (const member of args.staff) {
      const id = await ctx.db.insert('staff', { restaurantId, name: member.name, role: member.role, pinHash: member.pinHash, pinSalt: member.pinSalt, enabled: true, failedAttempts: 0, createdAt: now })
      staffIds.set(member.role, id)
    }
    for (let number = 1; number <= 6; number += 1) {
      await ctx.db.insert('tables', { restaurantId, number, seats: number <= 2 ? 2 : number <= 5 ? 4 : 6, assignedWaiterId: staffIds.get('waiter'), active: true })
    }
    for (const item of inventoryCatalog) {
      await ctx.db.insert('items', {
        restaurantId, name: item.name, nameSwahili: item.nameSwahili, description: item.description,
        category: item.category, priceKes: item.priceKes, unit: item.unit, available: true,
        quantityOnHand: 30, externalImageUrl: item.imageUrl, imageAlt: item.imageAlt,
        imageCredit: 'Photo on Unsplash', imageCreditUrl: item.creditUrl,
        archived: false, createdAt: now, updatedAt: now,
      })
    }
    return { restaurantId, staffIds: Object.fromEntries(staffIds), tables: 6, items: inventoryCatalog.length }
  },
})

export const applyEnrichment = internalMutationGeneric({
  args: { restaurantId: v.id('restaurants') },
  handler: async (ctx, args) => {
    const restaurant = await ctx.db.get(args.restaurantId)
    if (!restaurant) throw new Error('Restaurant not found')
    const now = Date.now()
    const staff = await ctx.db.query('staff').withIndex('by_restaurant', (query: any) => query.eq('restaurantId', args.restaurantId)).collect()
    const manager = staff.find((member) => member.role === 'manager')
    const counter = staff.find((member) => member.role === 'counter')
    const waiter = staff.find((member) => member.role === 'waiter')
    if (!manager || !counter || !waiter) throw new Error('Manager, counter and waiter records are required before enrichment')

    const items = await ctx.db.query('items').withIndex('by_restaurant', (query: any) => query.eq('restaurantId', args.restaurantId)).collect()
    const itemsByName = new Map(items.map((item) => [item.name.toLocaleLowerCase(), item]))
    let itemsUpdated = 0
    for (const catalogItem of inventoryCatalog) {
      const item = itemsByName.get(catalogItem.name.toLocaleLowerCase())
      if (!item) continue
      await ctx.db.patch(item._id, {
        nameSwahili: catalogItem.nameSwahili, description: catalogItem.description,
        externalImageUrl: catalogItem.imageUrl, imageAlt: catalogItem.imageAlt,
        imageCredit: 'Photo on Unsplash', imageCreditUrl: catalogItem.creditUrl,
        updatedAt: now,
      })
      itemsUpdated += 1
    }

    const refreshedItems = await ctx.db.query('items').withIndex('by_restaurant', (query: any) => query.eq('restaurantId', args.restaurantId)).collect()
    const menu = new Map(refreshedItems.map((item) => [item.name, item]))
    const requiredItem = (name: string) => {
      const item = menu.get(name)
      if (!item) throw new Error(`Required menu item is missing: ${name}`)
      return item
    }

    const existingTables = await ctx.db.query('tables').withIndex('by_restaurant_number', (query: any) => query.eq('restaurantId', args.restaurantId)).collect()
    const tableNumbers = new Set(existingTables.map((table) => table.number))
    let tablesAdded = 0
    for (let number = 1; number <= 12; number += 1) {
      if (tableNumbers.has(number)) continue
      await ctx.db.insert('tables', { restaurantId: args.restaurantId, number, seats: number % 4 === 0 ? 6 : number % 3 === 0 ? 2 : 4, assignedWaiterId: waiter._id, active: true })
      tablesAdded += 1
    }

    let orders = await ctx.db.query('orders').withIndex('by_restaurant_placedAt', (query: any) => query.eq('restaurantId', args.restaurantId)).collect()
    let ordersAdded = 0
    if (orders.length === 0) {
      const specs: Array<{ table: number; source: 'whatsapp' | 'counter'; customer: string; phone?: string; status: OrderStatus; minutesAgo: number; lines: Array<[string, number]>; cancellationReason?: string }> = [
        { table: 1, source: 'whatsapp', customer: 'Wanjiru Kamau', phone: '+254711000101', status: 'pending', minutesAgo: 7, lines: [['Pilau', 2], ['Fresh Passion Juice', 1]] },
        { table: 2, source: 'counter', customer: 'Walk-in guest', status: 'acknowledged', minutesAgo: 14, lines: [['Ugali', 2], ['Beef Stew', 2], ['Sukuma Wiki', 1]] },
        { table: 3, source: 'whatsapp', customer: 'Brian Ouma', phone: '+254711000103', status: 'preparing', minutesAgo: 24, lines: [['Grilled Chicken', 2], ['Masala Chips', 2]] },
        { table: 4, source: 'counter', customer: 'Faith Njeri', status: 'ready', minutesAgo: 31, lines: [['Nyama Choma', 1], ['Kachumbari', 2], ['Ugali', 2]] },
        { table: 5, source: 'whatsapp', customer: 'Ali Hassan', phone: '+254711000105', status: 'served', minutesAgo: 52, lines: [['Pilau', 1], ['Kenyan Tea', 2]] },
        { table: 6, source: 'whatsapp', customer: 'Mercy Atieno', phone: '+254711000106', status: 'closed', minutesAgo: 95, lines: [['Chapati', 3], ['Beef Stew', 1], ['Fruit Salad', 1]] },
        { table: 7, source: 'counter', customer: 'John Mwangi', status: 'closed', minutesAgo: 180, lines: [['Grilled Chicken', 1], ['Sukuma Wiki', 1], ['Fresh Passion Juice', 2]] },
        { table: 8, source: 'whatsapp', customer: 'Zawadi Muli', phone: '+254711000108', status: 'cancelled', minutesAgo: 43, lines: [['Masala Chips', 1], ['Kenyan Tea', 1]], cancellationReason: 'Guest changed plans before preparation' },
        { table: 9, source: 'whatsapp', customer: 'Peter Kiptoo', phone: '+254711000109', status: 'closed', minutesAgo: 1440, lines: [['Nyama Choma', 2], ['Kachumbari', 2], ['Ugali', 3]] },
        { table: 10, source: 'counter', customer: 'Office lunch', status: 'closed', minutesAgo: 2880, lines: [['Pilau', 5], ['Grilled Chicken', 3], ['Fresh Passion Juice', 4]] },
        { table: 11, source: 'whatsapp', customer: 'Esther Chebet', phone: '+254711000111', status: 'closed', minutesAgo: 4320, lines: [['Chapati', 2], ['Beef Stew', 1], ['Kenyan Tea', 1]] },
        { table: 12, source: 'counter', customer: 'Family table', status: 'closed', minutesAgo: 7200, lines: [['Ugali', 4], ['Nyama Choma', 2], ['Sukuma Wiki', 2], ['Fruit Salad', 3]] },
      ]
      const created: any[] = []
      for (const spec of specs) {
        const placedAt = now - spec.minutesAgo * 60_000
        const lines = spec.lines.map(([name, quantity]) => {
          const item = requiredItem(name)
          return { itemId: item._id, nameSnapshot: item.name, priceKesSnapshot: item.priceKes, quantity }
        })
        const record: any = {
          restaurantId: args.restaurantId, tableNumber: spec.table, source: spec.source,
          customerName: spec.customer, lines,
          totalKes: lines.reduce((sum, line) => sum + line.priceKesSnapshot * line.quantity, 0),
          status: spec.status, placedAt,
        }
        if (spec.phone) record.customerPhone = spec.phone
        if (!['pending', 'cancelled'].includes(spec.status)) {
          record.acknowledgedByStaffId = counter._id
          record.acknowledgedAt = placedAt + 3 * 60_000
        }
        if (['served', 'closed'].includes(spec.status)) {
          record.servedByStaffId = waiter._id
          record.servedAt = placedAt + 28 * 60_000
        }
        if (spec.status === 'closed') record.closedAt = placedAt + 52 * 60_000
        if (spec.status === 'cancelled') {
          record.cancelledByStaffId = manager._id
          record.cancellationReason = spec.cancellationReason
          record.closedAt = placedAt + 4 * 60_000
        }
        const orderId = await ctx.db.insert('orders', record)
        created.push({ _id: orderId, ...record })
        ordersAdded += 1
      }
      orders = created
    }

    const existingSessions = await ctx.db.query('sessions').collect()
    let sessionsAdded = 0
    if (existingSessions.length === 0) {
      for (const order of orders.filter((entry) => entry.customerPhone).slice(0, 7)) {
        const state = order.status === 'served' ? 'AWAITING_FEEDBACK' : ['closed', 'cancelled'].includes(order.status) ? 'CLOSED' : 'PLACED'
        await ctx.db.insert('sessions', {
          restaurantId: args.restaurantId, phone: order.customerPhone, state,
          tableNumber: order.tableNumber, customerName: order.customerName, language: order.tableNumber % 2 === 0 ? 'sw' : 'en',
          cart: [], activeOrderId: order._id, marketingConsent: order.tableNumber % 3 === 0 ? 'granted' : 'unasked',
          lastMessageAt: Math.min(now, order.placedAt + 5 * 60_000), expiresAt: now + 24 * 60 * 60 * 1000,
        })
        sessionsAdded += 1
      }
    }

    let messagesAdded = 0
    for (let index = 1; index <= 8; index += 1) {
      const wamid = `demo.heavenly-foods.${index}`
      const existing = await ctx.db.query('processedMessages').withIndex('by_wamid', (query: any) => query.eq('wamid', wamid)).unique()
      if (existing) continue
      await ctx.db.insert('processedMessages', { wamid, processedAt: now - index * 11 * 60_000, expiresAt: now + 7 * 24 * 60 * 60 * 1000 })
      messagesAdded += 1
    }

    const existingFeedback = await ctx.db.query('feedback').withIndex('by_restaurant', (query: any) => query.eq('restaurantId', args.restaurantId)).collect()
    let feedbackAdded = 0
    if (existingFeedback.length === 0) {
      const completed = orders.filter((order) => ['served', 'closed'].includes(order.status)).slice(0, 5)
      const reviews = [
        { rating: 5 },
        { rating: 4 },
        { rating: 3, comment: 'The meal was flavourful, but the tea arrived later than expected.' },
        { rating: 5 },
        { rating: 2, comment: 'The meat was tasty but a little too firm for our table.' },
      ]
      for (let index = 0; index < completed.length; index += 1) {
        const order = completed[index]!
        const review = reviews[index]!
        await ctx.db.insert('feedback', {
          restaurantId: args.restaurantId, orderId: order._id, rating: review.rating,
          ...(review.comment ? { comment: review.comment } : {}),
          itemIds: [...new Set(order.lines.map((line: any) => line.itemId))],
          waiterId: order.servedByStaffId, createdAt: Math.min(now, (order.servedAt ?? order.placedAt) + 12 * 60_000),
        })
        feedbackAdded += 1
      }
    }

    return { itemsUpdated, tablesAdded, ordersAdded, sessionsAdded, messagesAdded, feedbackAdded }
  },
})

// Adds the single owner account to an existing deployment. There is deliberately no in-app
// path to create an owner; recovery of a lost owner PIN also runs from the Convex dashboard.
export const addOwner = actionGeneric({
  args: { seedSecret: v.string(), restaurantId: v.id('restaurants'), name: v.string(), pin: v.string() },
  handler: async (ctx, args) => {
    requireSeedSecret(args.seedSecret)
    if (!/^\d{6}$/u.test(args.pin)) throw new Error('Owner PIN must be exactly 6 digits')
    const owner = await hashPin(args.pin)
    return ctx.runMutation(applyOwnerRef, {
      restaurantId: String(args.restaurantId),
      name: cleanName(args.name, 'Owner name'),
      pinHash: owner.hash,
      pinSalt: owner.salt,
    })
  },
})

export const applyOwner = internalMutationGeneric({
  args: { restaurantId: v.id('restaurants'), name: v.string(), pinHash: v.string(), pinSalt: v.string() },
  handler: async (ctx, args) => {
    const restaurant = await ctx.db.get(args.restaurantId)
    if (!restaurant) throw new Error('Restaurant not found')
    const staff = await ctx.db.query('staff').withIndex('by_restaurant', (query: any) => query.eq('restaurantId', args.restaurantId)).collect()
    if (staff.some((member) => member.role === 'owner')) throw new Error('An owner already exists for this restaurant')
    const now = Date.now()
    const ownerId = await ctx.db.insert('staff', {
      restaurantId: args.restaurantId, name: args.name, role: 'owner',
      pinHash: args.pinHash, pinSalt: args.pinSalt, enabled: true, failedAttempts: 0, createdAt: now,
    })
    await ctx.db.insert('staffAudit', {
      restaurantId: args.restaurantId, actorStaffId: ownerId, actorRole: 'owner',
      action: 'create', targetStaffId: ownerId, targetRoleAfter: 'owner', at: now,
    })
    return { ownerId }
  },
})

// Out-of-band owner PIN recovery. The owner cannot reset their own PIN in-app, so this runs
// from the Convex dashboard/CLI with the seed secret. Owner PINs are always exactly 6 digits.
export const resetOwnerPin = actionGeneric({
  args: { seedSecret: v.string(), restaurantId: v.id('restaurants'), pin: v.string() },
  handler: async (ctx, args) => {
    requireSeedSecret(args.seedSecret)
    if (!/^\d{6}$/u.test(args.pin)) throw new Error('Owner PIN must be exactly 6 digits')
    const owner = await hashPin(args.pin)
    return ctx.runMutation(applyOwnerPinRef, {
      restaurantId: String(args.restaurantId), pinHash: owner.hash, pinSalt: owner.salt,
    })
  },
})

export const applyOwnerPin = internalMutationGeneric({
  args: { restaurantId: v.id('restaurants'), pinHash: v.string(), pinSalt: v.string() },
  handler: async (ctx, args) => {
    const owner = (await ctx.db.query('staff').withIndex('by_restaurant', (query: any) => query.eq('restaurantId', args.restaurantId)).collect())
      .find((member) => member.role === 'owner')
    if (!owner) throw new Error('No owner exists for this restaurant')
    await ctx.db.patch(owner._id, { pinHash: args.pinHash, pinSalt: args.pinSalt, failedAttempts: 0, lockedUntil: undefined })
    return { ownerId: owner._id }
  },
})
