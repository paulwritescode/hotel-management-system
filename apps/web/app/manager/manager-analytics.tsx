'use client'

import { useQuery } from 'convex/react'
import { DashboardShell } from '@/components/shell'
import { Card } from '@/components/ui/card'
import { Table, TableWrap, Td, Th } from '@/components/ui/table'
import { useAuthArgs, useBackendAvailable } from '@/components/providers'
import { api, type AnalyticsDashboard } from '@/lib/convex'

const demoAnalytics: AnalyticsDashboard = {
  windows: { today: { from: Date.now() - 12 * 60 * 60_000, to: Date.now() }, last7Days: { from: Date.now() - 7 * 24 * 60 * 60_000, to: Date.now() } },
  today: { orders: 87, revenueKes: 48_620, averageOrderValueKes: 559 },
  topItems: [
    { itemId: '1', name: 'Chicken biryani', quantity: 52, orderCount: 46 },
    { itemId: '2', name: 'Beef stew', quantity: 43, orderCount: 39 },
    { itemId: '3', name: 'Chapati', quantity: 72, orderCount: 36 },
  ],
  ordersByHour: [{ hour: 10, orders: 7, revenueKes: 4_100 }, { hour: 11, orders: 12, revenueKes: 6_800 }, { hour: 12, orders: 24, revenueKes: 13_400 }, { hour: 13, orders: 31, revenueKes: 18_200 }],
  tables: [{ tableNumber: 7, orders: 31, revenueKes: 18_420, medianTurnaroundMs: 21 * 60_000 }],
  waiters: [{ waiterId: '1', name: 'Mary Njeri', ordersServed: 42, medianServeTimeMs: 17 * 60_000, meanRating: 4.7, ratingCount: 31 }],
  lowestRatedItems: [{ itemId: '5', name: 'Fresh passion juice', meanRating: 3.1, ratingCount: 8, comments: ['Took too long', 'Not cold enough'] }],
}

function minutes(milliseconds: number | null) {
  return milliseconds === null ? '—' : `${Math.round(milliseconds / 60_000)} min`
}

export function ManagerAnalytics() {
  const backend = useBackendAvailable()
  const auth = useAuthArgs()
  const result = useQuery(api.analytics.dashboard, backend ? auth! : 'skip')
  const data = result ?? (backend ? null : demoAnalytics)
  if (!data) return <DashboardShell section="Analytics"><section className="page-section"><p className="muted">Loading live analytics…</p></section></DashboardShell>

  const maxOrders = Math.max(...data.ordersByHour.map((entry) => entry.orders), 1)
  const pad = (hour: number) => String(hour).padStart(2, '0')
  const hourBuckets = Object.values(data.ordersByHour.reduce<Record<number, { start: number; orders: number; revenueKes: number }>>((groups, entry) => {
    const start = Math.floor(entry.hour / 3) * 3
    groups[start] ??= { start, orders: 0, revenueKes: 0 }
    groups[start].orders += entry.orders
    groups[start].revenueKes += entry.revenueKes
    return groups
  }, {})).sort((left, right) => left.start - right.start)
  return <DashboardShell section="Analytics" actions={<span className="caption">Live now</span>}><section className="metric-grid" aria-label="Today’s headline metrics"><article className="metric-tile"><span className="caption">Orders today</span><strong className="metric-value">{data.today.orders}</strong><span className="fine-print">Since midnight</span></article><article className="metric-tile"><span className="caption">Revenue today</span><strong className="metric-value">KES {data.today.revenueKes.toLocaleString()}</strong><span className="fine-print">Since midnight</span></article><article className="metric-tile"><span className="caption">Average order value</span><strong className="metric-value">KES {Math.round(data.today.averageOrderValueKes).toLocaleString()}</strong><span className="fine-print">Orders placed today</span></article></section><section className="page-section"><div className="section-heading"><div><p className="caption">Live operating picture</p><h1>Restaurant performance</h1><p className="muted">Every figure is computed from current order and feedback data</p></div></div><div className="analytics-grid"><Card><h3>Orders by hour</h3><p className="fine-print muted">Last 7 days</p><div className="bar-chart" aria-label="Orders by hour chart">{data.ordersByHour.map((entry) => <div className="bar-column" key={entry.hour}><span className="bar-value fine-print">{entry.orders}</span><div className="bar-track"><div className="bar" style={{ height: `${Math.max(3, (entry.orders / maxOrders) * 100)}%` }} /></div><span className="bar-label fine-print">{entry.hour}:00</span></div>)}</div><p className="caption-strong hour-summary-title">3-hour summary</p><div className="hour-summary">{hourBuckets.map((bucket) => <div className="hour-summary-item" key={bucket.start}><span className="fine-print muted">{pad(bucket.start)}:00–{pad(bucket.start + 3)}:00</span><strong>{bucket.orders}</strong><span className="fine-print muted">KES {bucket.revenueKes.toLocaleString()}</span></div>)}</div></Card><Card><h3>Top five items</h3><p className="fine-print muted">Order count · last 7 days</p><TableWrap><Table><thead><tr><Th>Item</Th><Th>Orders</Th></tr></thead><tbody>{data.topItems.map((item) => <tr key={item.itemId}><Td>{item.name}</Td><Td><strong>{item.orderCount}</strong></Td></tr>)}</tbody></Table></TableWrap></Card><Card><h3>Table performance</h3><p className="fine-print muted">Orders and revenue · last 7 days</p><TableWrap><Table><thead><tr><Th>Table</Th><Th>Orders</Th><Th>Revenue</Th><Th>Median turn</Th></tr></thead><tbody>{data.tables.map((entry) => <tr key={entry.tableNumber}><Td>{entry.tableNumber}</Td><Td>{entry.orders}</Td><Td>KES {entry.revenueKes.toLocaleString()}</Td><Td>{minutes(entry.medianTurnaroundMs)}</Td></tr>)}</tbody></Table></TableWrap></Card><Card><h3>Waiter performance</h3><p className="fine-print muted">Service and ratings · last 7 days</p><TableWrap><Table><thead><tr><Th>Waiter</Th><Th>Served</Th><Th>Median</Th><Th>Rating</Th></tr></thead><tbody>{data.waiters.map((entry) => <tr key={entry.waiterId}><Td>{entry.name}</Td><Td>{entry.ordersServed}</Td><Td>{minutes(entry.medianServeTimeMs)}</Td><Td>{entry.ratingCount < 5 ? `${entry.ratingCount} ratings` : `${entry.meanRating?.toFixed(1) ?? '—'} · ${entry.ratingCount}`}</Td></tr>)}</tbody></Table></TableWrap></Card><Card><h3>Lowest-rated items</h3><p className="fine-print muted">Feedback · last 7 days</p>{data.lowestRatedItems.map((item) => <div key={item.itemId}><p><strong>{item.name}</strong> · {item.ratingCount < 5 ? `${item.ratingCount} ratings` : `${item.meanRating?.toFixed(1) ?? '—'} from ${item.ratingCount}`}</p><ul>{item.comments.map((comment) => <li key={comment}>{comment}</li>)}</ul></div>)}</Card></div></section></DashboardShell>
}
