import { actionGeneric, internalMutationGeneric, makeFunctionReference, mutationGeneric, queryGeneric } from 'convex/server'
import { v } from 'convex/values'
import { ROLE_LEVEL, assertMayManage, cleanRequired, requireStaff, verifySessionToken, type StaffRole } from './_helpers'
import { hashPin } from './auth'

const role = v.union(v.literal('owner'), v.literal('manager'), v.literal('counter'), v.literal('waiter'))
const readStaffRef = makeFunctionReference<'query', { staffId: string }, any>('auth:readStaff')
const createRef = makeFunctionReference<'mutation', {
  restaurantId: string; name: string; role: StaffRole; pinHash: string; pinSalt: string
  actorStaffId: string; actorRole: StaffRole
}, string>('staff:createInternal')
const setPinRef = makeFunctionReference<'mutation', {
  staffId: string; pinHash: string; pinSalt: string; actorStaffId: string; actorRole: StaffRole
}, unknown>('staff:setPinInternal')

// Verifies the acting session and returns the acting staff record. Actual role-hierarchy
// checks are performed by assertMayManage against the specific target.
async function requireActor(ctx: any, token: string, restaurantId?: string) {
  const claims = await verifySessionToken(token)
  const staff = await ctx.runQuery(readStaffRef, { staffId: claims.staffId })
  if (!staff || !staff.enabled || staff.role !== claims.role || String(staff.restaurantId) !== claims.restaurantId) {
    throw new Error('Authorization required')
  }
  if (restaurantId && claims.restaurantId !== restaurantId) throw new Error('Cross-restaurant access denied')
  return staff
}

export const list = queryGeneric({
  args: { token: v.string(), restaurantId: v.id('restaurants') },
  handler: async (ctx, args) => {
    await requireStaff(ctx.db, args.token, ['manager', 'owner'], String(args.restaurantId))
    const staff = await ctx.db.query('staff').withIndex('by_restaurant', (query) => query.eq('restaurantId', args.restaurantId)).collect()
    return staff.map(({ pinHash: _hash, pinSalt: _salt, ...safe }) => safe)
  },
})

// Returns only the rows the caller is permitted to see: their own row, plus any role strictly
// below their level. Filtering happens here so a lower-privileged client never receives rows
// it must not see. Never move this predicate to the browser.
export const listVisible = queryGeneric({
  args: { token: v.string(), restaurantId: v.id('restaurants') },
  handler: async (ctx, args) => {
    const viewer = await requireStaff(ctx.db, args.token, ['manager', 'owner'], String(args.restaurantId))
    const staff = await ctx.db.query('staff').withIndex('by_restaurant', (query) => query.eq('restaurantId', args.restaurantId)).collect()
    return staff
      .filter((member) => String(member._id) === String(viewer._id) || ROLE_LEVEL[viewer.role] > ROLE_LEVEL[member.role as StaffRole])
      .map(({ pinHash: _hash, pinSalt: _salt, ...safe }) => safe)
  },
})

export const create = actionGeneric({
  args: { token: v.string(), restaurantId: v.id('restaurants'), name: v.string(), role, pin: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.token, String(args.restaurantId))
    // Reject before hashing so an unauthorized caller cannot even trigger the work.
    assertMayManage(actor.role, args.role, String(actor._id), null)
    const name = cleanRequired(args.name, 'name', 100)
    const pin = await hashPin(args.pin)
    return ctx.runMutation(createRef, {
      restaurantId: args.restaurantId, name, role: args.role, pinHash: pin.hash, pinSalt: pin.salt,
      actorStaffId: String(actor._id), actorRole: actor.role,
    })
  },
})

export const createInternal = internalMutationGeneric({
  args: {
    restaurantId: v.id('restaurants'), name: v.string(), role, pinHash: v.string(), pinSalt: v.string(),
    actorStaffId: v.id('staff'), actorRole: role,
  },
  handler: async (ctx, args) => {
    // Re-check inside the transaction so authorization and the audit row are atomic.
    assertMayManage(args.actorRole as StaffRole, args.role as StaffRole, String(args.actorStaffId), null)
    const now = Date.now()
    const staffId = await ctx.db.insert('staff', {
      restaurantId: args.restaurantId, name: args.name, role: args.role,
      pinHash: args.pinHash, pinSalt: args.pinSalt, enabled: true, failedAttempts: 0, createdAt: now,
    })
    await ctx.db.insert('staffAudit', {
      restaurantId: args.restaurantId, actorStaffId: args.actorStaffId, actorRole: args.actorRole,
      action: 'create', targetStaffId: staffId, targetRoleAfter: args.role, at: now,
    })
    return staffId
  },
})

export const setPin = actionGeneric({
  args: { token: v.string(), staffId: v.id('staff'), pin: v.string() },
  handler: async (ctx, args) => {
    const target = await ctx.runQuery(readStaffRef, { staffId: args.staffId })
    if (!target) throw new Error('Staff member not found')
    const actor = await requireActor(ctx, args.token, String(target.restaurantId))
    assertMayManage(actor.role, target.role, String(actor._id), String(target._id))
    const pin = await hashPin(args.pin)
    await ctx.runMutation(setPinRef, {
      staffId: args.staffId, pinHash: pin.hash, pinSalt: pin.salt,
      actorStaffId: String(actor._id), actorRole: actor.role,
    })
  },
})

export const setPinInternal = internalMutationGeneric({
  args: {
    staffId: v.id('staff'), pinHash: v.string(), pinSalt: v.string(),
    actorStaffId: v.id('staff'), actorRole: role,
  },
  handler: async (ctx, args) => {
    const staff = await ctx.db.get(args.staffId)
    if (!staff) throw new Error('Staff member not found')
    assertMayManage(args.actorRole as StaffRole, staff.role as StaffRole, String(args.actorStaffId), String(args.staffId))
    const now = Date.now()
    await ctx.db.patch(args.staffId, { pinHash: args.pinHash, pinSalt: args.pinSalt, failedAttempts: 0, lockedUntil: undefined })
    // A reset is recorded; no part of the PIN value ever appears in the audit row.
    await ctx.db.insert('staffAudit', {
      restaurantId: staff.restaurantId, actorStaffId: args.actorStaffId, actorRole: args.actorRole,
      action: 'reset_pin', targetStaffId: args.staffId, at: now,
    })
  },
})

export const update = mutationGeneric({
  args: { token: v.string(), staffId: v.id('staff'), name: v.string(), role, enabled: v.boolean() },
  handler: async (ctx, args) => {
    const target = await ctx.db.get(args.staffId)
    if (!target) throw new Error('Staff member not found')
    const actor = await requireStaff(ctx.db, args.token, ['manager', 'owner'], String(target.restaurantId))
    // Guard against the current role and the requested role so a manager cannot promote to manager/owner.
    assertMayManage(actor.role, target.role as StaffRole, String(actor._id), String(target._id))
    assertMayManage(actor.role, args.role, String(actor._id), null)
    const now = Date.now()
    const roleChanged = target.role !== args.role
    const enabledChanged = target.enabled !== args.enabled
    await ctx.db.patch(args.staffId, {
      name: cleanRequired(args.name, 'name', 100), role: args.role, enabled: args.enabled,
      failedAttempts: args.enabled ? target.failedAttempts : 0, lockedUntil: undefined,
    })
    if (roleChanged) {
      await ctx.db.insert('staffAudit', {
        restaurantId: target.restaurantId, actorStaffId: actor._id, actorRole: actor.role,
        action: 'update_role', targetStaffId: args.staffId,
        targetRoleBefore: target.role, targetRoleAfter: args.role, at: now,
      })
    }
    if (enabledChanged) {
      await ctx.db.insert('staffAudit', {
        restaurantId: target.restaurantId, actorStaffId: actor._id, actorRole: actor.role,
        action: args.enabled ? 'enable' : 'disable', targetStaffId: args.staffId, at: now,
      })
    }
  },
})

// Owner-only. Rejects any non-owner caller so a crafted request from a lower role returns
// nothing. Enriches rows with actor/target names; audit rows never contain PIN data.
export const auditTrail = queryGeneric({
  args: { token: v.string(), restaurantId: v.id('restaurants') },
  handler: async (ctx, args) => {
    await requireStaff(ctx.db, args.token, ['owner'], String(args.restaurantId))
    const rows = await ctx.db.query('staffAudit').withIndex('by_restaurant_at', (query) => query.eq('restaurantId', args.restaurantId)).order('desc').take(100)
    const nameCache = new Map<string, string>()
    const nameOf = async (id: any): Promise<string> => {
      const key = String(id)
      if (nameCache.has(key)) return nameCache.get(key)!
      const staff = await ctx.db.get(id)
      const name = staff?.name ?? 'Removed staff'
      nameCache.set(key, name)
      return name
    }
    return Promise.all(rows.map(async (row) => ({
      _id: row._id,
      actorName: await nameOf(row.actorStaffId),
      actorRole: row.actorRole,
      action: row.action,
      targetName: await nameOf(row.targetStaffId),
      targetRoleBefore: row.targetRoleBefore,
      targetRoleAfter: row.targetRoleAfter,
      at: row.at,
    })))
  },
})
