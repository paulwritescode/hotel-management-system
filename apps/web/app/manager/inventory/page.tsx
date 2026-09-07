import type { Metadata } from 'next'
import { InventoryManager } from './inventory-manager'

export const metadata: Metadata = { title: 'Menu items' }
export default function InventoryPage() { return <InventoryManager /> }
