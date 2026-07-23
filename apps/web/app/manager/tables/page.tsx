import type { Metadata } from 'next'
import { TableManager } from './table-manager'

export const metadata: Metadata = { title: 'Tables' }
export default function TablesPage() { return <TableManager /> }
