import { makeFunctionReference } from 'convex/server'
import type { DiningTable, Id, Item, Order, Staff } from './models'

export type AuthArgs = { token: string; restaurantId: Id }
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
    auditTrail: makeFunctionReference<'query', AuthArgs, AuditEntry[]>('staff:auditTrail'),
  },
  items: {
    inventory: makeFunctionReference<'query', AuthArgs & { includeArchived?: boolean }, Item[]>('items:inventory'),
    generateUploadUrl: makeFunctionReference<'mutation', AuthArgs, string>('items:generateUploadUrl'),
    create: makeFunctionReference<'mutation', AuthArgs & ItemInput, Id>('items:create'),
    update: makeFunctionReference<'mutation', { token: string; itemId: Id } & ItemInput, Id>('items:update'),
    archive: makeFunctionReference<'mutation', { token: string; itemId: Id }, Id>('items:archive'),
    setAvailability: makeFunctionReference<'mutation', { token: string; itemId: Id; available: boolean }, Id>('items:setAvailability'),
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
  analytics: {
    dashboard: makeFunctionReference<'query', AuthArgs, AnalyticsDashboard>('analytics:dashboard'),
  },
  tables: {
    list: makeFunctionReference<'query', AuthArgs, DiningTable[]>('tables:list'),
    create: makeFunctionReference<'mutation', AuthArgs & { number: number; seats?: number }, Id>('tables:create'),
    update: makeFunctionReference<'mutation', { token: string; tableId: Id; number?: number; seats?: number; active: boolean }, null>('tables:update'),
    assignWaiter: makeFunctionReference<'mutation', { token: string; tableId: Id; waiterId?: Id }, null>('tables:assignWaiter'),
    remove: makeFunctionReference<'mutation', { token: string; tableId: Id }, Id>('tables:remove'),
  },
}
