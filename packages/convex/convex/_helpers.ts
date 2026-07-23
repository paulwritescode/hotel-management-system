import type { GenericDataModel, GenericDatabaseReader, GenericDatabaseWriter } from 'convex/server'

export const SESSION_TTL_MS = 12 * 60 * 60 * 1000
export const CONVERSATION_TTL_MS = 30 * 60 * 1000
export const PBKDF2_ITERATIONS = 120_000
export const LOCKOUT_MS = 15 * 60 * 1000
export const MAX_FAILED_ATTEMPTS = 5

export type StaffRole = 'owner' | 'manager' | 'counter' | 'waiter'
export type ItemCategory = 'staple' | 'vegetable' | 'meat' | 'bread' | 'drink' | 'dessert' | 'side'

export const ROLE_LEVEL: Record<StaffRole, number> = { owner: 3, manager: 2, counter: 1, waiter: 1 }

// A role may create, modify, or disable only roles strictly below its own level, and never itself.
// The `<=` comparison is load-bearing: a strict `<` would let a manager manage another manager.
export function assertMayManage(
  actorRole: StaffRole,
  targetRole: StaffRole,
  actorId: string,
  targetId: string | null,
): void {
  if (targetId && actorId === targetId) throw new Error('A staff member cannot modify their own record')
  if (ROLE_LEVEL[actorRole] <= ROLE_LEVEL[targetRole]) throw new Error('Insufficient privilege for this role')
}
export type OrderStatus = 'pending' | 'acknowledged' | 'preparing' | 'ready' | 'served' | 'closed' | 'cancelled'

export type SessionClaims = {
  staffId: string
  restaurantId: string
  role: StaffRole
  exp: number
}

type StaffDocument = {
  _id: string
  restaurantId: string
  role: StaffRole
  enabled: boolean
  [key: string]: unknown
}

function sessionSecret(): string {
  const secret = (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process?.env?.SESSION_SECRET
  if (!secret || secret.length < 32) throw new Error('SESSION_SECRET must be at least 32 characters')
  return secret
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4)
  const binary = atob(padded)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false
  let difference = 0
  for (let index = 0; index < left.length; index += 1) difference |= left[index]! ^ right[index]!
  return difference === 0
}

async function hmac(value: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(sessionSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value)))
}

export async function issueSessionToken(claims: SessionClaims): Promise<string> {
  const payload = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(claims)))
  return `${payload}.${bytesToBase64Url(await hmac(payload))}`
}

export async function verifySessionToken(token: string): Promise<SessionClaims> {
  const [payload, signature, extra] = token.split('.')
  if (!payload || !signature || extra) throw new Error('Invalid session token')
  if (!constantTimeEqual(base64UrlToBytes(signature), await hmac(payload))) throw new Error('Invalid session token')
  const parsed: unknown = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payload)))
  if (!isClaims(parsed) || parsed.exp <= Date.now()) throw new Error('Session expired')
  return parsed
}

function isClaims(value: unknown): value is SessionClaims {
  if (!value || typeof value !== 'object') return false
  const claims = value as Record<string, unknown>
  return typeof claims.staffId === 'string' && typeof claims.restaurantId === 'string' &&
    (claims.role === 'owner' || claims.role === 'counter' || claims.role === 'waiter' || claims.role === 'manager') &&
    typeof claims.exp === 'number'
}

export async function requireStaff(
  db: GenericDatabaseReader<GenericDataModel>,
  token: string,
  allowedRoles: readonly StaffRole[],
  restaurantId?: string,
): Promise<StaffDocument> {
  const claims = await verifySessionToken(token)
  const staff = await db.get(claims.staffId as never) as StaffDocument | null
  if (!staff || !staff.enabled || staff.restaurantId !== claims.restaurantId || staff.role !== claims.role) {
    throw new Error('Session is no longer valid')
  }
  if (restaurantId && staff.restaurantId !== restaurantId) throw new Error('Cross-restaurant access denied')
  // The owner outranks the manager, so any manager-permitted function also admits an owner.
  const permitted = allowedRoles.includes(staff.role) || (staff.role === 'owner' && allowedRoles.includes('manager'))
  if (!permitted) throw new Error('Insufficient role')
  return staff
}

export function assertPositiveInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`${field} must be a positive integer`)
}

export function assertOptionalNonNegativeInteger(value: number | undefined, field: string): void {
  if (value !== undefined && (!Number.isSafeInteger(value) || value < 0)) {
    throw new Error(`${field} must be a non-negative integer`)
  }
}

export function cleanRequired(value: string, field: string, maxLength = 200): string {
  const cleaned = value.trim()
  if (!cleaned) throw new Error(`${field} is required`)
  if (cleaned.length > maxLength) throw new Error(`${field} is too long`)
  return cleaned
}

export async function getActiveTable(db: GenericDatabaseReader<GenericDataModel>, restaurantId: string, tableNumber: number) {
  assertPositiveInteger(tableNumber, 'tableNumber')
  const table = await db.query('tables').withIndex('by_restaurant_number', (query: any) =>
    query.eq('restaurantId', restaurantId).eq('number', tableNumber),
  ).unique()
  if (!table || !table.active) throw new Error(`Table ${tableNumber} is not active`)
  return table
}

export type DbWriter = GenericDatabaseWriter<GenericDataModel>
