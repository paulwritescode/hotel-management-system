import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { Providers } from '@/components/providers'
import { ToastProvider } from '@/components/ui/toast'
import { SESSION_COOKIE, verifySession } from '@/lib/session'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'Heavenly Foods', template: '%s · Heavenly Foods' },
  description: 'Live restaurant operations powered by WhatsApp',
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies()
  const session = await verifySession(cookieStore.get(SESSION_COOKIE)?.value, process.env.SESSION_SECRET)
  const initialAuth = session ? {
    token: session.convexToken,
    restaurantId: session.restaurantId,
    staffId: session.staffId,
    name: session.name,
    role: session.role,
  } : null
  return <html lang="en"><body><Providers initialAuth={initialAuth}><ToastProvider>{children}</ToastProvider></Providers></body></html>
}
