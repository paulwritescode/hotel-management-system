import { assertPositiveInteger, type OrderStatus } from './_helpers'

const nextStatus: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: 'acknowledged',
  acknowledged: 'preparing',
  preparing: 'ready',
  ready: 'served',
  served: 'closed',
}

export function assertOrderTransition(current: OrderStatus, target: OrderStatus): void {
  if (target === 'cancelled') throw new Error('Use cancel with a reason')
  if (nextStatus[current] !== target) throw new Error(`Invalid order transition: ${current} -> ${target}`)
}

export function computeOrderTotal(lines: ReadonlyArray<{ priceKesSnapshot: number; quantity: number }>): number {
  if (lines.length === 0) throw new Error('Order must contain at least one line')
  let total = 0
  for (const line of lines) {
    assertPositiveInteger(line.priceKesSnapshot, 'priceKesSnapshot')
    assertPositiveInteger(line.quantity, 'quantity')
    const lineTotal = line.priceKesSnapshot * line.quantity
    if (!Number.isSafeInteger(lineTotal) || !Number.isSafeInteger(total + lineTotal)) throw new Error('Order total is too large')
    total += lineTotal
  }
  return total
}
