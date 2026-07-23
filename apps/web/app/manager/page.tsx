import type { Metadata } from 'next'
import { ManagerAnalytics } from './manager-analytics'

export const metadata: Metadata = { title: 'Manager analytics' }
export default function ManagerPage() { return <ManagerAnalytics /> }
