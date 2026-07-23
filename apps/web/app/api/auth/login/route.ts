import { ConvexHttpClient } from 'convex/browser'
import { NextResponse } from 'next/server'
import { api } from '@/lib/convex'
import { SESSION_COOKIE, SESSION_DURATION_SECONDS, signSession } from '@/lib/session'

export const runtime = 'edge'

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { pin?: unknown }
    const pin = typeof body.pin === 'string' ? body.pin.trim() : ''
    if (!/^\d{4,6}$/u.test(pin)) return NextResponse.json({ error: 'Enter a 4–6 digit PIN' }, { status: 400 })
    const url = process.env.NEXT_PUBLIC_CONVEX_URL
    const secret = process.env.SESSION_SECRET
    if (!url || !secret) return NextResponse.json({ error: 'Sign-in is not configured' }, { status: 503 })

    const result = await new ConvexHttpClient(url).action(api.auth.signIn, { pin })
    const expiresAtSeconds = Math.floor(result.expiresAt / 1000)
    const maxAge = Math.min(SESSION_DURATION_SECONDS, Math.max(0, expiresAtSeconds - Math.floor(Date.now() / 1000)))
    const token = await signSession({
      staffId: result.staff.id,
      restaurantId: result.restaurantId,
      convexToken: result.token,
      name: result.staff.name,
      role: result.staff.role,
      exp: expiresAtSeconds,
    }, secret)
    const response = NextResponse.json({ ok: true, role: result.staff.role })
    response.cookies.set(SESSION_COOKIE, token, { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge })
    return response
  } catch {
    return NextResponse.json({ error: 'PIN not recognised or account temporarily locked' }, { status: 401 })
  }
}
