import { mutationGeneric, queryGeneric } from 'convex/server'
import { v } from 'convex/values'
import {
  assertOptionalNonNegativeInteger,
  assertPositiveInteger,
  cleanRequired,
  logActivity,
  requireStaff,
} from './_helpers'

const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

const category = v.union(
  v.literal('staple'), v.literal('vegetable'), v.literal('meat'),
  v.literal('bread'), v.literal('drink'), v.literal('dessert'), v.literal('side'),
)
const baseItemInput = {
  name: v.string(),
  nameSwahili: v.optional(v.string()),
  description: v.optional(v.string()),
  category,
  priceKes: v.number(),
  available: v.boolean(),
  quantityOnHand: v.optional(v.number()),
  unit: v.optional(v.string()),
}
const imageInput = {
  imageStorageId: v.optional(v.id('_storage')),
  externalImageUrl: v.optional(v.string()),
  imageAlt: v.optional(v.string()),
  imageCredit: v.optional(v.string()),
  imageCreditUrl: v.optional(v.string()),
}
const itemInput = { ...baseItemInput, ...imageInput }

type ItemInput = {
  name: string
  nameSwahili?: string
  description?: string
  category: 'staple' | 'vegetable' | 'meat' | 'bread' | 'drink' | 'dessert' | 'side'
  priceKes: number
  available: boolean
  quantityOnHand?: number
  unit?: string
  imageStorageId?: any
  externalImageUrl?: string
  imageAlt?: string
  imageCredit?: string
  imageCreditUrl?: string
}

function optionalText(value: string | undefined, max: number): string | undefined {
  if (value === undefined) return undefined
  const clean = value.trim()
  if (!clean) return undefined
  if (clean.length > max) throw new Error('Item text is too long')
  return clean
}

function optionalHttpsUrl(value: string | undefined, field: string): string | undefined {
  const clean = optionalText(value, 1000)
  if (!clean) return undefined
  let url: URL
  try { url = new URL(clean) } catch { throw new Error(`${field} must be a valid URL`) }
  if (url.protocol !== 'https:') throw new Error(`${field} must use HTTPS`)
  return url.toString()
}

function normalized(input: ItemInput) {
  assertPositiveInteger(input.priceKes, 'priceKes')
  assertOptionalNonNegativeInteger(input.quantityOnHand, 'quantityOnHand')
  const item: Record<string, unknown> = {
    name: cleanRequired(input.name, 'name', 120),
    nameSwahili: optionalText(input.nameSwahili, 120),
    description: optionalText(input.description, 1000),
    category: input.category,
    priceKes: input.priceKes,
    available: input.quantityOnHand === 0 ? false : input.available,
    quantityOnHand: input.quantityOnHand,
    unit: optionalText(input.unit, 30),
  }
  if (input.imageStorageId) item.imageStorageId = input.imageStorageId
  const externalImageUrl = optionalHttpsUrl(input.externalImageUrl, 'externalImageUrl')
  if (externalImageUrl) item.externalImageUrl = externalImageUrl
  const imageAlt = optionalText(input.imageAlt, 200)
  if (imageAlt) item.imageAlt = imageAlt
  const imageCredit = optionalText(input.imageCredit, 160)
  if (imageCredit) item.imageCredit = imageCredit
  const imageCreditUrl = optionalHttpsUrl(input.imageCreditUrl, 'imageCreditUrl')
  if (imageCreditUrl) item.imageCreditUrl = imageCreditUrl
  return item
}

async function validateStoredImage(ctx: any, storageId: any) {
  const metadata = await ctx.db.system.get('_storage', storageId)
  if (!metadata) throw new Error('Uploaded image was not found')
  if (!metadata.contentType || !ALLOWED_IMAGE_TYPES.has(metadata.contentType)) {
    throw new Error('Upload a JPEG, PNG or WebP image')
  }
  if (metadata.size > MAX_IMAGE_BYTES) throw new Error('Image must be 5 MB or smaller')
}

async function withImageUrl(ctx: any, item: any) {
  const storedUrl = item.imageStorageId ? await ctx.storage.getUrl(item.imageStorageId) : null
  return { ...item, imageUrl: storedUrl ?? item.externalImageUrl }
}

export const available = queryGeneric({
  args: { restaurantId: v.id('restaurants'), category: v.optional(category) },
  handler: async (ctx, args) => {
    const items = args.category
      ? await ctx.db.query('items').withIndex('by_restaurant_category', (query: any) =>
          query.eq('restaurantId', args.restaurantId).eq('category', args.category!),
        ).collect()
      : await ctx.db.query('items').withIndex('by_restaurant_available', (query: any) =>
          query.eq('restaurantId', args.restaurantId).eq('available', true).eq('archived', false),
        ).collect()
    return Promise.all(items.filter((item) => item.available && !item.archived).map((item) => withImageUrl(ctx, item)))
  },
})

export const inventory = queryGeneric({
  args: { token: v.string(), restaurantId: v.id('restaurants'), includeArchived: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    await requireStaff(ctx.db, args.token, ['counter', 'manager'], String(args.restaurantId))
    const items = await ctx.db.query('items').withIndex('by_restaurant', (query: any) =>
      query.eq('restaurantId', args.restaurantId),
    ).collect()
    const visible = args.includeArchived ? items : items.filter((item) => !item.archived)
    return Promise.all(visible.map((item) => withImageUrl(ctx, item)))
  },
})

export const generateUploadUrl = mutationGeneric({
  args: { token: v.string(), restaurantId: v.id('restaurants') },
  handler: async (ctx, args) => {
    await requireStaff(ctx.db, args.token, ['manager'], String(args.restaurantId))
    return ctx.storage.generateUploadUrl()
  },
})

export const create = mutationGeneric({
  args: { token: v.string(), restaurantId: v.id('restaurants'), ...itemInput },
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx.db, args.token, ['manager'], String(args.restaurantId))
    if (args.imageStorageId) await validateStoredImage(ctx, args.imageStorageId)
    const item = normalized(args)
    const now = Date.now()
    const itemId = await ctx.db.insert('items', { restaurantId: args.restaurantId, ...item, archived: false, createdAt: now, updatedAt: now })
    await logActivity(ctx.db, staff, 'item_create', `Added menu item “${item.name}”`)
    return itemId
  },
})

export const update = mutationGeneric({
  args: { token: v.string(), itemId: v.id('items'), ...itemInput },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.itemId)
    if (!existing) throw new Error('Item not found')
    const staff = await requireStaff(ctx.db, args.token, ['manager'], String(existing.restaurantId))
    if (args.imageStorageId) await validateStoredImage(ctx, args.imageStorageId)
    const item = normalized(args)
    const replacingStoredImage = Boolean(args.imageStorageId && String(args.imageStorageId) !== String(existing.imageStorageId ?? ''))
    if (replacingStoredImage) {
      item.externalImageUrl = undefined
      item.imageCredit = undefined
      item.imageCreditUrl = undefined
    }
    await ctx.db.patch(args.itemId, { ...item, updatedAt: Date.now() })
    if (replacingStoredImage && existing.imageStorageId) await ctx.storage.delete(existing.imageStorageId)
    await logActivity(ctx.db, staff, 'item_update', `Updated menu item “${item.name}”`)
    return args.itemId
  },
})

export const setAvailability = mutationGeneric({
  args: { token: v.string(), itemId: v.id('items'), available: v.boolean() },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId)
    if (!item || item.archived) throw new Error('Item not found')
    const staff = await requireStaff(ctx.db, args.token, ['counter', 'manager'], String(item.restaurantId))
    if (args.available && item.quantityOnHand === 0) throw new Error('An out-of-stock item cannot be made available')
    await ctx.db.patch(args.itemId, { available: args.available, updatedAt: Date.now() })
    await logActivity(ctx.db, staff, 'item_availability', `Marked “${item.name}” ${args.available ? 'available' : 'unavailable'}`)
    return args.itemId
  },
})

export const archive = mutationGeneric({
  args: { token: v.string(), itemId: v.id('items') },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId)
    if (!item) throw new Error('Item not found')
    const staff = await requireStaff(ctx.db, args.token, ['manager'], String(item.restaurantId))
    await ctx.db.patch(args.itemId, { archived: true, available: false, updatedAt: Date.now() })
    await logActivity(ctx.db, staff, 'item_archive', `Archived menu item “${item.name}”`)
    return args.itemId
  },
})

export const bulkUpsert = mutationGeneric({
  args: {
    token: v.string(),
    restaurantId: v.id('restaurants'),
    rows: v.array(v.object(baseItemInput)),
    columnMappingProfile: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx.db, args.token, ['manager'], String(args.restaurantId))
    if (args.rows.length === 0 || args.rows.length > 1000) throw new Error('Import must contain 1 to 1000 rows')
    const rows = args.rows.map(normalized)
    const keys = new Set<string>()
    for (const row of rows) {
      const key = `${String(row.name).trim().toLocaleLowerCase()}\u0000${String(row.category)}`
      if (keys.has(key)) throw new Error(`Duplicate import row: ${String(row.name)} (${String(row.category)})`)
      keys.add(key)
    }
    const existing = await ctx.db.query('items').withIndex('by_restaurant', (query: any) =>
      query.eq('restaurantId', args.restaurantId),
    ).collect()
    const byKey = new Map(existing.map((item) => [
      `${item.name.trim().toLocaleLowerCase()}\u0000${item.category}`,
      item,
    ]))
    const now = Date.now()
    let inserted = 0
    let updated = 0
    for (const row of rows) {
      const key = `${String(row.name).trim().toLocaleLowerCase()}\u0000${String(row.category)}`
      const match = byKey.get(key)
      if (match) {
        await ctx.db.patch(match._id, { ...row, archived: false, updatedAt: now })
        updated += 1
      } else {
        await ctx.db.insert('items', { restaurantId: args.restaurantId, ...row, archived: false, createdAt: now, updatedAt: now })
        inserted += 1
      }
    }
    if (args.columnMappingProfile !== undefined) {
      await ctx.db.patch(args.restaurantId, { columnMappingProfile: args.columnMappingProfile })
    }
    await logActivity(ctx.db, staff, 'item_import', `Imported menu (${inserted} added, ${updated} updated)`)
    return { inserted, updated }
  },
})
