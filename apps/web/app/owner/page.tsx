import type { Metadata } from 'next'
import { OwnerOverview } from './owner-overview'

export const metadata: Metadata = { title: 'Overview' }

export default function OwnerPage() {
  return <OwnerOverview />
}
