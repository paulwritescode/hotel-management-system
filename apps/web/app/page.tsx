import { cookies } from 'next/headers'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BriefcaseBusiness, CreditCard, ShieldCheck, UtensilsCrossed } from 'lucide-react'
import { SESSION_COOKIE, verifySession } from '@/lib/session'

const roleHome = { owner: '/owner', manager: '/manager', counter: '/counter', waiter: '/waiter' } as const

const actorCards = [
  { key: 'manager', label: 'Manager', description: 'Manage operations, staff, tables and reports.', icon: BriefcaseBusiness },
  { key: 'admin', label: 'Admin', description: 'Owner-level overview and full restaurant control.', icon: ShieldCheck },
  { key: 'waiter', label: 'Waiter', description: 'View assigned tables and serve ready orders.', icon: UtensilsCrossed },
  { key: 'counter', label: 'Counter', description: 'Manage the live queue, payments and kitchen.', icon: CreditCard },
] as const

// The entry point organizes staff sign-in by workspace. The selected card is only a navigation
// hint; the server still authenticates the actual role encoded by the staff PIN.
export default async function HomePage() {
  const cookieStore = await cookies()
  const session = await verifySession(cookieStore.get(SESSION_COOKIE)?.value, process.env.SESSION_SECRET)
  if (session) redirect(roleHome[session.role])
  return <main className="actor-home-page"><div className="actor-home-content"><img className="actor-home-logo" src="/logo-2.png" alt="Heavenly Foods" /><p className="caption">Staff access</p><h1>Choose your workspace</h1><p className="muted">Select the area you work in to continue to secure sign in.</p><div className="actor-card-grid">{actorCards.map(({ key, label, description, icon: Icon }) => <Link key={key} className="actor-card" href={`/login?actor=${key}`}><span className="actor-card-icon"><Icon size={23} /></span><span><strong>{label}</strong><small>{description}</small></span><span className="actor-card-arrow" aria-hidden="true">→</span></Link>)}</div></div></main>
}
