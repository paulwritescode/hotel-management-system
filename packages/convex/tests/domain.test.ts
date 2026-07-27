import { describe, expect, it } from 'vitest'
import { assertOrderTransition, computeOrderTotal, shouldRestartSession } from '../convex/_domain'

describe('shouldRestartSession', () => {
  const now = 1_000_000

  it('restarts a CLOSED session even though it has not expired', () => {
    // The regression this guards: every inbound message pushes expiresAt forward, so a CLOSED
    // session never ages out and the diner can never place a second order.
    expect(shouldRestartSession('CLOSED', now + 60_000, now)).toBe(true)
  })

  it('restarts any expired session', () => {
    expect(shouldRestartSession('BROWSING', now - 1, now)).toBe(true)
  })

  it('leaves a live conversation alone', () => {
    for (const state of ['GREETED', 'BROWSING', 'CATEGORY', 'CART', 'PLACED', 'AWAITING_FEEDBACK']) {
      expect(shouldRestartSession(state, now + 60_000, now)).toBe(false)
    }
  })
})

const statuses = ['pending', 'acknowledged', 'preparing', 'ready', 'served', 'closed', 'cancelled'] as const
const allowed = new Set([
  'pending:acknowledged',
  'acknowledged:preparing',
  'preparing:ready',
  'ready:served',
  'served:closed',
])

describe('computeOrderTotal', () => {
  it('uses only snapshotted prices and quantities', () => {
    const clientSuppliedTotal = 1
    const total = computeOrderTotal([
      { priceKesSnapshot: 300, quantity: 2 },
      { priceKesSnapshot: 120, quantity: 1 },
    ])
    expect(total).toBe(720)
    expect(total).not.toBe(clientSuppliedTotal)
  })

  it('rejects invalid integral KES or quantities', () => {
    expect(() => computeOrderTotal([{ priceKesSnapshot: 0, quantity: 1 }])).toThrow()
    expect(() => computeOrderTotal([{ priceKesSnapshot: 10.5, quantity: 1 }])).toThrow()
    expect(() => computeOrderTotal([{ priceKesSnapshot: 100, quantity: -1 }])).toThrow()
  })
})

describe('assertOrderTransition', () => {
  it('accepts every edge in the exact forward graph', () => {
    for (const edge of allowed) {
      const [from, to] = edge.split(':') as [typeof statuses[number], typeof statuses[number]]
      expect(() => assertOrderTransition(from, to)).not.toThrow()
    }
  })

  it('rejects every other direct status transition, including served to pending', () => {
    for (const from of statuses) for (const to of statuses) {
      if (!allowed.has(`${from}:${to}`)) expect(() => assertOrderTransition(from, to)).toThrow()
    }
  })
})
