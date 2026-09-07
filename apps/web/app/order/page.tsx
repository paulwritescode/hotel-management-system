import type { Metadata } from 'next'
import { CustomerOrder } from './customer-order'

export const metadata: Metadata = { title: 'Order from Heavenly Foods' }
export default function OrderPage() { return <CustomerOrder /> }
