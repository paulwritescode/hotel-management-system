import { describe, expect, it } from 'vitest'
import { signSession, verifySession, type StaffSession } from './session'

const secret = 'a-session-secret-that-is-long-enough-for-tests'
const session: StaffSession = {
  staffId: 'staff-1',
  restaurantId: 'restaurant-1',
  convexToken: 'convex.payload.signature',
  name: 'Grace Wanjiku',
  role: 'manager',
  exp: Math.floor(Date.now() / 1000) + 60,
}

describe('staff web sessions', () => {
  it('round-trips the Convex auth context in an HMAC-signed token', async () => {
    const token = await signSession(session, secret)
    await expect(verifySession(token, secret)).resolves.toEqual(session)
  })

  it('rejects tampering, expiry, and incomplete legacy payloads', async () => {
    const token = await signSession(session, secret)
    await expect(verifySession(`${token.slice(0, -1)}x`, secret)).resolves.toBeNull()
    await expect(verifySession(await signSession({ ...session, exp: 1 }, secret), secret)).resolves.toBeNull()
    const legacy = { staffId: session.staffId, name: session.name, role: session.role, exp: session.exp }
    await expect(verifySession(await signSession(legacy as StaffSession, secret), secret)).resolves.toBeNull()
  })
})
