'use client'

import Link from 'next/link'
import { useQuery } from 'convex/react'
import { ArrowRight } from 'lucide-react'
import { DashboardShell } from '@/components/shell'
import { ActivityFeed } from '@/components/activity-feed'
import { Card } from '@/components/ui/card'
import { useAuthArgs, useBackendAvailable } from '@/components/providers'
import { api } from '@/lib/convex'

const quickLinks = [
  { href: '/manager', label: 'Analytics', copy: 'Live revenue, orders and performance' },
  { href: '/manager/inventory', label: 'Inventory', copy: 'Menu items, photos and availability' },
  { href: '/manager/tables', label: 'Tables', copy: 'Dining tables and WhatsApp QR codes' },
  { href: '/manager/staff', label: 'Staff', copy: 'Accounts, roles and the audit trail' },
]

export function OwnerOverview() {
  const backend = useBackendAvailable()
  const auth = useAuthArgs()
  const analytics = useQuery(api.analytics.dashboard, backend ? auth! : 'skip')

  return <DashboardShell section="Overview" role="owner" actions={<span className="caption">Owner view</span>}>
    <section className="metric-grid" aria-label="Today’s headline metrics">
      <article className="metric-tile"><span className="caption">Orders today</span><strong className="metric-value">{analytics?.today.orders ?? '—'}</strong><span className="fine-print">Since midnight</span></article>
      <article className="metric-tile"><span className="caption">Revenue today</span><strong className="metric-value">{analytics ? `KES ${analytics.today.revenueKes.toLocaleString()}` : '—'}</strong><span className="fine-print">Since midnight</span></article>
      <article className="metric-tile"><span className="caption">Average order value</span><strong className="metric-value">{analytics ? `KES ${Math.round(analytics.today.averageOrderValueKes).toLocaleString()}` : '—'}</strong><span className="fine-print">Orders placed today</span></article>
    </section>

    <section className="page-section">
      <div className="section-heading"><div><p className="caption">Owner workspace</p><h1>Everything, at a glance</h1><p className="muted">Jump into any area, and review who did what across the whole team below</p></div></div>
      <div className="owner-links">{quickLinks.map((link) => <Link className="owner-link-card" key={link.href} href={link.href}><Card><div className="owner-link-top"><strong>{link.label}</strong><ArrowRight size={17} /></div><p className="muted">{link.copy}</p></Card></Link>)}</div>
    </section>

    <section className="page-section" style={{ paddingTop: 0 }}>
      <ActivityFeed title="Team activity" scopeNote="Every staff member — who signed in, and what they changed, where and when" limit={100} />
    </section>
  </DashboardShell>
}
