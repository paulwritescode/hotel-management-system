import { afterEach, describe, expect, it } from 'vitest'
import { issueSessionToken, requireStaff } from '../convex/_helpers'

const previousSecret = process.env.SESSION_SECRET

afterEach(() => {
  if (previousSecret === undefined) delete process.env.SESSION_SECRET
  else process.env.SESSION_SECRET = previousSecret
})

describe('requireStaff', () => {
  it('rechecks the database and rejects a staff member disabled after token issuance', async () => {
    process.env.SESSION_SECRET = 'a-convex-session-secret-long-enough-for-tests'
    const token = await issueSessionToken({
      staffId: 'staff-1',
      restaurantId: 'restaurant-1',
      role: 'counter',
      exp: Date.now() + 60_000,
    })
    const db = {
      get: async () => ({
        _id: 'staff-1',
        restaurantId: 'restaurant-1',
        role: 'counter',
        enabled: false,
      }),
    }

    await expect(requireStaff(db as never, token, ['counter'], 'restaurant-1')).rejects.toThrow('Session is no longer valid')
  })
})
