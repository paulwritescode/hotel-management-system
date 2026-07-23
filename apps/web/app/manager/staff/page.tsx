import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { SESSION_COOKIE, verifySession } from '@/lib/session'
import { StaffManager } from './staff-manager'

export const metadata: Metadata = { title: 'Staff' }

// Role, level, and identity are resolved from the signed session on the server. The client
// never re-fetches or is trusted for the role — this is the only source (Addendum 02 §1.3).
export default async function StaffPage() {
  const cookieStore = await cookies()
  const session = await verifySession(cookieStore.get(SESSION_COOKIE)?.value, process.env.SESSION_SECRET)
  return <StaffManager viewerRole={session?.role} viewerStaffId={session?.staffId} />
}
