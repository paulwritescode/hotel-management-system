'use client'

import { useMutation, useQuery } from 'convex/react'
import { useEffect, useMemo, useState } from 'react'
import { DashboardShell } from '@/components/shell'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { useAuthArgs, useBackendAvailable, useStaffIdentity } from '@/components/providers'
import { api } from '@/lib/convex'
import { demoOrders, demoTables } from '@/lib/demo-data'
import type { Order } from '@/lib/models'

const statusLabels: Record<Order['status'], string> = {
  pending: 'New', acknowledged: 'Acknowledged', preparing: 'Preparing',
  ready: 'Ready', served: 'Served', closed: 'Closed', cancelled: 'Cancelled',
}

// A table's colour follows the same language as the order cards: green when something is ready
// to run, red when work is in progress, quiet when acknowledged, muted when clear.
function tableState(statuses: Order['status'][]): { tone: 'ready' | 'busy' | 'quiet' | 'clear'; label: string } {
  if (statuses.includes('ready')) return { tone: 'ready', label: 'Ready to serve' }
  if (statuses.some((status) => status === 'pending' || status === 'preparing')) return { tone: 'busy', label: 'In progress' }
  if (statuses.includes('acknowledged')) return { tone: 'quiet', label: 'Acknowledged' }
  return { tone: 'clear', label: 'Clear' }
}

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
    return tables.filter((table) => table.assignedWaiterId === identity?.staffId).map((table) => table.number).sort((a, b) => a - b)
  }, [backend, identity?.staffId, liveTables])

  const active = useMemo(() => orders.filter((order) => !['served', 'closed', 'cancelled'].includes(order.status)), [orders])

  // Each assigned table with the live state of its active orders.
  const tableCards = useMemo(() => tableNumbers.map((number) => {
    const tableOrders = active.filter((order) => order.tableNumber === number)
    return { number, count: tableOrders.length, ...tableState(tableOrders.map((order) => order.status)) }
  }), [active, tableNumbers])

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

  return <DashboardShell role="waiter" section="My tables">
    <section className="stat-strip" aria-label="Personal stats">
      <div className="stat-block"><span className="caption">Orders served today</span><strong>{servedToday}</strong><span className="fine-print">Since midnight</span></div>
      <div className="stat-block"><span className="caption">Median serve time</span><strong>{medianServeMinutes === null ? '—' : `${medianServeMinutes} min`}</strong><span className="fine-print">Acknowledged to served · today</span></div>
    </section>

    <section className="page-section">
      <div className="section-heading"><div><p className="caption">Assigned tables</p><h1>Your section</h1><p className="muted">{tableNumbers.length ? `Tables ${tableNumbers.join(', ')}` : 'No tables assigned yet — a manager assigns your section'}</p></div></div>
      {tableCards.length > 0 && <div className="table-chips">{tableCards.map((table) => <div key={table.number} className={`table-chip table-chip-${table.tone}`}>
        <span className="table-chip-number">Table {table.number}</span>
        <span className="table-chip-state">{table.label}</span>
        {table.count > 0 && <span className="table-chip-count">{table.count} {table.count === 1 ? 'order' : 'orders'}</span>}
      </div>)}</div>}
    </section>

    <section className="page-section" style={{ paddingTop: 0 }}>
      <div className="section-heading"><div><p className="caption">Live service</p><h2>Orders for your tables</h2><p className="muted">Green cards are ready to run</p></div></div>
      {active.length === 0
        ? <div className="empty-state"><h2>All assigned tables are clear</h2><p className="muted">Ready orders appear here instantly</p></div>
        : <div className="queue-grid">{active.map((order) => <article key={order._id} className={`order-card order-card-${order.status}`}>
            <header className="order-card-head">
              <div><p className="order-table-number">Table {order.tableNumber}</p><p className="order-customer">{order.customerName}</p></div>
              <span className={`status-pill status-${order.status}`}>{statusLabels[order.status]}</span>
            </header>
            <ul className="order-lines">{order.lines.map((line) => <li key={line.itemId}><strong>{line.quantity}×</strong> {line.nameSnapshot}</li>)}</ul>
            <footer className="order-card-foot">
              <div><p className="order-total">KES {order.totalKes.toLocaleString()}</p></div>
              <div className="order-actions">{order.status === 'ready' ? <Button size="small" onClick={() => serve(order)}>Mark served</Button> : <span className="fine-print muted">Waiting for counter</span>}</div>
            </footer>
          </article>)}</div>}
    </section>
  </DashboardShell>
}
