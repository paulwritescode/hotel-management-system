import {
  actionGeneric,
  internalMutationGeneric,
  internalQueryGeneric,
  makeFunctionReference,
} from 'convex/server'
import { v } from 'convex/values'
import {
  LOCKOUT_MS,
  MAX_FAILED_ATTEMPTS,
  PBKDF2_ITERATIONS,
  SESSION_TTL_MS,
  issueSessionToken,
} from './_helpers'

const readStaffRef = makeFunctionReference<'query', { staffId: string }, any>('auth:readStaff')
const listEnabledStaffRef = makeFunctionReference<'query', Record<string, never>, any[]>('auth:listEnabledStaff')
const recordAttemptRef = makeFunctionReference<'mutation', { staffId: string; succeeded: boolean; now: number }, any>('auth:recordAttempt')

function decodeSalt(salt: string): Uint8Array {
  const binary = atob(salt)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

function encodeBytes(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function constantTimeTextEqual(left: string, right: string): boolean {
  const leftBytes = new TextEncoder().encode(left)
  const rightBytes = new TextEncoder().encode(right)
  if (leftBytes.length !== rightBytes.length) return false
  let difference = 0
  for (let index = 0; index < leftBytes.length; index += 1) difference |= leftBytes[index]! ^ rightBytes[index]!
  return difference === 0
}

export function validatePin(pin: string): void {
  if (!/^\d{4,6}$/.test(pin)) throw new Error('PIN must contain 4 to 6 digits')
}

export async function hashPin(pin: string, salt?: string): Promise<{ hash: string; salt: string }> {
  validatePin(pin)
  const saltBytes = salt ? decodeSalt(salt) : crypto.getRandomValues(new Uint8Array(16))
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits'])
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: saltBytes as BufferSource, iterations: PBKDF2_ITERATIONS },
    key,
    256,
  )
  return { hash: encodeBytes(new Uint8Array(derived)), salt: encodeBytes(saltBytes) }
}

export const readStaff = internalQueryGeneric({
  args: { staffId: v.id('staff') },
  handler: async (ctx, args) => ctx.db.get(args.staffId),
})

export const listEnabledStaff = internalQueryGeneric({
  args: {},
  handler: async (ctx) => (await ctx.db.query('staff').collect()).filter((staff) => staff.enabled),
})

export const recordAttempt = internalMutationGeneric({
  args: { staffId: v.id('staff'), succeeded: v.boolean(), now: v.number() },
  handler: async (ctx, args) => {
    const staff = await ctx.db.get(args.staffId)
    if (!staff) return
    if (args.succeeded) {
      await ctx.db.patch(args.staffId, { failedAttempts: 0, lockedUntil: undefined })
      return
    }
    const failures = staff.lockedUntil && staff.lockedUntil <= args.now ? 1 : staff.failedAttempts + 1
    await ctx.db.patch(args.staffId, {
      failedAttempts: failures,
      lockedUntil: args.now + LOCKOUT_MS,
    })
  },
})

export const signIn = actionGeneric({
  args: { pin: v.string() },
  handler: async (ctx, args) => {
    validatePin(args.pin)
    const staffRecords = await ctx.runQuery(listEnabledStaffRef, {})
    // Every enabled record is checked so the action does not reveal which staff member matched.
    const checks = await Promise.all(staffRecords.map(async (staff) => ({
      staff,
      matched: constantTimeTextEqual((await hashPin(args.pin, staff.pinSalt)).hash, staff.pinHash),
    })))
    const matches = checks.filter((check) => check.matched)
    if (matches.length !== 1) throw new Error('Invalid credentials')

    const staff = matches[0]!.staff
    const now = Date.now()
    // PIN-only sign-in cannot safely attribute an unknown PIN to one record. It still
    // honors and resets the per-record counters maintained by targeted auth flows.
    if (staff.failedAttempts >= MAX_FAILED_ATTEMPTS && staff.lockedUntil && staff.lockedUntil > now) {
      throw new Error('Too many attempts; try again later')
    }
    await ctx.runMutation(recordAttemptRef, { staffId: staff._id, succeeded: true, now })
    const expiresAt = now + SESSION_TTL_MS
    const token = await issueSessionToken({
      staffId: String(staff._id),
      restaurantId: String(staff.restaurantId),
      role: staff.role,
      exp: expiresAt,
    })
    return {
      token,
      expiresAt,
      restaurantId: staff.restaurantId,
      staff: { id: staff._id, name: staff.name, role: staff.role },
    }
  },
})

export const login = actionGeneric({
  args: { staffId: v.id('staff'), pin: v.string() },
  handler: async (ctx, args) => {
    validatePin(args.pin)
    const staff = await ctx.runQuery(readStaffRef, { staffId: args.staffId })
    if (!staff || !staff.enabled) throw new Error('Invalid credentials')
    const now = Date.now()
    if (staff.failedAttempts >= MAX_FAILED_ATTEMPTS && staff.lockedUntil && staff.lockedUntil > now) {
      throw new Error('Too many attempts; try again later')
    }
    const candidate = await hashPin(args.pin, staff.pinSalt)
    const succeeded = constantTimeTextEqual(candidate.hash, staff.pinHash)
    await ctx.runMutation(recordAttemptRef, { staffId: args.staffId, succeeded, now })
    if (!succeeded) throw new Error('Invalid credentials')
    const expiresAt = now + SESSION_TTL_MS
    const token = await issueSessionToken({
      staffId: String(staff._id),
      restaurantId: String(staff.restaurantId),
      role: staff.role,
      exp: expiresAt,
    })
    return { token, expiresAt, staff: { id: staff._id, name: staff.name, role: staff.role } }
  },
})
