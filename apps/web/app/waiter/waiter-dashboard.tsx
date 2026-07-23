'use client'

import { useMutation, useQuery } from 'convex/react'
import { BellRing, Check } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DashboardShell } from '@/components/shell'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { useAuthArgs, useBackendAvailable, useStaffIdentity } from '@/components/providers'
import { api } from '@/lib/convex'
import { startAlarm, stopAlarm, unlockAudio, vibrate } from '@/lib/alarm'
import { demoOrders, demoTables } from '@/lib/demo-data'
import type { Order } from '@/lib/models'

const ALERTS_KEY = 'hf-waiter-alerts'

const statusLabels: Record<Order['status'], string> = {
  pending: 'New', acknowledged: 'Acknowledged', preparing: 'Preparing',
  ready: 'Ready', served: 'Served', closed: 'Closed', cancelled: 'Cancelled',
}

function tableState(statuses: Order['status'][]): { tone: 'ready' | 'busy' | 'quiet' | 'clear'; label: string } {
  if (statuses.includes('ready')) return { tone: 'ready', label: 'Ready to serve' }
  if (statuses.some((status) => status === 'pending' || status === 'preparing')) return { tone: 'busy', label: 'In progress' }
  if (statuses.includes('acknowledged')) return { tone: 'quiet', label: 'Acknowledged' }
  return { tone: 'clear', label: 'Clear' }
}

function mealSummary(order: Order): string {
  return order.lines.map((line) => `${line.quantity}× ${line.nameSnapshot}`).join(', ')
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
  const [alertsOn, setAlertsOn] = useState(false)
  const [alarmQueue, setAlarmQueue] = useState<Order[]>([])
  const seenReady = useRef<Set<string> | null>(null)

  useEffect(() => { if (liveOrders) setOrders(liveOrders) }, [liveOrders])
  useEffect(() => { setAlertsOn(typeof localStorage !== 'undefined' && localStorage.getItem(ALERTS_KEY) === 'on') }, [])

  const active = useMemo(() => orders.filter((order) => !['served', 'closed', 'cancelled'].includes(order.status)), [orders])
  const readyOrders = useMemo(() => active.filter((order) => order.status === 'ready'), [active])

  const raiseAlarm = useCallback((newlyReady: Order[]) => {
    if (newlyReady.length === 0) return
    setAlarmQueue((queue) => [...queue, ...newlyReady.filter((order) => !queue.some((q) => q._id === order._id))])
    startAlarm(); vibrate()
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      for (const order of newlyReady) {
        try { new Notification(`Order ready — Table ${order.tableNumber}`, { body: mealSummary(order), tag: order._id }) } catch { /* ignore */ }
      }
    }
  }, [])

  // Detect orders that newly became "ready" and alarm on them (after the first snapshot is seeded).
  useEffect(() => {
    const readyIds = readyOrders.map((order) => order._id)
    if (seenReady.current === null) { seenReady.current = new Set(readyIds); return }
    const fresh = readyOrders.filter((order) => !seenReady.current!.has(order._id))
    seenReady.current = new Set(readyIds)
    if (alertsOn && fresh.length > 0) raiseAlarm(fresh)
  }, [readyOrders, alertsOn, raiseAlarm])

  const tableNumbers = useMemo(() => {
    const tables = backend ? (liveTables ?? []) : demoTables
    return tables.filter((table) => table.assignedWaiterId === identity?.staffId).map((table) => table.number).sort((a, b) => a - b)
  }, [backend, identity?.staffId, liveTables])

  const tableCards = useMemo(() => tableNumbers.map((number) => {
    const tableOrders = active.filter((order) => order.tableNumber === number)
    return { number, count: tableOrders.length, ...tableState(tableOrders.map((order) => order.status)) }
  }), [active, tableNumbers])

  const servedToday = liveStats?.ordersServedToday ?? 0
  const medianServeMinutes = liveStats?.medianAcknowledgedToServedMs === null || liveStats?.medianAcknowledgedToServedMs === undefined
    ? null : Math.round(liveStats.medianAcknowledgedToServedMs / 60_000)

  async function enableAlerts() {
    unlockAudio()
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') { try { await Notification.requestPermission() } catch { /* ignore */ } }
    if (typeof localStorage !== 'undefined') localStorage.setItem(ALERTS_KEY, 'on')
    setAlertsOn(true)
    notify('Order alerts are on for this device')
    if (readyOrders.length > 0) raiseAlarm(readyOrders)
  }

  const dismissAlarm = useCallback((orderId: string) => {
    setAlarmQueue((queue) => {
      const next = queue.filter((order) => order._id !== orderId)
      if (next.length === 0) stopAlarm()
      return next
    })
  }, [])

  async function serve(order: Order) {
    dismissAlarm(order._id)
    setOrders((current) => current.map((entry) => entry._id === order._id ? { ...entry, status: 'served', servedAt: Date.now() } : entry))
    try {
      if (backend) await transition({ token: auth!.token, orderId: order._id, status: 'served' })
      notify(`Table ${order.tableNumber} marked served`)
    } catch {
      setOrders((current) => current.map((entry) => entry._id === order._id ? order : entry))
      notify('Serve update failed and was reverted', 'error')
    }
  }

  useEffect(() => () => stopAlarm(), [])

  const alarm = alarmQueue[0]

  return <DashboardShell role="waiter" section="My tables">
    {!alertsOn
      ? <button type="button" className="waiter-banner waiter-banner-cta" onClick={enableAlerts}><BellRing size={18} /><span>Turn on order alerts for this device</span><span className="waiter-banner-action">Enable</span></button>
      : readyOrders.length > 0 && <div className="waiter-banner" role="status"><BellRing size={18} /><span><strong>{readyOrders.length}</strong> {readyOrders.length === 1 ? 'order is' : 'orders are'} ready to serve</span></div>}

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

    {alarm && <div className="alarm-screen" role="alertdialog" aria-label="Order ready alarm">
      <div className="alarm-card">
        <span className="alarm-pulse" aria-hidden="true"><BellRing size={28} /></span>
        <p className="alarm-eyebrow">Order ready to serve</p>
        <p className="alarm-table">Table {alarm.tableNumber}</p>
        <p className="alarm-customer">{alarm.customerName}</p>
        <ul className="alarm-lines">{alarm.lines.map((line) => <li key={line.itemId}><strong>{line.quantity}×</strong> {line.nameSnapshot}</li>)}</ul>
        <div className="alarm-actions">
          <Button className="alarm-serve" onClick={() => serve(alarm)}><Check size={18} /><span>Mark served</span></Button>
          <Button variant="outline" onClick={() => dismissAlarm(alarm._id)}>Dismiss</Button>
        </div>
        {alarmQueue.length > 1 && <p className="fine-print muted">{alarmQueue.length - 1} more waiting</p>}
      </div>
    </div>}
  </DashboardShell>
}
