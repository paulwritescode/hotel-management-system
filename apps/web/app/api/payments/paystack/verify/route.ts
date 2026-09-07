import { ConvexHttpClient } from 'convex/browser'
import { NextResponse } from 'next/server'
import { api } from '@/lib/convex'

export const runtime = 'edge'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const reference = url.searchParams.get('reference')
    const orderId = url.searchParams.get('orderId')
    const secret = process.env.PAYSTACK_SECRET_KEY
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
    if (!reference || !orderId || !secret || !convexUrl) return NextResponse.json({ error: 'Payment verification is not configured' }, { status: 503 })
    const paystack = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, { headers: { Authorization: `Bearer ${secret}` } })
    const result = await paystack.json() as { data?: { status?: string; reference?: string; amount?: number } }
    if (!paystack.ok || result.data?.status !== 'success' || result.data.reference !== reference) return NextResponse.json({ error: 'Payment was not confirmed' }, { status: 402 })
    const details = await new ConvexHttpClient(convexUrl).query(api.orders.paymentDetails, { orderId: orderId as never })
    await new ConvexHttpClient(convexUrl).mutation(api.orders.recordPaystackPayment, { orderId: orderId as never, reference, amountKes: details.totalKes })
    return NextResponse.json({ ok: true, reference, orderId })
  } catch { return NextResponse.json({ error: 'Could not verify payment' }, { status: 500 }) }
}
