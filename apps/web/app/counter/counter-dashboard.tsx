'use client'

import { useMutation, useQuery } from 'convex/react'
import { useEffect, useMemo, useState } from 'react'
import { DashboardShell } from '@/components/shell'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import { useAuthArgs, useBackendAvailable, useStaffIdentity } from '@/components/providers'
import { OrderTimeline } from '@/components/ledger/order-timeline'
import { api, type RestaurantSettings } from '@/lib/convex'
import { demoItems, demoOrders } from '@/lib/demo-data'
import { downloadOrderSummary } from '@/lib/receipt'
import { orderReferenceShort, paymentMethodLabels, paymentMethods, type Item, type Order, type PaymentMethod } from '@/lib/models'

const nextStatus: Partial<Record<Order['status'], { status: Order['status']; label: string }>> = {
  pending: { status: 'acknowledged', label: 'Acknowledge' },
  acknowledged: { status: 'preparing', label: 'Start preparing' },
  preparing: { status: 'ready', label: 'Mark ready' },
  ready: { status: 'served', label: 'Mark served' },
}

const statusLabels: Record<Order['status'], string> = {
  pending: 'New', acknowledged: 'Acknowledged', preparing: 'Preparing',
  ready: 'Ready', served: 'Served', closed: 'Closed', cancelled: 'Cancelled',
}

// Tabs across the top of the queue. The statuses that still need attention (everything before
// "served") show a count indicator; "All" and "Served" do not.
const queueTabs: Array<{ key: 'all' | Order['status']; label: string; indicates: boolean }> = [
  { key: 'all', label: 'All', indicates: false },
  { key: 'pending', label: 'New', indicates: true },
  { key: 'acknowledged', label: 'Acknowledged', indicates: true },
  { key: 'preparing', label: 'Preparing', indicates: true },
  { key: 'ready', label: 'Ready', indicates: true },
  { key: 'served', label: 'Served', indicates: false },
]

// Addendum 04 §2.6 — served-and-unpaid past this many minutes carries a quiet text marker
// (never a colour: SPEC §4.2 reserves the left-bar treatment for fulfilment state).
const UNPAID_LINGER_MINUTES = 45

// Addendum 04 §2.4 — a small, consistent set of common waive reasons so the frequent cases are
// one tap and aggregate cleanly; "Other" opens a free-text field.
const waiveReasons = ['Staff meal', 'Service recovery', 'Manager comp', 'Other'] as const

function elapsedLabel(placedAt: number, now: number) {
  const minutes = Math.max(0, Math.floor((now - placedAt) / 60_000))
  return `${minutes} min${minutes === 1 ? '' : 's'}`
}

function timeOfDay(at: number) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Nairobi', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(at))
}

// §2.1 — matches the full reference, or the bare daily sequence (0042), case-insensitively and
// tolerating a missing HF- prefix, since that is what staff type and diners read aloud.
function matchesReference(order: Order, query: string): boolean {
  const norm = query.trim().toLowerCase().replace(/^hf-/, '')
  if (!norm) return true
  const reference = (order.reference ?? '').toLowerCase()
  const short = orderReferenceShort(order.reference)?.toLowerCase() ?? ''
  return reference.replace('hf-', '').includes(norm) || short.includes(norm)
}

export function CounterDashboard() {
  const backend = useBackendAvailable()
  const auth = useAuthArgs()
  const identity = useStaffIdentity()
  const liveOrders = useQuery(api.orders.live, backend ? auth! : 'skip')
  const liveItems = useQuery(api.items.inventory, backend ? auth! : 'skip')
  const settings = useQuery(api.restaurants.settings, backend ? auth! : 'skip')
  const transition = useMutation(api.orders.transition)
  const cancel = useMutation(api.orders.cancel)
  const placeManual = useMutation(api.orders.placeManual)
  const markPaid = useMutation(api.settlement.markPaid)
  const waiveOrder = useMutation(api.settlement.waive)
  const correctOrder = useMutation(api.settlement.correct)
  const notify = useToast()
  const [orders, setOrders] = useState<Order[]>(backend ? [] : demoOrders)
  const [items, setItems] = useState<Item[]>(backend ? [] : demoItems)
  const [now, setNow] = useState(Date.now())
  const [tab, setTab] = useState<'all' | Order['status']>('all')
  const [search, setSearch] = useState('')
  const [manualOpen, setManualOpen] = useState(false)
  const [cancelOrder, setCancelOrder] = useState<Order | null>(null)
  const [payOrder, setPayOrder] = useState<Order | null>(null)
  const [waiveTarget, setWaiveTarget] = useState<Order | null>(null)
  const [correctTarget, setCorrectTarget] = useState<Order | null>(null)
  const [timelineId, setTimelineId] = useState<Order['_id'] | null>(null)
  const [selected, setSelected] = useState<Record<string, number>>({})
  const timeline = useQuery(api.ledger.orderTimeline, backend && timelineId ? { token: auth!.token, orderId: timelineId } : 'skip')

  // Waive is a manager-and-owner action (§2.4); the server enforces it too. In the disconnected
  // demo there is no session, so we surface the controls for exploration.
  const elevated = !backend || identity?.role === 'manager' || identity?.role === 'owner'
  const paymentConfig: RestaurantSettings | undefined = backend
    ? settings
    : { name: 'Heavenly Foods', acceptedPaymentMethods: ['cash', 'mpesa', 'card'], mpesaTillNumber: '123456' }

  useEffect(() => { if (liveOrders) setOrders(liveOrders) }, [liveOrders])
  useEffect(() => { if (liveItems) setItems(liveItems) }, [liveItems])
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 30_000); return () => window.clearInterval(timer) }, [])

  const active = useMemo(() => orders.filter((order) => !['closed', 'cancelled'].includes(order.status)), [orders])
  const counts = useMemo(() => {
    const map: Record<string, number> = { all: active.length }
    for (const order of active) map[order.status] = (map[order.status] ?? 0) + 1
    return map
  }, [active])
  const trimmedSearch = search.trim()
  // §2.1 — a search ignores the status tab and scans the whole open queue; a match is highlighted.
  const searchResults = useMemo(() => trimmedSearch ? active.filter((order) => matchesReference(order, trimmedSearch)) : null, [active, trimmedSearch])
  const visible = searchResults ?? (tab === 'all' ? active : active.filter((order) => order.status === tab))

  // Optimistic settlement patch. Explicit undefined is used to clear fields (e.g. a correction
  // back to unpaid), so the change map permits undefined values.
  function patchLocal(orderId: string, changes: { [K in keyof Order]?: Order[K] | undefined }) {
    setOrders((current) => current.map((order) => order._id === orderId ? ({ ...order, ...changes } as Order) : order))
  }

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

  async function summary(order: Order) {
    try { await downloadOrderSummary(order, paymentConfig); notify('Order summary downloaded') }
    catch { notify('Could not generate the order summary', 'error') }
  }

  // §2.3 — method selection IS the confirmation; there is no second confirm step.
  async function confirmPaid(order: Order, method: PaymentMethod) {
    const before = orders
    patchLocal(order._id, { paymentStatus: 'paid', paymentMethod: method, paidAt: Date.now(), settledByName: identity?.name ?? 'You' })
    setPayOrder(null)
    try {
      if (backend) await markPaid({ token: auth!.token, orderId: order._id, method })
      notify(`Order marked paid · ${paymentMethodLabels[method]}`)
    } catch { setOrders(before); notify('Marking paid failed and was reverted', 'error') }
  }

  async function submitWaive(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!waiveTarget) return
    const data = new FormData(event.currentTarget)
    const choice = String(data.get('reason') ?? '')
    const reason = (choice === 'Other' ? String(data.get('otherReason') ?? '') : choice).trim()
    if (reason.length < 3) { notify('A waive reason of at least 3 characters is required', 'error'); return }
    const target = waiveTarget
    const before = orders
    patchLocal(target._id, { paymentStatus: 'waived', waivedReason: reason, settledByName: identity?.name ?? 'You' })
    setWaiveTarget(null)
    try {
      if (backend) await waiveOrder({ token: auth!.token, orderId: target._id, reason })
      notify('Order waived')
    } catch { setOrders(before); notify('Waiving failed and was reverted', 'error') }
  }

  async function submitCorrect(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!correctTarget) return
    const data = new FormData(event.currentTarget)
    const toStatus = String(data.get('toStatus') ?? '') as Order['paymentStatus']
    const method = (data.get('method') ? String(data.get('method')) : undefined) as PaymentMethod | undefined
    const reason = String(data.get('reason') ?? '').trim()
    if (reason.length < 3) { notify('A correction reason of at least 3 characters is required', 'error'); return }
    if (toStatus === 'paid' && !method) { notify('Choose a payment method for the corrected settlement', 'error'); return }
    const target = correctTarget
    const before = orders
    patchLocal(target._id, {
      paymentStatus: toStatus,
      paymentMethod: toStatus === 'paid' ? method : undefined,
      waivedReason: toStatus === 'waived' ? reason : undefined,
      settledByName: toStatus === 'unpaid' ? undefined : identity?.name ?? 'You',
    })
    setCorrectTarget(null)
    try {
      if (backend) await correctOrder({ token: auth!.token, orderId: target._id, toStatus, method, reason })
      notify('Settlement corrected')
    } catch { setOrders(before); notify('The correction failed and was reverted', 'error') }
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
        setOrders((current) => [{ _id: `manual-${Date.now()}`, tableNumber, customerName, source: 'counter', lines: orderLines, totalKes: orderLines.reduce((sum, line) => sum + line.priceKesSnapshot * line.quantity, 0), status: 'pending', paymentStatus: 'unpaid', placedAt: Date.now() }, ...current])
      }
      setSelected({}); setManualOpen(false); notify('Manual order added to the live queue')
    } catch { notify('Manual order could not be created', 'error') }
  }

  // §2.2 — the settlement region, visually distinct from the fulfilment actions above it.
  function renderSettlement(order: Order) {
    if (order.paymentStatus === 'paid') {
      const parts = ['Paid', order.paymentMethod ? paymentMethodLabels[order.paymentMethod] : null, order.settledByName, order.paidAt ? timeOfDay(order.paidAt) : null].filter(Boolean)
      return <div className="settlement-region">
        <p className="settlement-state settlement-state-paid">{parts.join(' · ')}</p>
        {order.refundDue && <span className="settlement-refund">Refund due</span>}
        {elevated && <button type="button" className="settlement-link" onClick={() => setCorrectTarget(order)}>Correct settlement</button>}
      </div>
    }
    if (order.paymentStatus === 'waived') {
      return <div className="settlement-region">
        <p className="settlement-state settlement-state-waived">{['Waived', order.settledByName, order.waivedReason].filter(Boolean).join(' · ')}</p>
        {elevated && <button type="button" className="settlement-link" onClick={() => setCorrectTarget(order)}>Correct settlement</button>}
      </div>
    }
    // Unpaid.
    const served = order.status === 'served' && order.servedAt
    const lingerMinutes = served ? Math.floor((now - order.servedAt!) / 60_000) : 0
    return <div className="settlement-region">
      {served && <p className={lingerMinutes >= UNPAID_LINGER_MINUTES ? 'settlement-unpaid-linger' : 'fine-print muted'}>Unpaid · {lingerMinutes} min</p>}
      <div className="settlement-actions">
        <Button size="small" onClick={() => setPayOrder(order)}>Mark paid</Button>
        {elevated && <button type="button" className="settlement-link" onClick={() => setWaiveTarget(order)}>Waive</button>}
      </div>
    </div>
  }

  return <DashboardShell role="counter" section="Live queue" actions={<><span className="caption">{counts.all ?? 0} open</span><Button size="small" onClick={() => setManualOpen(true)}>New order</Button></>}>
    <section className="page-section" aria-labelledby="queue-heading">
      <h1 id="queue-heading" className="sr-only">Live order queue</h1>

      <div className="queue-search">
        <Input type="search" inputMode="numeric" aria-label="Search by order reference" placeholder="Search reference, e.g. 0042" value={search} onChange={(event) => setSearch(event.target.value)} />
      </div>

      <div className="queue-tabs" role="tablist" aria-label="Filter orders by status">{queueTabs.map((entry) => {
        const count = counts[entry.key] ?? 0
        return <button key={entry.key} type="button" role="tab" aria-selected={tab === entry.key} className={tab === entry.key ? 'queue-tab queue-tab-active' : 'queue-tab'} onClick={() => { setTab(entry.key); setSearch('') }}>
          <span>{entry.label}</span>
          {entry.indicates && count > 0 && <span className="queue-tab-count">{count}</span>}
          {!entry.indicates && count > 0 && <span className="queue-tab-count queue-tab-count-quiet">{count}</span>}
        </button>
      })}</div>

      {visible.length === 0
        ? <div className="empty-state"><p className="muted">{searchResults ? `No order found for “${trimmedSearch}”.` : `No ${tab === 'all' ? 'open' : statusLabels[tab as Order['status']].toLowerCase()} orders right now.`}</p></div>
        : <div className="queue-grid">{visible.map((order) => {
          const action = nextStatus[order.status]
          const highlighted = Boolean(searchResults) && matchesReference(order, trimmedSearch)
          return <article key={order._id} className={`order-card order-card-${order.status}${highlighted ? ' order-card-match' : ''}`}>
            <header className="order-card-head">
              <div>
                {orderReferenceShort(order.reference) && <span className="order-reference">#{orderReferenceShort(order.reference)}</span>}
                <p className="order-table-number">Table {order.tableNumber}</p>
                <p className="order-customer">{order.customerName}</p>
              </div>
              <span className={`status-pill status-${order.status}`}>{statusLabels[order.status]}</span>
            </header>
            <ul className="order-lines">{order.lines.map((line) => <li key={`${order._id}-${line.itemId}`}><strong>{line.quantity}×</strong> {line.nameSnapshot} <span className="muted">· KES {(line.priceKesSnapshot * line.quantity).toLocaleString()}</span></li>)}</ul>
            <footer className="order-card-foot">
              <div>
                <p className="order-total">KES {order.totalKes.toLocaleString()}</p>
                <p className={`fine-print ${elapsedLabel(order.placedAt, now) && Math.floor((now - order.placedAt) / 60_000) > 15 ? 'elapsed-late' : 'muted'}`}>{elapsedLabel(order.placedAt, now)}{order.customerPhone ? ' · ' : ''}{order.customerPhone && <a href={`tel:${order.customerPhone}`}>Call</a>}</p>
              </div>
              <div className="order-actions">
                {action && <Button size="small" onClick={() => move(order, action.status)}>{action.label}</Button>}
                <Button size="small" variant="secondary" icon={false} onClick={() => { void summary(order) }}>Summary</Button>
                <Button size="small" variant="secondary" icon={false} onClick={() => setTimelineId(order._id)}>Timeline</Button>
                {!['served', 'closed'].includes(order.status) && <Button size="small" variant="outline" onClick={() => setCancelOrder(order)}>Cancel</Button>}
              </div>
            </footer>
            {renderSettlement(order)}
          </article>
        })}</div>}
    </section>

    {/* §2.3 — Mark-paid method picker. The reference, table, name and total are shown, and a
        method tap is the confirmation. */}
    <Dialog open={Boolean(payOrder)} onClose={() => setPayOrder(null)} title={`Mark paid — ${payOrder?.reference ?? (payOrder ? `Table ${payOrder.tableNumber}` : '')}`} description="Method selection confirms the payment">
      {payOrder && <div className="method-picker">
        <div className="method-picker-order">
          <p className="body-strong">Table {payOrder.tableNumber} · {payOrder.customerName}</p>
          <p className="method-picker-total">KES {payOrder.totalKes.toLocaleString()}</p>
        </div>
        <p className="field-label">How was this paid?</p>
        <div className="method-grid">{paymentMethods.map((method) => <button key={method} type="button" className="method-button" onClick={() => { void confirmPaid(payOrder, method) }}>{paymentMethodLabels[method]}</button>)}</div>
        <div className="form-actions"><Button type="button" variant="secondary" onClick={() => setPayOrder(null)}>Cancel</Button></div>
      </div>}
    </Dialog>

    {/* §2.4 — Waive. Manager and owner only; the server enforces the same. */}
    <Dialog open={Boolean(waiveTarget)} onClose={() => setWaiveTarget(null)} title="Waive order" description="A waived meal is not revenue and is recorded with a reason">
      {waiveTarget && <form className="form-stack" onSubmit={submitWaive}>
        <div className="method-picker-order"><p className="body-strong">{waiveTarget.reference ?? `Table ${waiveTarget.tableNumber}`} · KES {waiveTarget.totalKes.toLocaleString()}</p></div>
        <div className="field"><label htmlFor="waive-reason">Reason</label><Select id="waive-reason" name="reason" defaultValue={waiveReasons[0]}>{waiveReasons.map((reason) => <option key={reason} value={reason}>{reason}</option>)}</Select></div>
        <div className="field"><label htmlFor="waive-other">If other, describe</label><Input id="waive-other" name="otherReason" placeholder="Reason" /></div>
        <div className="form-actions"><Button type="button" variant="secondary" onClick={() => setWaiveTarget(null)}>Cancel</Button><Button type="submit">Waive order</Button></div>
      </form>}
    </Dialog>

    {/* §2.5 — Correct a mis-recorded settlement. Manager and owner only; appends a ledger row. */}
    <Dialog open={Boolean(correctTarget)} onClose={() => setCorrectTarget(null)} title="Correct settlement" description="This records a correction; it never erases history">
      {correctTarget && <form className="form-stack" onSubmit={submitCorrect}>
        <div className="method-picker-order"><p className="body-strong">{correctTarget.reference ?? `Table ${correctTarget.tableNumber}`} · currently {correctTarget.paymentStatus}</p></div>
        <div className="field"><label htmlFor="correct-status">Corrected status</label><Select id="correct-status" name="toStatus" defaultValue="unpaid"><option value="unpaid">Unpaid</option><option value="paid">Paid</option><option value="waived">Waived</option></Select></div>
        <div className="field"><label htmlFor="correct-method">Method (if paid)</label><Select id="correct-method" name="method" defaultValue="cash">{paymentMethods.map((method) => <option key={method} value={method}>{paymentMethodLabels[method]}</option>)}</Select></div>
        <div className="field"><label htmlFor="correct-reason">Reason</label><Input id="correct-reason" name="reason" minLength={3} required autoFocus /></div>
        <div className="form-actions"><Button type="button" variant="secondary" onClick={() => setCorrectTarget(null)}>Cancel</Button><Button type="submit">Record correction</Button></div>
      </form>}
    </Dialog>

    <OrderTimeline open={Boolean(timelineId)} onClose={() => setTimelineId(null)} data={timeline ?? undefined} loading={!timeline} />

    <Dialog open={manualOpen} onClose={() => setManualOpen(false)} title="New counter order" description="Add a walk-up order to the same live queue"><form className="form-stack" onSubmit={submitManual}><div className="field-grid"><div className="field"><label htmlFor="manual-table">Table number</label><Input id="manual-table" name="tableNumber" type="number" min="1" max="999" required /></div><div className="field"><label htmlFor="manual-name">Customer name</label><Input id="manual-name" name="customerName" placeholder="Walk-up guest" /></div></div><div className="field"><span className="field-label">Items</span>{items.filter((item) => item.available && !item.archived).map((item) => <div className="mapping-row" key={item._id}><span>{item.name} · KES {item.priceKes.toLocaleString()}</span><Input aria-label={`${item.name} quantity`} type="number" min="0" max="99" value={selected[item._id] ?? 0} onChange={(event) => setSelected((current) => ({ ...current, [item._id]: Number(event.target.value) }))} /></div>)}</div><div className="form-actions"><Button type="button" variant="secondary" onClick={() => setManualOpen(false)}>Keep browsing</Button><Button type="submit">Add order</Button></div></form></Dialog>
    <Dialog open={Boolean(cancelOrder)} onClose={() => setCancelOrder(null)} title="Cancel order" description="A reason and the signed-in staff member are recorded"><form className="form-stack" onSubmit={submitCancel}><div className="field"><label htmlFor="cancel-reason">Cancellation reason</label><Input id="cancel-reason" name="reason" minLength={3} required autoFocus /></div><div className="form-actions"><Button type="button" variant="secondary" onClick={() => setCancelOrder(null)}>Keep order</Button><Button type="submit" variant="danger">Cancel order</Button></div></form></Dialog>
  </DashboardShell>
}
