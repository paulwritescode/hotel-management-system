import { describe, expect, it } from 'vitest'
import { toPlaceOrderInput } from './convex'

describe('order placement contract', () => {
  it('forwards only the session identity and never a client-supplied total or cart', () => {
    const untrusted = {
      restaurantId: 'restaurant',
      phone: '+254700000000',
      cart: [{ itemId: 'pilau', quantity: 2 }],
      clientTotalKes: 1,
    }
    const result = toPlaceOrderInput(untrusted)
    expect(result).toEqual({
      restaurantId: 'restaurant',
      phone: '+254700000000',
    })
    expect(result).not.toHaveProperty('clientTotalKes')
    expect(result).not.toHaveProperty('cart')
  })
})
