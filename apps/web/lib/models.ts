import type { ItemCategory, OrderStatus, StaffRole } from '@heavenly/types'

export type Id = string

export type Item = {
  _id: Id
  name: string
  nameSwahili?: string
  description?: string
  category: ItemCategory
  priceKes: number
  available: boolean
  quantityOnHand?: number
  unit?: string
  imageStorageId?: Id
  externalImageUrl?: string
  imageUrl?: string
  imageAlt?: string
  imageCredit?: string
  imageCreditUrl?: string
  archived: boolean
}

export type OrderLine = { itemId: Id; nameSnapshot: string; priceKesSnapshot: number; quantity: number }
export type PaymentStatus = 'unpaid' | 'paid' | 'waived'
export type PaymentMethod = 'cash' | 'mpesa' | 'card' | 'other'
export type Order = {
  _id: Id
  tableNumber: number
  source: 'whatsapp' | 'counter'
  customerName: string
  customerPhone?: string
  lines: OrderLine[]
  totalKes: number
  reference?: string
  status: OrderStatus
  paymentStatus: PaymentStatus
  paymentMethod?: PaymentMethod
  paidAt?: number
  paidByStaffId?: Id
  settledByName?: string
  waivedReason?: string
  refundDue?: boolean
  placedAt: number
  acknowledgedAt?: number
  servedAt?: number
  servedByName?: string
}

export const paymentMethods: PaymentMethod[] = ['cash', 'mpesa', 'card', 'other']
export const paymentMethodLabels: Record<PaymentMethod, string> = {
  cash: 'Cash', mpesa: 'M-Pesa', card: 'Card', other: 'Other',
}

// The spoken order number read across the counter, e.g. HF-20260723-0042 → 0042.
export function orderReferenceShort(reference?: string): string | undefined {
  return reference?.split('-').at(-1)
}

export type Staff = { _id: Id; name: string; role: StaffRole; enabled: boolean }
export type DiningTable = { _id: Id; number: number; seats?: number; assignedWaiterId?: Id; active: boolean }

export const categories: ItemCategory[] = ['staple', 'vegetable', 'meat', 'bread', 'drink', 'dessert', 'side']
export const roles: StaffRole[] = ['owner', 'manager', 'counter', 'waiter']

export const roleLevel: Record<StaffRole, number> = { owner: 3, manager: 2, counter: 1, waiter: 1 }

// Mirrors the server assertMayManage guard: an actor may manage only strictly-lower roles.
export function creatableRoles(actorRole?: StaffRole): StaffRole[] {
  const level = actorRole ? roleLevel[actorRole] : 0
  return roles.filter((role) => roleLevel[role] < level)
}

export function canManageStaff(actorRole: StaffRole | undefined, actorId: string | undefined, target: Staff): boolean {
  if (!actorRole || !actorId || actorId === target._id) return false
  return roleLevel[actorRole] > roleLevel[target.role]
}
