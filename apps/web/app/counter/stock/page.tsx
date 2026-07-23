import type { Metadata } from 'next'
import { StockStrip } from './stock-strip'

export const metadata: Metadata = { title: 'Stock' }
export default function StockPage() { return <StockStrip /> }
