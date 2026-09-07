import type { Metadata } from 'next'
import { InventoryImport } from './inventory-import'

export const metadata: Metadata = { title: 'Import menu items' }
export default function InventoryImportPage() { return <InventoryImport /> }
