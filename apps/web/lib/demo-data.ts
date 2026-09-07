import type { DiningTable, Item, Order, Staff } from './models'

export const demoItems: Item[] = [
  { _id: 'item-1', name: 'Chicken Fried Rice Bowl', description: 'Stir-fried rice with chicken and vegetables.', category: 'staple', priceKes: 850, preparationMinutes: 20, available: true, quantityOnHand: 12, unit: 'bowl', offer: { label: 'Weekly offer', originalPriceKes: 850, offerPriceKes: 750, active: true }, archived: false },
  { _id: 'item-2', name: 'Beef Stew + Ugali', description: 'Traditional Kenyan beef stew.', category: 'meat', priceKes: 400, preparationMinutes: 25, available: true, quantityOnHand: 8, unit: 'plate', archived: false },
  { _id: 'item-3', name: 'Chapati', nameSwahili: 'Chapati', description: 'Soft, flaky flatbread.', category: 'bread', priceKes: 60, preparationMinutes: 8, available: true, quantityOnHand: 24, unit: 'pcs', archived: false },
  { _id: 'item-4', name: 'Spinach', description: 'Fresh cooked spinach.', category: 'vegetable', priceKes: 100, preparationMinutes: 10, available: true, quantityOnHand: 6, unit: 'plate', archived: false },
  { _id: 'item-5', name: 'Passion Juice', description: 'Fresh chilled passion juice.', category: 'drink', priceKes: 200, preparationMinutes: 5, available: false, quantityOnHand: 0, unit: 'glass', archived: false },
  { _id: 'item-6', name: 'Andazi', description: 'Golden East African fried bread.', category: 'bread', priceKes: 50, preparationMinutes: 5, available: true, unit: 'pcs', archived: false },
]

const now = Date.now()
export const demoOrders: Order[] = [
  { _id: 'order-1', tableNumber: 7, source: 'whatsapp', customerName: 'Amina', customerPhone: '+254700000001', lines: [{ itemId: 'item-1', nameSnapshot: 'Chicken biryani', priceKesSnapshot: 650, quantity: 2 }, { itemId: 'item-3', nameSnapshot: 'Chapati', priceKesSnapshot: 80, quantity: 2 }], totalKes: 1460, reference: 'HF-20260723-0042', status: 'pending', paymentStatus: 'unpaid', placedAt: now - 4 * 60_000 },
  { _id: 'order-2', tableNumber: 3, source: 'whatsapp', customerName: 'Brian', customerPhone: '+254700000002', lines: [{ itemId: 'item-2', nameSnapshot: 'Beef stew', priceKesSnapshot: 520, quantity: 1 }, { itemId: 'item-4', nameSnapshot: 'Sukuma wiki', priceKesSnapshot: 160, quantity: 1 }], totalKes: 680, reference: 'HF-20260723-0041', status: 'preparing', paymentStatus: 'unpaid', placedAt: now - 18 * 60_000, acknowledgedAt: now - 16 * 60_000 },
  { _id: 'order-3', tableNumber: 12, source: 'counter', customerName: 'Walk-up guest', lines: [{ itemId: 'item-6', nameSnapshot: 'Mandazi', priceKesSnapshot: 70, quantity: 4 }], totalKes: 280, reference: 'HF-20260723-0040', status: 'served', paymentStatus: 'unpaid', placedAt: now - 58 * 60_000, acknowledgedAt: now - 55 * 60_000, servedAt: now - 50 * 60_000 },
]

export const demoStaff: Staff[] = [
  { _id: 'staff-0', name: 'Luna', role: 'owner', enabled: true },
  { _id: 'staff-1', name: 'Grace Wanjiku', role: 'manager', enabled: true },
  { _id: 'staff-2', name: 'Daniel Otieno', role: 'counter', enabled: true },
  { _id: 'staff-3', name: 'Mary Njeri', role: 'waiter', enabled: true },
  { _id: 'staff-4', name: 'Peter Mwangi', role: 'waiter', enabled: true },
]

export const demoTables: DiningTable[] = [
  { _id: 'table-1', number: 1, seats: 4, assignedWaiterId: 'staff-3', active: true },
  { _id: 'table-2', number: 3, seats: 2, assignedWaiterId: 'staff-3', active: true },
  { _id: 'table-3', number: 7, seats: 6, assignedWaiterId: 'staff-4', active: true },
  { _id: 'table-4', number: 12, seats: 4, assignedWaiterId: 'staff-3', active: true },
]
