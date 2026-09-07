'use client'

import { useMutation, useQuery } from 'convex/react'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardShell } from '@/components/shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthArgs, useBackendAvailable, useStaffIdentity } from '@/components/providers'
import { api } from '@/lib/convex'
import { demoOrders } from '@/lib/demo-data'
import { orderReferenceShort, type Order } from '@/lib/models'

type KitchenTab = 'all' | 'acknowledged' | 'preparing' | 'ready' | 'served'

const tabs: Array<{ key: KitchenTab; label: string }> = [
  { key: 'acknowledged', label: 'Acknowledged' }, { key: 'preparing', label: 'Preparing' },
  { key: 'ready', label: 'Ready' }, { key: 'served', label: 'Served' }, { key: 'all', label: 'All' },
]

const labels: Record<Order['status'], string> = {
  pending: 'New', acknowledged: 'Acknowledged', preparing: 'Preparing', ready: 'Ready', served: 'Served', closed: 'Closed', cancelled: 'Cancelled',
}

function elapsed(at: number, now: number) {
  return `${Math.max(0, Math.floor((now - at) / 60_000))} min`
}

export function KitchenDashboard() {
  const backend = useBackendAvailable()
  const auth = useAuthArgs()
  const identity = useStaffIdentity()
  const router = useRouter()
  const live = useQuery(api.orders.live, backend ? auth! : 'skip')
  const setPreparationMinutes = useMutation(api.orders.setPreparationMinutes)
  const pingWaiter = useMutation(api.orders.pingWaiter)
  const transition = useMutation(api.orders.transition)
  const [orders, setOrders] = useState<Order[]>(backend ? [] : demoOrders)
  const [tab, setTab] = useState<KitchenTab>('acknowledged')
  const [editingTime, setEditingTime] = useState<string | null>(null)
  const [now, setNow] = useState(Date.now())
  const [pinged, setPinged] = useState<string | null>(null)

  const kitchenAccess = !identity || identity.role !== 'counter' || identity.counterLabel === 'Kitchen counter'
  useEffect(() => { if (!kitchenAccess) router.replace('/counter') }, [kitchenAccess, router])

  useEffect(() => { if (live) setOrders(live) }, [live])
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 30_000); return () => window.clearInterval(timer) }, [])

  const kitchenOrders = useMemo(() => orders.filter((order) => ['acknowledged', 'preparing', 'ready', 'served'].includes(order.status)), [orders])
  const visible = tab === 'all' ? kitchenOrders : kitchenOrders.filter((order) => order.status === tab)
  const counts = useMemo(() => Object.fromEntries(tabs.map(({ key }) => [key, key === 'all' ? kitchenOrders.length : kitchenOrders.filter((order) => order.status === key).length])), [kitchenOrders])

  async function move(order: Order, status: Order['status']) {
    const before = orders
    setOrders((current) => current.map((entry) => entry._id === order._id ? { ...entry, status } : entry))
    try {
      if (backend) await transition({ token: auth!.token, orderId: order._id, status })
    } catch { setOrders(before) }
  }

  async function updateTime(order: Order, value: string) {
    const minutes = Number(value)
    if (!Number.isSafeInteger(minutes) || minutes < 1 || minutes > 240) return
    setOrders((current) => current.map((entry) => entry._id === order._id ? { ...entry, preparationMinutes: minutes } : entry))
    setEditingTime(null)
    if (backend) await setPreparationMinutes({ token: auth!.token, orderId: order._id, preparationMinutes: minutes })
  }

  async function ping(order: Order) {
    setPinged(order._id)
    try { if (backend) await pingWaiter({ token: auth!.token, orderId: order._id }) } catch { setPinged(null) }
  }

  if (!kitchenAccess) return null
  return <DashboardShell role="counter" section="Kitchen">
    <section className="page-section" aria-labelledby="kitchen-heading">
      <div className="section-heading"><div><p className="caption">Production queue</p><h1 id="kitchen-heading">Kitchen orders</h1><p className="muted">Counter staff acknowledge new orders. Kitchen staff prepare them and hand them to the waiter when ready.</p></div></div>
      <div className="queue-tabs" role="tablist" aria-label="Filter kitchen orders">{tabs.map((entry) => <button key={entry.key} type="button" role="tab" aria-selected={tab === entry.key} className={tab === entry.key ? 'queue-tab queue-tab-active' : 'queue-tab'} onClick={() => setTab(entry.key)}><span>{entry.label}</span><span className="queue-tab-count queue-tab-count-quiet">{counts[entry.key] ?? 0}</span></button>)}</div>
      {visible.length === 0 ? <div className="empty-state"><p className="muted">No {tab === 'all' ? '' : labels[tab].toLowerCase() + ' '}kitchen orders right now.</p></div> : <div className="queue-grid">{visible.map((order) => <article className={`order-card order-card-${order.status}`} key={order._id}>
        <header className="order-card-head"><div>{orderReferenceShort(order.reference) && <span className="order-reference">#{orderReferenceShort(order.reference)}</span>}<p className="order-table-number">Table {order.tableNumber}</p><p className="order-customer">{order.customerName}</p></div><span className={`status-pill status-${order.status}`}>{labels[order.status]}</span></header>
        <ul className="order-lines">{order.lines.map((line) => <li key={`${order._id}-${line.itemId}`}><strong>{line.quantity}×</strong> {line.nameSnapshot}</li>)}</ul>
        <div className="kitchen-prep-time"><span className="caption">Preparation time</span>{editingTime === order._id ? <Input aria-label="Preparation time in minutes" type="number" min="1" max="240" defaultValue={order.preparationMinutes ?? 20} autoFocus onBlur={(event) => { void updateTime(order, event.target.value) }} onKeyDown={(event) => { if (event.key === 'Enter') void updateTime(order, event.currentTarget.value) }} /> : <button type="button" className="prep-time-button" onClick={() => setEditingTime(order._id)}>{order.preparationMinutes ?? 20} minutes <span className="fine-print muted">Edit</span></button>}</div>
        <footer className="order-card-foot"><span className="fine-print muted">{elapsed(order.placedAt, now)} since order</span><div className="order-actions">{order.status === 'acknowledged' && <Button size="small" onClick={() => void move(order, 'preparing')}>Start preparing</Button>}{order.status === 'preparing' && <Button size="small" onClick={() => void move(order, 'ready')}>Mark ready</Button>}{order.status === 'ready' && <Button size="small" variant="secondary" onClick={() => void ping(order)} disabled={pinged === order._id}>{pinged === order._id ? 'Waiter pinged' : 'Ping waiter'}</Button>}{order.status === 'served' && <span className="fine-print muted">Handed off</span>}</div></footer>
      </article>)}</div>}
    </section>
  </DashboardShell>
}
