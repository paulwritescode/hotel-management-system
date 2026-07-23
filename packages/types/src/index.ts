export type ItemCategory =
  | 'staple'
  | 'vegetable'
  | 'meat'
  | 'bread'
  | 'drink'
  | 'dessert'
  | 'side'

export type OrderStatus =
  | 'pending'
  | 'acknowledged'
  | 'preparing'
  | 'ready'
  | 'served'
  | 'closed'
  | 'cancelled'

export type StaffRole = 'owner' | 'manager' | 'counter' | 'waiter'
export type MarketingConsent = 'granted' | 'denied' | 'unasked'

export type SessionState =
  | 'IDLE'
  | 'GREETED'
  | 'AWAITING_TABLE'
  | 'BROWSING'
  | 'CATEGORY'
  | 'CART'
  | 'AWAITING_NAME'
  | 'AWAITING_CONSENT'
  | 'PLACED'
  | 'AWAITING_FEEDBACK'
  | 'CLOSED'

export type ParsedInventoryRow = {
  sourceRow: number
  name?: string
  nameSwahili?: string
  description?: string
  category?: ItemCategory
  priceKes?: number
  available?: boolean
  quantityOnHand?: number
  unit?: string
  sourceColumns: Record<string, string>
  errors: string[]
}

export type ParsedInventoryBatch = {
  source: 'manual' | 'csv' | 'xlsx' | 'ocr'
  rows: ParsedInventoryRow[]
  warnings: string[]
}
