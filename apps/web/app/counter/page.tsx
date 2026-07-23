import type { Metadata } from 'next'
import { CounterDashboard } from './counter-dashboard'

export const metadata: Metadata = { title: 'Counter' }
export default function CounterPage() { return <CounterDashboard /> }
