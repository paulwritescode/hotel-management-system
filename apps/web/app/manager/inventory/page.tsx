import type { Metadata } from 'next'
import { InventoryManager } from './inventory-manager'

export const metadata: Metadata = { title: 'Inventory' }
export default function InventoryPage() { return <InventoryManager /> }
