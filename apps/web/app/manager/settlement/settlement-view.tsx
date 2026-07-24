'use client'

import { useMutation, useQuery } from 'convex/react'
import { useState } from 'react'
import { DashboardShell } from '@/components/shell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import { useAuthArgs, useBackendAvailable } from '@/components/providers'
import { api, type SettlementSummary } from '@/lib/convex'
import { paymentMethodLabels, paymentMethods, type Id, type PaymentMethod } from '@/lib/models'

type UnpaidOrder = SettlementSummary['unpaidOrders'][number]

const waiveReasons = ['Staff meal', 'Service recovery', 'Manager comp', 'Other'] as const

const demoSummary: SettlementSummary = {
  window: { from: Date.now() - 12 * 60 * 60_000, to: Date.now() },
  ordersServed: 38,
  orderedValueKes: 45_090,
  settledRevenueKes: 41_200,
  waivedValueKes: 1_150,
  unpaidValueKes: 1_890,
  paidCount: 35,
  waivedCount: 1,
  unpaidCount: 2,
  refundsDueCount: 0,
  byMethod: [
    { method: 'cash', count: 22, valueKes: 24_900 },
    { method: 'mpesa', count: 11, valueKes: 14_150 },
    { method: 'card', count: 2, valueKes: 2_150 },
  ],
  unpaidOrders: [
    { _id: 'demo-1' as Id, reference: 'HF-20260724-0031', tableNumber: 5, customerName: 'Grace', totalKes: 1_150, servedAt: Date.now() - 62 * 60_000 },
    { _id: 'demo-2' as Id, reference: 'HF-20260724-0037', tableNumber: 9, customerName: 'Otieno', totalKes: 740, servedAt: Date.now() - 48 * 60_000 },
  ],
}

function servedAgo(servedAt: number) {
  const minutes = Math.max(0, Math.floor((Date.now() - servedAt) / 60_000))
  return `${minutes} min`
}

export function SettlementView() {
  const backend = useBackendAvailable()
  const auth = useAuthArgs()
  const result = useQuery(api.settlement.summary, backend ? auth! : 'skip')
  const markPaid = useMutation(api.settlement.markPaid)
  const waive = useMutation(api.settlement.waive)
  const notify = useToast()
  const [payOrder, setPayOrder] = useState<UnpaidOrder | null>(null)
  const [waiveTarget, setWaiveTarget] = useState<UnpaidOrder | null>(null)

  const data = result ?? (backend ? null : demoSummary)
  if (!data) return <DashboardShell section="Settlement"><section className="page-section"><p className="muted">Loading settlement…</p></section></DashboardShell>

  async function confirmPaid(order: UnpaidOrder, method: PaymentMethod) {
    setPayOrder(null)
    try {
      if (backend) await markPaid({ token: auth!.token, orderId: order._id, method })
      notify(`Order marked paid · ${paymentMethodLabels[method]}`)
    } catch { notify('Marking paid failed', 'error') }
  }

  async function submitWaive(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!waiveTarget) return
    const form = new FormData(event.currentTarget)
    const choice = String(form.get('reason') ?? '')
    const reason = (choice === 'Other' ? String(form.get('otherReason') ?? '') : choice).trim()
    if (reason.length < 3) { notify('A waive reason of at least 3 characters is required', 'error'); return }
    const target = waiveTarget
    setWaiveTarget(null)
    try {
      if (backend) await waive({ token: auth!.token, orderId: target._id, reason })
      notify('Order waived')
    } catch { notify('Waiving failed', 'error') }
  }

  return <DashboardShell section="Settlement" actions={<span className="caption">Today · settled only</span>}>
    <section className="page-section">
      <div className="section-heading"><div><p className="caption">Third leg of the daily close</p><h1>Settlement</h1><p className="muted">Money received against orders served. Settled revenue excludes waived and unpaid orders.</p></div></div>

      <div className="settlement-grid">
        <Card>
          <h3>Today</h3>
          <table className="settlement-summary-table">
            <tbody>
              <tr><td>Orders served today</td><td className="settlement-num">{data.ordersServed}</td><td /></tr>
              <tr className="settlement-row-head"><td>Paid</td><td className="settlement-num">{data.paidCount}</td><td className="settlement-num">KES {data.settledRevenueKes.toLocaleString()}</td></tr>
              {data.byMethod.map((entry) => <tr key={entry.method} className="settlement-row-sub"><td>{paymentMethodLabels[entry.method]}</td><td className="settlement-num">{entry.count}</td><td className="settlement-num">KES {entry.valueKes.toLocaleString()}</td></tr>)}
              <tr><td>Waived</td><td className="settlement-num">{data.waivedCount}</td><td className="settlement-num settlement-muted">KES {data.waivedValueKes.toLocaleString()}</td></tr>
              <tr className={data.unpaidCount > 0 ? 'settlement-row-unpaid' : undefined}><td>Unpaid{data.unpaidCount > 0 ? ' · unresolved' : ''}</td><td className="settlement-num">{data.unpaidCount}</td><td className="settlement-num">KES {data.unpaidValueKes.toLocaleString()}</td></tr>
              <tr><td>Refunds due</td><td className="settlement-num">{data.refundsDueCount}</td><td /></tr>
            </tbody>
          </table>
          <p className="fine-print muted settlement-note">Settled revenue is the revenue figure. Stock variance is reported separately and is never summed with settlement variance — the two measure different failures.</p>
        </Card>

        <Card>
          <h3>Unresolved unpaid orders</h3>
          <p className="fine-print muted">A day with unpaid orders should not close silently. Resolve each below before closing, or record a reason to close with unpaid orders.</p>
          {data.unpaidOrders.length === 0
            ? <p className="muted settlement-empty">Everything served today has been settled.</p>
            : <ul className="settlement-unpaid-list">{data.unpaidOrders.map((order) => <li key={order._id} className="settlement-unpaid-item">
              <div>
                <p className="body-strong">{order.reference ?? `Table ${order.tableNumber}`}</p>
                <p className="fine-print muted">Table {order.tableNumber} · {order.customerName} · KES {order.totalKes.toLocaleString()} · served {servedAgo(order.servedAt)} ago</p>
              </div>
              <div className="settlement-unpaid-actions">
                <Button size="small" onClick={() => setPayOrder(order)}>Mark paid</Button>
                <button type="button" className="settlement-link" onClick={() => setWaiveTarget(order)}>Waive</button>
              </div>
            </li>)}</ul>}
        </Card>
      </div>
    </section>

    <Dialog open={Boolean(payOrder)} onClose={() => setPayOrder(null)} title={`Mark paid — ${payOrder?.reference ?? ''}`} description="Method selection confirms the payment">
      {payOrder && <div className="method-picker">
        <div className="method-picker-order"><p className="body-strong">Table {payOrder.tableNumber} · {payOrder.customerName}</p><p className="method-picker-total">KES {payOrder.totalKes.toLocaleString()}</p></div>
        <p className="field-label">How was this paid?</p>
        <div className="method-grid">{paymentMethods.map((method) => <button key={method} type="button" className="method-button" onClick={() => { void confirmPaid(payOrder, method) }}>{paymentMethodLabels[method]}</button>)}</div>
        <div className="form-actions"><Button type="button" variant="secondary" onClick={() => setPayOrder(null)}>Cancel</Button></div>
      </div>}
    </Dialog>

    <Dialog open={Boolean(waiveTarget)} onClose={() => setWaiveTarget(null)} title="Waive order" description="A waived meal is not revenue and is recorded with a reason">
      {waiveTarget && <form className="form-stack" onSubmit={submitWaive}>
        <div className="method-picker-order"><p className="body-strong">{waiveTarget.reference ?? `Table ${waiveTarget.tableNumber}`} · KES {waiveTarget.totalKes.toLocaleString()}</p></div>
        <div className="field"><label htmlFor="s-waive-reason">Reason</label><Select id="s-waive-reason" name="reason" defaultValue={waiveReasons[0]}>{waiveReasons.map((reason) => <option key={reason} value={reason}>{reason}</option>)}</Select></div>
        <div className="field"><label htmlFor="s-waive-other">If other, describe</label><Input id="s-waive-other" name="otherReason" placeholder="Reason" /></div>
        <div className="form-actions"><Button type="button" variant="secondary" onClick={() => setWaiveTarget(null)}>Cancel</Button><Button type="submit">Waive order</Button></div>
      </form>}
    </Dialog>
  </DashboardShell>
}
