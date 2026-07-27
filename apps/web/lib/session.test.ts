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

/**
 * Alters a token's signature so the bytes it decodes to genuinely differ.
 *
 * Changing the *last* base64url character is not enough: a 32-byte SHA-256 signature encodes to 43
 * characters, of which the final one carries only 4 significant bits, so four different final
 * characters decode to the same bytes. A test that flipped the last character to a fixed letter
 * therefore passed or failed depending on where the signature happened to land — about one run in
 * sixteen, and `exp` moves with the clock so every run differs. The first character carries a full
 * six bits, so a change there always alters the decoded signature.
 */
function tamperSignature(token: string): string {
  const [payload, signature] = token.split('.') as [string, string]
  const flipped = signature[0] === 'A' ? 'B' : 'A'
  return `${payload}.${flipped}${signature.slice(1)}`
}

describe('staff web sessions', () => {
  it('round-trips the Convex auth context in an HMAC-signed token', async () => {
    const token = await signSession(session, secret)
    await expect(verifySession(token, secret)).resolves.toEqual(session)
  })

  it('rejects tampering, expiry, and incomplete legacy payloads', async () => {
    const token = await signSession(session, secret)
    await expect(verifySession(tamperSignature(token), secret)).resolves.toBeNull()
    await expect(verifySession(await signSession({ ...session, exp: 1 }, secret), secret)).resolves.toBeNull()
    const legacy = { staffId: session.staffId, name: session.name, role: session.role, exp: session.exp }
    await expect(verifySession(await signSession(legacy as StaffSession, secret), secret)).resolves.toBeNull()
  })
})
