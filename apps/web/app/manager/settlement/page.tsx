import type { Metadata } from 'next'
import { SettlementView } from './settlement-view'

export const metadata: Metadata = { title: 'Settlement' }
export default function SettlementPage() { return <SettlementView /> }
