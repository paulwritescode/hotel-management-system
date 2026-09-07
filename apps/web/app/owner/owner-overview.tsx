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
  { href: '/manager/inventory', label: 'Menu items', copy: 'Menu items, photos, offers and availability' },
  { href: '/manager/offers', label: 'Offers', copy: 'Activate promotions and review offer performance' },
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

    <section className="page-section owner-offer-summary" style={{ paddingTop: 0 }}><div className="section-heading"><div><p className="caption">Commercial performance</p><h2>Offers</h2><p className="muted">Active promotions, discounts given and offer-attributed revenue from the last 7 days.</p></div><Link className="button button-outline button-small" href="/manager/offers">Manage offers</Link></div><div className="offer-summary-strip"><div><span className="caption">Active items</span><strong>{analytics?.offers.activeItems ?? '—'}</strong></div><div><span className="caption">Offer orders</span><strong>{analytics?.offers.offerOrders ?? '—'}</strong></div><div><span className="caption">Units sold</span><strong>{analytics?.offers.offerUnits ?? '—'}</strong></div><div><span className="caption">Discount given</span><strong>{analytics ? `KES ${analytics.offers.discountKes.toLocaleString()}` : '—'}</strong></div><div><span className="caption">Settled offer revenue</span><strong>{analytics ? `KES ${analytics.offers.revenueKes.toLocaleString()}` : '—'}</strong></div></div></section>

    <section className="page-section owner-waiter-ratings" style={{ paddingTop: 0 }}><div className="section-heading"><div><p className="caption">Customer feedback</p><h2>Waiter ratings</h2><p className="muted">Ratings and comments linked to the waiter assigned to each order · last 7 days.</p></div></div>{analytics?.waiters.some((waiter) => waiter.ratingCount) ? <div className="owner-waiter-rating-grid">{analytics.waiters.filter((waiter) => waiter.ratingCount).map((waiter) => <Card key={waiter.waiterId}><div className="owner-waiter-rating-heading"><div><h3>{waiter.name}</h3><p className="fine-print muted">{waiter.ordersServed} served · {waiter.tableNumbers.length ? `Tables ${waiter.tableNumbers.join(', ')}` : 'No assigned tables'}</p></div><strong className="owner-waiter-rating-score">{waiter.meanRating?.toFixed(1) ?? '—'}<span>/5</span></strong></div><p className="fine-print">{waiter.ratingCount} {waiter.ratingCount === 1 ? 'rating' : 'ratings'} received</p>{waiter.feedback.filter((feedback) => feedback.comment).length ? <div className="owner-waiter-comments">{waiter.feedback.filter((feedback) => feedback.comment).map((feedback) => <blockquote key={`${waiter.waiterId}-${feedback.orderReference}-${feedback.createdAt}`}><p>“{feedback.comment}”</p><footer>{feedback.rating}/5 · {feedback.orderReference} · Table {feedback.tableNumber}</footer></blockquote>)}</div> : <p className="fine-print muted">No written comments yet.</p>}</Card>)}</div> : <Card><p className="muted">No waiter ratings have been submitted in the last 7 days.</p></Card>}</section>

    <section className="page-section" style={{ paddingTop: 0 }}>
      <ActivityFeed title="Team activity" scopeNote="Every staff member — who signed in, and what they changed, where and when" limit={100} />
    </section>
  </DashboardShell>
}
