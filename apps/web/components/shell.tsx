'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Boxes,
  ChartNoAxesCombined,
  ClipboardList,
  FileUp,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  QrCode,
  UtensilsCrossed,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useStaffIdentity } from '@/components/providers'

type StaffRole = 'owner' | 'manager' | 'counter' | 'waiter'
type NavigationItem = { href: string; label: string; icon: LucideIcon }

const managerNavigation: NavigationItem[] = [
  { href: '/manager', label: 'Analytics', icon: ChartNoAxesCombined },
  { href: '/manager/inventory', label: 'Inventory', icon: Package },
  { href: '/manager/inventory/import', label: 'Import menu', icon: FileUp },
  { href: '/manager/tables', label: 'Tables', icon: QrCode },
  { href: '/manager/staff', label: 'Staff', icon: Users },
]

const navigationByRole: Record<StaffRole, NavigationItem[]> = {
  owner: [{ href: '/owner', label: 'Overview', icon: LayoutDashboard }, ...managerNavigation],
  manager: managerNavigation,
  counter: [
    { href: '/counter', label: 'Live queue', icon: ClipboardList },
    { href: '/counter/stock', label: 'Stock', icon: Boxes },
  ],
  waiter: [{ href: '/waiter', label: 'Assigned tables', icon: UtensilsCrossed }],
}

const roleLabels: Record<StaffRole, string> = {
  owner: 'Owner workspace',
  manager: 'Manager workspace',
  counter: 'Counter workspace',
  waiter: 'Waiter workspace',
}

export function DashboardShell({ section, children, actions, role = 'manager' }: { section: string; children: ReactNode; actions?: ReactNode; role?: StaffRole }) {
  const pathname = usePathname()
  const identity = useStaffIdentity()
  const [menuOpen, setMenuOpen] = useState(false)
  // Prefer the signed-in role so navigation is consistent across every page (an owner keeps the
  // owner nav even on shared /manager screens); fall back to the prop for demo/no-session.
  const navRole: StaffRole = identity?.role ?? role
  const staffName = identity?.name ?? roleLabels[navRole]
  const staffInitial = staffName.trim().charAt(0).toUpperCase() || 'H'

  return <div className="dashboard-shell">
    <aside id="staff-navigation" className={menuOpen ? 'dashboard-sidebar dashboard-sidebar-open' : 'dashboard-sidebar'} aria-label="Staff navigation">
      <div className="dashboard-sidebar-inner">
        <Link className="sidebar-brand" href="/" onClick={() => setMenuOpen(false)}>
          <span className="sidebar-brand-mark" aria-hidden="true"><UtensilsCrossed size={18} strokeWidth={1.8} /></span>
          <span><strong>Heavenly Foods</strong><small>Restaurant operations</small></span>
        </Link>

        <div className="sidebar-identity">
          <span className="sidebar-avatar" aria-hidden="true">{staffInitial}</span>
          <span><strong>{staffName}</strong><small>{roleLabels[navRole]}</small></span>
        </div>

        <div className="sidebar-navigation">
          <p className="sidebar-label">Workspace</p>
          <nav aria-label={`${roleLabels[navRole]} navigation`}>
            {navigationByRole[navRole].map((link) => {
              const active = pathname === link.href
              const Icon = link.icon
              return <Link key={link.href} className={active ? 'sidebar-link sidebar-link-active' : 'sidebar-link'} href={link.href} aria-current={active ? 'page' : undefined} onClick={() => setMenuOpen(false)}>
                <Icon size={17} strokeWidth={1.8} />
                <span>{link.label}</span>
              </Link>
            })}
          </nav>
        </div>

        <form className="sidebar-signout" action="/api/auth/logout" method="post">
          <button type="submit"><LogOut size={17} strokeWidth={1.8} /><span>Sign out</span></button>
        </form>
      </div>
    </aside>

    {menuOpen && <button className="dashboard-scrim" type="button" aria-label="Close navigation" onClick={() => setMenuOpen(false)} />}

    <div className="dashboard-workspace">
      <header className="dashboard-mobile-header">
        <Link className="dashboard-mobile-brand" href="/"><UtensilsCrossed size={17} strokeWidth={1.8} /><span>Heavenly Foods</span></Link>
        <button className="dashboard-menu-button" type="button" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} aria-controls="staff-navigation" onClick={() => setMenuOpen((open) => !open)}>
          {menuOpen ? <X size={17} /> : <Menu size={17} />}
          <span>{menuOpen ? 'Close' : 'Menu'}</span>
        </button>
      </header>

      <div className="dashboard-topbar">
        <div className="container dashboard-topbar-inner">
          <div><p className="dashboard-eyebrow">{roleLabels[navRole]}</p><strong>{section}</strong></div>
          {actions && <div className="sub-actions">{actions}</div>}
        </div>
      </div>

      <main className="dashboard-main">
        <div className="container dashboard-content">{children}</div>
      </main>

      <nav className="mobile-tabbar" aria-label="Primary">
        {navigationByRole[navRole].slice(0, 5).map((link) => {
          const active = pathname === link.href
          const Icon = link.icon
          return <Link key={link.href} className={active ? 'mobile-tab mobile-tab-active' : 'mobile-tab'} href={link.href} aria-current={active ? 'page' : undefined}>
            <Icon size={20} strokeWidth={1.8} />
            <span>{link.label}</span>
          </Link>
        })}
      </nav>
    </div>
  </div>
}
