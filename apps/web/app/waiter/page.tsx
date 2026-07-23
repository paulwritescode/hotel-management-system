import type { Metadata } from 'next'
import { WaiterDashboard } from './waiter-dashboard'

export const metadata: Metadata = { title: 'Waiter' }
export default function WaiterPage() { return <WaiterDashboard /> }
