import { describe, expect, it } from 'vitest'
import { credentialMessage, generatePin } from './staff-credentials'

describe('generatePin', () => {
  it('always produces exactly six digits the backend will accept', () => {
    for (let attempt = 0; attempt < 500; attempt += 1) {
      expect(generatePin()).toMatch(/^\d{6}$/u)
    }
  })

  it('draws every digit without the modulo bias a naive `% 10` would introduce', () => {
    // 20k digits over 10 buckets: ~2000 each. A `% 10` on raw bytes would push 0–5 to roughly
    // 2200 and 6–9 down to about 1700, far outside this bound.
    const counts = new Array(10).fill(0)
    for (let attempt = 0; attempt < 3334; attempt += 1) {
      for (const digit of generatePin()) counts[Number(digit)] += 1
    }
    const total = counts.reduce((sum, count) => sum + count, 0)
    for (const count of counts) {
      expect(count / total).toBeGreaterThan(0.085)
      expect(count / total).toBeLessThan(0.115)
    }
  })

  it('does not repeat itself across calls', () => {
    const seen = new Set(Array.from({ length: 200 }, () => generatePin()))
    expect(seen.size).toBeGreaterThan(190)
  })
})

describe('credentialMessage', () => {
  it('carries the name, role and PIN a staff member needs to sign in', () => {
    const message = credentialMessage({ name: 'Amina Hassan', role: 'waiter', pin: '482913' })
    expect(message).toContain('Name: Amina Hassan')
    expect(message).toContain('Role: waiter')
    expect(message).toContain('PIN: 482913')
    expect(message).toContain('cannot be shown again')
  })
})
