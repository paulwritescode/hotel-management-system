'use client'

import { useMutation, useQuery } from 'convex/react'
import { useEffect, useMemo, useState } from 'react'
import { DashboardShell } from '@/components/shell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/toast'
import { useAuthArgs, useBackendAvailable } from '@/components/providers'
import { api } from '@/lib/convex'
import { demoItems, demoOrders } from '@/lib/demo-data'
import { categories, orderReferenceShort, type Item, type Order } from '@/lib/models'

const nextStatus: Partial<Record<Order['status'], { status: Order['status']; label: string }>> = {
  pending: { status: 'acknowledged', label: 'Acknowledge' },
  acknowledged: { status: 'preparing', label: 'Start preparing' },
  preparing: { status: 'ready', label: 'Mark ready' },
  ready: { status: 'served', label: 'Mark served' },
}

function elapsedLabel(placedAt: number, now: number) {
  const minutes = Math.max(0, Math.floor((now - placedAt) / 60_000))
  return `${minutes} min${minutes === 1 ? '' : 's'}`
}

export function CounterDashboard() {
  const backend = useBackendAvailable()
  const auth = useAuthArgs()
  const liveOrders = useQuery(api.orders.live, backend ? auth! : 'skip')
  const liveItems = useQuery(api.items.inventory, backend ? auth! : 'skip')
  const transition = useMutation(api.orders.transition)
  const cancel = useMutation(api.orders.cancel)
  const setAvailability = useMutation(api.items.setAvailability)
  const placeManual = useMutation(api.orders.placeManual)
  const notify = useToast()
  const [orders, setOrders] = useState<Order[]>(backend ? [] : demoOrders)
  const [items, setItems] = useState<Item[]>(backend ? [] : demoItems)
  const [now, setNow] = useState(Date.now())
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [manualOpen, setManualOpen] = useState(false)
  const [cancelOrder, setCancelOrder] = useState<Order | null>(null)
  const [selected, setSelected] = useState<Record<string, number>>({})

  useEffect(() => { if (liveOrders) setOrders(liveOrders) }, [liveOrders])
  useEffect(() => { if (liveItems) setItems(liveItems) }, [liveItems])
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 30_000); return () => window.clearInterval(timer) }, [])

  const filteredItems = useMemo(() => items.filter((item) => !item.archived && (category === 'all' || item.category === category) && item.name.toLowerCase().includes(search.toLowerCase())), [category, items, search])

  async function move(order: Order, status: Order['status'], cancellationReason?: string) {
    const before = orders
    setOrders((current) => current.map((item) => item._id === order._id ? { ...item, status, ...(status === 'served' ? { servedAt: Date.now() } : {}) } : item))
    try {
      if (backend) {
        if (status === 'cancelled') await cancel({ token: auth!.token, orderId: order._id, reason: cancellationReason! })
        else await transition({ token: auth!.token, orderId: order._id, status })
      }
      notify(status === 'cancelled' ? 'Order cancelled' : `Order moved to ${status}`)
    } catch { setOrders(before); notify('The order update failed and was reverted', 'error') }
  }

  async function toggleItem(item: Item) {
    const available = !item.available
    setItems((current) => current.map((entry) => entry._id === item._id ? { ...entry, available } : entry))
    try { if (backend) await setAvailability({ token: auth!.token, itemId: item._id, available }) }
    catch { setItems((current) => current.map((entry) => entry._id === item._id ? item : entry)); notify('Availability update failed and was reverted', 'error') }
  }

  async function submitCancel(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!cancelOrder) return
    const reason = String(new FormData(event.currentTarget).get('reason') ?? '').trim()
    if (reason.length < 3) { notify('Enter a cancellation reason of at least 3 characters', 'error'); return }
    await move(cancelOrder, 'cancelled', reason); setCancelOrder(null)
  }

  async function submitManual(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const tableNumber = Number(data.get('tableNumber'))
    const customerName = String(data.get('customerName') ?? '').trim() || 'Walk-up guest'
    const lines = Object.entries(selected).filter(([, quantity]) => quantity > 0).map(([itemId, quantity]) => ({ itemId, quantity }))
    if (!Number.isInteger(tableNumber) || tableNumber < 1 || !lines.length) { notify('Add a table number and at least one item', 'error'); return }
    try {
      if (backend) await placeManual({ ...auth!, tableNumber, customerName, lines })
      else {
        const orderLines = lines.map((line) => { const item = items.find((entry) => entry._id === line.itemId)!; return { itemId: item._id, nameSnapshot: item.name, priceKesSnapshot: item.priceKes, quantity: line.quantity } })
        setOrders((current) => [{ _id: `manual-${Date.now()}`, tableNumber, customerName, source: 'counter', lines: orderLines, totalKes: orderLines.reduce((sum, line) => sum + line.priceKesSnapshot * line.quantity, 0), status: 'pending', placedAt: Date.now() }, ...current])
      }
      setSelected({}); setManualOpen(false); notify('Manual order added to the live queue')
    } catch { notify('Manual order could not be created', 'error') }
  }

  return <DashboardShell role="counter" section="Counter" actions={<><span className="caption">{orders.filter((order) => !['served','closed','cancelled'].includes(order.status)).length} open orders</span><Button size="small" onClick={() => setManualOpen(true)}>New order</Button></>}>
    <section className="full-bleed-stack" aria-labelledby="queue-heading"><h1 id="queue-heading" className="sr-only">Live order queue</h1><div className="order-grid">{orders.filter((order) => !['closed','cancelled'].includes(order.status)).map((order) => {
      const action = nextStatus[order.status]
      const elapsed = Math.floor((now - order.placedAt) / 60_000)
      return <article key={order._id} className={`order-tile status-${order.status}`}><div><div className="inline-controls"><Badge>{order.status}</Badge>{orderReferenceShort(order.reference) && <span className="order-reference">#{orderReferenceShort(order.reference)}</span>}<span className={`fine-print ${elapsed > 15 ? 'elapsed-late' : ''}`}>{elapsedLabel(order.placedAt, now)}</span></div><p className="order-table-number">Table {order.tableNumber}</p><p className="order-customer">{order.customerName}</p><ul className="order-lines">{order.lines.map((line) => <li key={`${order._id}-${line.itemId}`}><strong>{line.quantity}×</strong> {line.nameSnapshot} <span className="muted">· KES {(line.priceKesSnapshot * line.quantity).toLocaleString()}</span></li>)}</ul></div><div className="order-summary"><div><p className="fine-print">Order total</p><p className="order-total">KES {order.totalKes.toLocaleString()}</p>{order.customerPhone && <a className="caption" href={`tel:${order.customerPhone}`}>Contact customer</a>}</div><div className="order-actions">{action && <Button size="small" onClick={() => move(order, action.status)}>{action.label}</Button>}{!['served','closed'].includes(order.status) && <Button size="small" variant="outline" onClick={() => setCancelOrder(order)}>Cancel</Button>}</div></div></article>
    })}</div></section>

    <section className="page-section" aria-labelledby="stock-heading"><div className="section-heading"><div><p className="caption">Live menu controls</p><h2 id="stock-heading">Stock strip</h2><p className="muted">One tap updates every connected menu and dashboard</p></div></div><div className="filter-bar"><Input type="search" placeholder="Search menu items" value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search menu items"/><Select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filter by category"><option value="all">All categories</option>{categories.map((entry) => <option key={entry}>{entry}</option>)}</Select></div><div className="stock-grid">{filteredItems.map((item) => <Card className="stock-card" key={item._id}><div className="stock-card-top"><div><h3>{item.name}</h3><p className="caption muted">{item.category} · KES {item.priceKes.toLocaleString()}</p></div><Switch checked={item.available} onClick={() => toggleItem(item)} aria-label={`${item.available ? 'Make' : 'Mark'} ${item.name} ${item.available ? 'unavailable' : 'available'}`} /></div><p className="fine-print">{item.quantityOnHand === undefined ? 'Quantity not tracked' : `${item.quantityOnHand} ${item.unit ?? 'units'} on hand`}</p></Card>)}</div></section>

    <Dialog open={manualOpen} onClose={() => setManualOpen(false)} title="New counter order" description="Add a walk-up order to the same live queue"><form className="form-stack" onSubmit={submitManual}><div className="field-grid"><div className="field"><label htmlFor="manual-table">Table number</label><Input id="manual-table" name="tableNumber" type="number" min="1" max="999" required /></div><div className="field"><label htmlFor="manual-name">Customer name</label><Input id="manual-name" name="customerName" placeholder="Walk-up guest" /></div></div><div className="field"><span className="field-label">Items</span>{items.filter((item) => item.available && !item.archived).map((item) => <div className="mapping-row" key={item._id}><span>{item.name} · KES {item.priceKes.toLocaleString()}</span><Input aria-label={`${item.name} quantity`} type="number" min="0" max="99" value={selected[item._id] ?? 0} onChange={(event) => setSelected((current) => ({ ...current, [item._id]: Number(event.target.value) }))} /></div>)}</div><div className="form-actions"><Button type="button" variant="secondary" onClick={() => setManualOpen(false)}>Keep browsing</Button><Button type="submit">Add order</Button></div></form></Dialog>
    <Dialog open={Boolean(cancelOrder)} onClose={() => setCancelOrder(null)} title="Cancel order" description="A reason and the signed-in staff member are recorded"><form className="form-stack" onSubmit={submitCancel}><div className="field"><label htmlFor="cancel-reason">Cancellation reason</label><Input id="cancel-reason" name="reason" minLength={3} required autoFocus /></div><div className="form-actions"><Button type="button" variant="secondary" onClick={() => setCancelOrder(null)}>Keep order</Button><Button type="submit" variant="danger">Cancel order</Button></div></form></Dialog>
  </DashboardShell>
}
