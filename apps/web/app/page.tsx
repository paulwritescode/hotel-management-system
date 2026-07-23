import Link from 'next/link'
import { ArrowRight, ChartNoAxesCombined, ClipboardList, LogIn, UtensilsCrossed, type LucideIcon } from 'lucide-react'

const roles: Array<{ href: string; name: string; copy: string; icon: LucideIcon }> = [
  { href: '/counter', name: 'Counter', copy: 'Acknowledge orders, move the live queue, create walk-up orders and control availability', icon: ClipboardList },
  { href: '/waiter', name: 'Waiter', copy: 'See assigned tables, serve ready orders and keep personal service stats in view', icon: UtensilsCrossed },
  { href: '/manager', name: 'Manager', copy: 'Run live analytics, inventory, tables, QR sheets and staff access from one place', icon: ChartNoAxesCombined },
]

export default function HomePage() {
  return <main className="landing">
    <section className="landing-hero">
      <div className="container">
        <p className="caption">Heavenly Foods restaurant operations</p>
        <h1>Every table, order and service moment in one live view</h1>
        <p>Choose your workspace to continue with your staff PIN</p>
        <Link className="button button-default" href="/login"><LogIn size={17} /><span>Staff sign in</span></Link>
      </div>
    </section>
    <section className="container role-grid" aria-label="Staff workspaces">
      {roles.map((role) => {
        const Icon = role.icon
        return <article className="role-tile" key={role.href}><div><Icon className="role-icon" size={28} strokeWidth={1.5} /><p className="fine-print">Workspace</p><h2>{role.name}</h2><p>{role.copy}</p></div><Link href={`/login?next=${encodeURIComponent(role.href)}`}><span>Open {role.name.toLowerCase()}</span><ArrowRight size={17} /></Link></article>
      })}
    </section>
  </main>
}
