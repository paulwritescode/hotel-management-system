import { makeFunctionReference } from 'convex/server'
import type { DiningTable, Id, Item, Order, PaymentMethod, Staff } from './models'

export type AuthArgs = { token: string; restaurantId: Id }

export type RestaurantSettings = {
  name: string
  acceptedPaymentMethods: PaymentMethod[]
  mpesaTillNumber?: string
}

export type SettlementSummary = {
  window: { from: number; to: number }
  ordersServed: number
  orderedValueKes: number
  settledRevenueKes: number
  waivedValueKes: number
  unpaidValueKes: number
  paidCount: number
  waivedCount: number
  unpaidCount: number
  refundsDueCount: number
  byMethod: Array<{ method: PaymentMethod; count: number; valueKes: number }>
  unpaidOrders: Array<{ _id: Id; reference?: string; tableNumber: number; customerName: string; totalKes: number; servedAt: number }>
}
type ItemInput = Omit<Item, '_id' | 'archived'>
type StaffRole = Staff['role']

export type AuditEntry = {
  _id: Id
  actorName: string
  actorRole: StaffRole
  action: 'create' | 'update_role' | 'enable' | 'disable' | 'reset_pin'
  targetName: string
  targetRoleBefore?: string
  targetRoleAfter?: string
  at: number
}

export type ActivityEntry = {
  _id: Id
  actorName: string
  actorRole: StaffRole
  action: string
  detail?: string
  at: number
}

export type ActivityMetrics = { total: number; signIns: number; activeStaff: number }

export type AnalyticsDashboard = {
  windows: { today: { from: number; to: number }; last7Days: { from: number; to: number } }
  today: { orders: number; revenueKes: number; averageOrderValueKes: number }
  topItems: Array<{ itemId: string; name: string; quantity: number; orderCount: number }>
  lowestRatedItems: Array<{ itemId: string; name: string; ratingCount: number; meanRating: number | null; ratings?: number[]; comments: string[] }>
  ordersByHour: Array<{ hour: number; orders: number; revenueKes: number }>
  tables: Array<{ tableNumber: number; orders: number; revenueKes: number; medianTurnaroundMs: number | null }>
  waiters: Array<{ waiterId: string; name: string; ordersServed: number; medianServeTimeMs: number | null; ratingCount: number; meanRating: number | null; ratings?: number[] }>
}

export const api = {
  auth: {
    signIn: makeFunctionReference<'action', { pin: string }, {
      token: string
      expiresAt: number
      restaurantId: Id
      staff: { id: Id; name: string; role: StaffRole }
    }>('auth:signIn'),
  },
  staff: {
    list: makeFunctionReference<'query', AuthArgs, Staff[]>('staff:list'),
    listVisible: makeFunctionReference<'query', AuthArgs, Staff[]>('staff:listVisible'),
    create: makeFunctionReference<'action', AuthArgs & { name: string; role: StaffRole; pin: string }, Id>('staff:create'),
    update: makeFunctionReference<'mutation', { token: string; staffId: Id; name: string; role: StaffRole; enabled: boolean }, null>('staff:update'),
    setPin: makeFunctionReference<'action', { token: string; staffId: Id; pin: string }, null>('staff:setPin'),
    remove: makeFunctionReference<'mutation', { token: string; staffId: Id }, Id>('staff:remove'),
    auditTrail: makeFunctionReference<'query', AuthArgs, AuditEntry[]>('staff:auditTrail'),
  },
  items: {
    inventory: makeFunctionReference<'query', AuthArgs & { includeArchived?: boolean }, Item[]>('items:inventory'),
    generateUploadUrl: makeFunctionReference<'mutation', AuthArgs, string>('items:generateUploadUrl'),
    create: makeFunctionReference<'mutation', AuthArgs & ItemInput, Id>('items:create'),
    update: makeFunctionReference<'mutation', { token: string; itemId: Id } & ItemInput, Id>('items:update'),
    archive: makeFunctionReference<'mutation', { token: string; itemId: Id }, Id>('items:archive'),
    setAvailability: makeFunctionReference<'mutation', { token: string; itemId: Id; available: boolean }, Id>('items:setAvailability'),
    restock: makeFunctionReference<'mutation', { token: string; itemId: Id; addQuantity: number }, { quantityOnHand: number; available: boolean; reenabled: boolean }>('items:restock'),
    setQuantity: makeFunctionReference<'mutation', { token: string; itemId: Id; quantity: number }, { quantityOnHand: number; available: boolean; reenabled: boolean }>('items:setQuantity'),
    bulkUpsert: makeFunctionReference<'mutation', AuthArgs & { rows: ItemInput[]; columnMappingProfile?: Record<string, string> }, { inserted: number; updated: number }>('items:bulkUpsert'),
  },
  orders: {
    live: makeFunctionReference<'query', AuthArgs, Order[]>('orders:live'),
    transition: makeFunctionReference<'mutation', { token: string; orderId: Id; status: Order['status'] }, Id>('orders:transition'),
    cancel: makeFunctionReference<'mutation', { token: string; orderId: Id; reason: string }, Id>('orders:cancel'),
    placeManual: makeFunctionReference<'mutation', AuthArgs & { tableNumber: number; customerName: string; customerPhone?: string; lines: Array<{ itemId: Id; quantity: number }> }, { orderId: Id; totalKes: number; lines: Order['lines'] }>('orders:placeManual'),
    waiterOrders: makeFunctionReference<'query', AuthArgs, Order[]>('orders:waiterOrders'),
    waiterStats: makeFunctionReference<'query', AuthArgs, { ordersServedToday: number; medianAcknowledgedToServedMs: number | null }>('orders:waiterStats'),
  },
  settlement: {
    markPaid: makeFunctionReference<'mutation', { token: string; orderId: Id; method: PaymentMethod }, Id>('settlement:markPaid'),
    waive: makeFunctionReference<'mutation', { token: string; orderId: Id; reason: string }, Id>('settlement:waive'),
    correct: makeFunctionReference<'mutation', { token: string; orderId: Id; toStatus: Order['paymentStatus']; method?: PaymentMethod | undefined; reason: string }, Id>('settlement:correct'),
    summary: makeFunctionReference<'query', AuthArgs, SettlementSummary>('settlement:summary'),
  },
  restaurants: {
    settings: makeFunctionReference<'query', AuthArgs, RestaurantSettings>('restaurants:settings'),
    updateSettings: makeFunctionReference<'mutation', AuthArgs & { acceptedPaymentMethods: PaymentMethod[]; mpesaTillNumber?: string | undefined }, RestaurantSettings>('restaurants:updateSettings'),
  },
  analytics: {
    dashboard: makeFunctionReference<'query', AuthArgs, AnalyticsDashboard>('analytics:dashboard'),
  },
  activity: {
    feed: makeFunctionReference<'query', AuthArgs & { limit?: number }, ActivityEntry[]>('activity:feed'),
    metrics: makeFunctionReference<'query', AuthArgs, ActivityMetrics>('activity:metrics'),
    lastActive: makeFunctionReference<'query', AuthArgs, Record<string, number>>('activity:lastActiveByStaff'),
  },
  tables: {
    list: makeFunctionReference<'query', AuthArgs, DiningTable[]>('tables:list'),
    create: makeFunctionReference<'mutation', AuthArgs & { number: number; seats?: number }, Id>('tables:create'),
    update: makeFunctionReference<'mutation', { token: string; tableId: Id; number?: number; seats?: number; active: boolean }, null>('tables:update'),
    assignWaiter: makeFunctionReference<'mutation', { token: string; tableId: Id; waiterId?: Id }, null>('tables:assignWaiter'),
    remove: makeFunctionReference<'mutation', { token: string; tableId: Id }, Id>('tables:remove'),
  },
}
