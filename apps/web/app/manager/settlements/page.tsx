import type { Metadata } from 'next'
import { SettlementsView } from './settlements-view'

export const metadata: Metadata = { title: 'Settlements' }
export default function SettlementsPage() { return <SettlementsView /> }
