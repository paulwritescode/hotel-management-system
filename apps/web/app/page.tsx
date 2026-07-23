import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { SESSION_COOKIE, verifySession } from '@/lib/session'

const roleHome = { owner: '/owner', manager: '/manager', counter: '/counter', waiter: '/waiter' } as const

// The entry point is the sign-in page. A signed-in staff member is sent straight to their
// role home instead of a marketing landing.
export default async function HomePage() {
  const cookieStore = await cookies()
  const session = await verifySession(cookieStore.get(SESSION_COOKIE)?.value, process.env.SESSION_SECRET)
  redirect(session ? roleHome[session.role] : '/login')
}
