import { ConvexHttpClient } from 'convex/browser'
import { NextResponse } from 'next/server'
import { api } from '@/lib/convex'

export const runtime = 'edge'

export async function POST(request: Request) {
  try {
    const body = await request.json() as { orderId?: unknown; email?: unknown }
    if (typeof body.orderId !== 'string') return NextResponse.json({ error: 'Order is required' }, { status: 400 })
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
    const secret = process.env.PAYSTACK_SECRET_KEY
    if (!convexUrl || !secret) return NextResponse.json({ error: 'Paystack is not configured. Add PAYSTACK_SECRET_KEY.' }, { status: 503 })
    const order = await new ConvexHttpClient(convexUrl).query(api.orders.paymentDetails, { orderId: body.orderId as never })
    const email = typeof body.email === 'string' && body.email.trim() ? body.email.trim() : process.env.PAYSTACK_DEFAULT_EMAIL ?? `guest-${order.reference ?? order.orderId}@heavenlyfoods.demo`
    const origin = new URL(request.url).origin
    const paystack = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST', headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, amount: order.totalKes * 100, reference: order.reference, callback_url: `${origin}/order/complete?orderId=${encodeURIComponent(order.orderId)}`, metadata: { orderId: order.orderId, tableReceipt: order.receiptPreference, receiptDestination: order.receiptDestination } }),
    })
    const result = await paystack.json() as { status?: boolean; message?: string; data?: { authorization_url?: string; reference?: string } }
    if (!paystack.ok || !result.data?.authorization_url) return NextResponse.json({ error: result.message ?? 'Paystack rejected the payment request' }, { status: 502 })
    return NextResponse.json({ authorization_url: result.data.authorization_url, reference: result.data.reference })
  } catch { return NextResponse.json({ error: 'Could not start Paystack checkout' }, { status: 500 }) }
}
