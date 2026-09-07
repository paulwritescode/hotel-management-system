import type { Metadata } from 'next'
import { OffersManager } from '@/app/offers/offers-manager'

export const metadata: Metadata = { title: 'Offers' }
export default function CounterOffersPage() { return <OffersManager mode="operate" /> }
