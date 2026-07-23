import { describe, expect, it } from 'vitest'
import { assertOrderTransition, computeOrderTotal } from '../convex/_domain'

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
