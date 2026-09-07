import type { Metadata } from 'next'
import { OffersManager } from '@/app/offers/offers-manager'

export const metadata: Metadata = { title: 'Offers' }
export default function ManagerOffersPage() { return <OffersManager mode="manage" /> }
