import type { Metadata } from 'next'
import { AlertsSettings } from './alerts-settings'

export const metadata: Metadata = { title: 'Alerts' }
export default function WaiterAlertsPage() { return <AlertsSettings /> }
