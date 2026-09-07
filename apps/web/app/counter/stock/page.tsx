import type { Metadata } from 'next'
import { StockStrip } from './stock-strip'

export const metadata: Metadata = { title: 'Menu items' }
export default function StockPage() { return <StockStrip /> }
