import type { DiningTable, Item, Order, Staff } from './models'

export const demoItems: Item[] = [
  { _id: 'item-1', name: 'Chicken biryani', nameSwahili: 'Biriani ya kuku', description: 'Fragrant basmati rice layered with tender chicken, warm coastal spices, caramelised onion and a bright kachumbari salad.', category: 'staple', priceKes: 650, available: true, quantityOnHand: 12, unit: 'plate', externalImageUrl: 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?auto=format&fit=crop&w=1200&q=80', imageUrl: 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?auto=format&fit=crop&w=1200&q=80', imageAlt: 'Spiced chicken biryani served in a bowl', imageCredit: 'Photo on Unsplash', imageCreditUrl: 'https://unsplash.com/s/photos/biryani', archived: false },
  { _id: 'item-2', name: 'Beef stew', description: 'Slow-braised beef with tomatoes, carrots and aromatic herbs, finished in a rich gravy for serving with ugali or rice.', category: 'meat', priceKes: 520, available: true, quantityOnHand: 8, unit: 'plate', externalImageUrl: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?auto=format&fit=crop&w=1200&q=80', imageUrl: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?auto=format&fit=crop&w=1200&q=80', imageAlt: 'Slow-cooked beef stew', imageCredit: 'Photo on Unsplash', imageCreditUrl: 'https://unsplash.com/s/photos/beef-stew', archived: false },
  { _id: 'item-3', name: 'Chapati', nameSwahili: 'Chapati', description: 'Soft, flaky whole-wheat flatbread cooked on the griddle until golden and lightly crisp at the edges.', category: 'bread', priceKes: 80, available: true, quantityOnHand: 24, unit: 'pcs', externalImageUrl: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=1200&q=80', imageUrl: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=1200&q=80', imageAlt: 'Fresh golden flatbread', imageCredit: 'Photo on Unsplash', imageCreditUrl: 'https://unsplash.com/s/photos/flatbread', archived: false },
  { _id: 'item-4', name: 'Sukuma wiki', description: 'Fresh collard greens sautéed with tomato, onion and gentle seasoning for a light, savoury vegetable side.', category: 'vegetable', priceKes: 160, available: true, quantityOnHand: 6, unit: 'plate', externalImageUrl: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=80', imageUrl: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=80', imageAlt: 'Fresh cooked green vegetables', imageCredit: 'Photo on Unsplash', imageCreditUrl: 'https://unsplash.com/s/photos/greens', archived: false },
  { _id: 'item-5', name: 'Fresh passion juice', description: 'Fresh passion fruit blended to order and served chilled for a sweet, tangy and naturally refreshing drink.', category: 'drink', priceKes: 220, available: false, quantityOnHand: 0, unit: 'L', externalImageUrl: 'https://images.unsplash.com/photo-1546173159-315724a31696?auto=format&fit=crop&w=1200&q=80', imageUrl: 'https://images.unsplash.com/photo-1546173159-315724a31696?auto=format&fit=crop&w=1200&q=80', imageAlt: 'Chilled fresh fruit juice', imageCredit: 'Photo on Unsplash', imageCreditUrl: 'https://unsplash.com/s/photos/passion-juice', archived: false },
  { _id: 'item-6', name: 'Mandazi', description: 'Lightly sweet East African fried bread with a tender centre and golden crust, ideal with Kenyan tea.', category: 'dessert', priceKes: 70, available: true, unit: 'pcs', externalImageUrl: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=1200&q=80', imageUrl: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=1200&q=80', imageAlt: 'Golden sweet fried pastries', imageCredit: 'Photo on Unsplash', imageCreditUrl: 'https://unsplash.com/s/photos/doughnut', archived: false },
]

const now = Date.now()
export const demoOrders: Order[] = [
  { _id: 'order-1', tableNumber: 7, source: 'whatsapp', customerName: 'Amina', customerPhone: '+254700000001', lines: [{ itemId: 'item-1', nameSnapshot: 'Chicken biryani', priceKesSnapshot: 650, quantity: 2 }, { itemId: 'item-3', nameSnapshot: 'Chapati', priceKesSnapshot: 80, quantity: 2 }], totalKes: 1460, reference: 'HF-20260723-0042', status: 'pending', placedAt: now - 4 * 60_000 },
  { _id: 'order-2', tableNumber: 3, source: 'whatsapp', customerName: 'Brian', customerPhone: '+254700000002', lines: [{ itemId: 'item-2', nameSnapshot: 'Beef stew', priceKesSnapshot: 520, quantity: 1 }, { itemId: 'item-4', nameSnapshot: 'Sukuma wiki', priceKesSnapshot: 160, quantity: 1 }], totalKes: 680, reference: 'HF-20260723-0041', status: 'preparing', placedAt: now - 18 * 60_000, acknowledgedAt: now - 16 * 60_000 },
  { _id: 'order-3', tableNumber: 12, source: 'counter', customerName: 'Walk-up guest', lines: [{ itemId: 'item-6', nameSnapshot: 'Mandazi', priceKesSnapshot: 70, quantity: 4 }], totalKes: 280, reference: 'HF-20260723-0040', status: 'ready', placedAt: now - 9 * 60_000, acknowledgedAt: now - 8 * 60_000 },
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
