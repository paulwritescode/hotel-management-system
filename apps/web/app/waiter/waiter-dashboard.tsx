'use client'

import { useMutation, useQuery } from 'convex/react'
import { useEffect, useMemo, useState } from 'react'
import { DashboardShell } from '@/components/shell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { useAuthArgs, useBackendAvailable, useStaffIdentity } from '@/components/providers'
import { api } from '@/lib/convex'
import { demoOrders, demoTables } from '@/lib/demo-data'
import type { Order } from '@/lib/models'

export function WaiterDashboard() {
  const backend = useBackendAvailable()
  const auth = useAuthArgs()
  const identity = useStaffIdentity()
  const liveOrders = useQuery(api.orders.waiterOrders, backend ? auth! : 'skip')
  const liveStats = useQuery(api.orders.waiterStats, backend ? auth! : 'skip')
  const liveTables = useQuery(api.tables.list, backend ? auth! : 'skip')
  const transition = useMutation(api.orders.transition)
  const notify = useToast()
  const [orders, setOrders] = useState<Order[]>(backend ? [] : demoOrders.filter((order) => [3, 12].includes(order.tableNumber)))
  useEffect(() => { if (liveOrders) setOrders(liveOrders) }, [liveOrders])

  const tableNumbers = useMemo(() => {
    const tables = backend ? (liveTables ?? []) : demoTables
    return tables.filter((table) => table.assignedWaiterId === identity?.staffId).map((table) => table.number)
  }, [backend, identity?.staffId, liveTables])
  const servedToday = liveStats?.ordersServedToday ?? 0
  const medianServeMinutes = liveStats?.medianAcknowledgedToServedMs === null || liveStats?.medianAcknowledgedToServedMs === undefined
    ? null
    : Math.round(liveStats.medianAcknowledgedToServedMs / 60_000)

  async function serve(order: Order) {
    setOrders((current) => current.map((entry) => entry._id === order._id ? { ...entry, status: 'served', servedAt: Date.now() } : entry))
    try {
      if (backend) await transition({ token: auth!.token, orderId: order._id, status: 'served' })
      notify(`Table ${order.tableNumber} marked served`)
    } catch {
      setOrders((current) => current.map((entry) => entry._id === order._id ? order : entry))
      notify('Serve update failed and was reverted', 'error')
    }
  }

  return <DashboardShell role="waiter" section="Waiter" actions={<span className="caption">Tables {tableNumbers.length ? tableNumbers.join(', ') : 'unassigned'}</span>}><section className="stat-strip" aria-label="Personal stats"><div className="stat-block"><span className="caption">Orders served today</span><strong>{servedToday}</strong><span className="fine-print">Since midnight</span></div><div className="stat-block"><span className="caption">Median serve time</span><strong>{medianServeMinutes === null ? '—' : `${medianServeMinutes} min`}</strong><span className="fine-print">Acknowledged to served · today</span></div></section><section className="page-section"><div className="section-heading"><div><p className="caption">Assigned table service</p><h1>Orders ready for you</h1><p className="muted">Only orders for your assigned tables appear here</p></div></div>{orders.filter((order) => !['served','closed','cancelled'].includes(order.status)).length === 0 ? <div className="empty-state"><h2>All assigned tables are clear</h2><p className="muted">Ready orders will appear here instantly</p></div> : <div className="order-grid">{orders.filter((order) => !['served','closed','cancelled'].includes(order.status)).map((order) => <article key={order._id} className={`order-tile status-${order.status}`}><div><Badge>{order.status}</Badge><p className="order-table-number">Table {order.tableNumber}</p><p className="order-customer">{order.customerName}</p><ul className="order-lines">{order.lines.map((line) => <li key={line.itemId}><strong>{line.quantity}×</strong> {line.nameSnapshot}</li>)}</ul></div><div className="order-summary"><div><p className="fine-print">Order total</p><p className="order-total">KES {order.totalKes.toLocaleString()}</p></div>{order.status === 'ready' ? <Button onClick={() => serve(order)}>Mark served</Button> : <p className="caption muted">Waiting for counter</p>}</div></article>)}</div>}</section></DashboardShell>
}
