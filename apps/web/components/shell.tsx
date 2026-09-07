'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BellRing,
  Boxes,
  ChartNoAxesCombined,
  ClipboardList,
  FileUp,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  QrCode,
  ScrollText,
  Settings,
  Tag,
  UtensilsCrossed,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useStaffIdentity } from '@/components/providers'

type StaffRole = 'owner' | 'manager' | 'counter' | 'waiter'
type NavigationItem = { href: string; label: string; icon: LucideIcon }

const managerNavigation: NavigationItem[] = [
  { href: '/manager', label: 'Analytics', icon: ChartNoAxesCombined },
  { href: '/manager/settlements', label: 'Settlements', icon: Wallet },
  { href: '/manager/inventory', label: 'Menu items', icon: Package },
  { href: '/manager/offers', label: 'Offers', icon: Tag },
  { href: '/manager/inventory/import', label: 'Import menu items', icon: FileUp },
  { href: '/manager/tables', label: 'Tables', icon: QrCode },
  { href: '/manager/staff', label: 'Staff', icon: Users },
  { href: '/manager/settings', label: 'Settings', icon: Settings },
]

const navigationByRole: Record<StaffRole, NavigationItem[]> = {
  owner: [{ href: '/owner', label: 'Overview', icon: LayoutDashboard }, ...managerNavigation],
  manager: managerNavigation,
  counter: [
    { href: '/counter', label: 'Live queue', icon: ClipboardList },
    { href: '/counter/kitchen', label: 'Kitchen', icon: UtensilsCrossed },
    { href: '/counter/shift', label: 'My shift', icon: ScrollText },
    { href: '/counter/stock', label: 'Stock', icon: Boxes },
    { href: '/counter/offers', label: 'Offers', icon: Tag },
  ],
  waiter: [
    { href: '/waiter', label: 'My tables', icon: UtensilsCrossed },
    { href: '/waiter/alerts', label: 'Alerts', icon: BellRing },
  ],
}

const roleLabels: Record<StaffRole, string> = {
  owner: 'Owner workspace',
  manager: 'Manager workspace',
  counter: 'Counter workspace',
  waiter: 'Waiter workspace',
}

function workspaceLabel(role: StaffRole, counterLabel?: string) {
  if (role === 'counter') return counterLabel?.trim() || 'Payment counter'
  return roleLabels[role]
}

export function DashboardShell({ section, children, actions, role = 'manager' }: { section: string; children: ReactNode; actions?: ReactNode; role?: StaffRole }) {
  const pathname = usePathname()
  const identity = useStaffIdentity()
  const [menuOpen, setMenuOpen] = useState(false)
  // Prefer the signed-in role so navigation is consistent across every page (an owner keeps the
  // owner nav even on shared /manager screens); fall back to the prop for demo/no-session.
  const navRole: StaffRole = identity?.role ?? role
  const staffName = identity?.name ?? roleLabels[navRole]
  const currentWorkspaceLabel = workspaceLabel(navRole, identity?.counterLabel)
  const navigation = navRole === 'counter' && currentWorkspaceLabel !== 'Kitchen counter'
    ? navigationByRole[navRole].filter((link) => link.href !== '/counter/kitchen')
    : navigationByRole[navRole]
  const staffInitial = staffName.trim().charAt(0).toUpperCase() || 'H'

  return <div className="dashboard-shell">
    <aside id="staff-navigation" className={menuOpen ? 'dashboard-sidebar dashboard-sidebar-open' : 'dashboard-sidebar'} aria-label="Staff navigation">
      <div className="dashboard-sidebar-inner">
        <Link className="sidebar-brand" href="/" onClick={() => setMenuOpen(false)} aria-label="Heavenly Foods">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="sidebar-logo" src="/logo-3.png" alt="Heavenly Foods" />
        </Link>

        <div className="sidebar-identity">
          <span className="sidebar-avatar" aria-hidden="true">{staffInitial}</span>
          <span><strong>{staffName}</strong><small>{currentWorkspaceLabel}</small></span>
        </div>

        <div className="sidebar-navigation">
          <p className="sidebar-label">Workspace</p>
          <nav aria-label={`${currentWorkspaceLabel} navigation`}>
            {navigation.map((link) => {
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
        <Link className="dashboard-mobile-brand" href="/" aria-label="Heavenly Foods">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="mobile-logo" src="/logo-1.png" alt="Heavenly Foods" />
        </Link>
        <button className="dashboard-menu-button" type="button" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} aria-controls="staff-navigation" onClick={() => setMenuOpen((open) => !open)}>
          {menuOpen ? <X size={17} /> : <Menu size={17} />}
          <span>{menuOpen ? 'Close' : 'Menu'}</span>
        </button>
      </header>

      <div className="dashboard-topbar">
        <div className="container dashboard-topbar-inner">
          <div><p className="dashboard-eyebrow">{currentWorkspaceLabel}</p><strong>{section}</strong></div>
          {actions && <div className="sub-actions">{actions}</div>}
        </div>
      </div>

      <main className="dashboard-main">
        <div className="container dashboard-content">{children}</div>
      </main>

      <nav className="mobile-tabbar" aria-label="Primary">
        {navigation.slice(0, 5).map((link) => {
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
