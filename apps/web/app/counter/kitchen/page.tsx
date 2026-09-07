import type { Metadata } from 'next'
import { KitchenDashboard } from './kitchen-dashboard'

export const metadata: Metadata = { title: 'Kitchen' }

export default function KitchenPage() {
  return <KitchenDashboard />
}
