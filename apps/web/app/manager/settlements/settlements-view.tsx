'use client'

import { useMutation, useQuery } from 'convex/react'
import { useMemo, useState } from 'react'
import { DashboardShell } from '@/components/shell'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import { LedgerLayer } from '@/components/ledger/ledger-layer'
import { SummaryFigureGrid } from '@/components/ledger/summary-figure-grid'
import { LedgerEntryRow } from '@/components/ledger/ledger-entry-row'
import { SignalCard } from '@/components/ledger/signal-card'
import { OrderTimeline } from '@/components/ledger/order-timeline'
import { WindowSelector } from '@/components/ledger/window-selector'
import { useAuthArgs, useBackendAvailable, useStaffIdentity } from '@/components/providers'
import { api, type LedgerEntry, type SettlementLog, type SignalsResult, type UnpaidRow, type WindowKey } from '@/lib/convex'
import { paymentMethodLabels, paymentMethods, type Id, type PaymentMethod } from '@/lib/models'

const waiveReasons = ['Staff meal', 'Service recovery', 'Manager comp', 'Other'] as const

function servedAgo(at: number) {
  const minutes = Math.max(0, Math.floor((Date.now() - at) / 60_000))
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}

export function SettlementsView() {
  const backend = useBackendAvailable()
  const auth = useAuthArgs()
  const identity = useStaffIdentity()
  const notify = useToast()
  const [window, setWindow] = useState<WindowKey>('today')
  const [methodFilter, setMethodFilter] = useState('')
  const [kindFilter, setKindFilter] = useState('')
  const [staffFilter, setStaffFilter] = useState('')
  const [logOpen, setLogOpen] = useState(false)
  const [payOrder, setPayOrder] = useState<UnpaidRow | null>(null)
  const [waiveTarget, setWaiveTarget] = useState<UnpaidRow | null>(null)
  const [timelineId, setTimelineId] = useState<Id | null>(null)

  const isOwner = identity?.role === 'owner' || !backend
  const log = useQuery(api.ledger.settlementLog, backend ? { ...auth!, window } : 'skip') as SettlementLog | undefined
  const signalsResult = useQuery(api.ledger.signals, backend && isOwner ? { ...auth!, window } : 'skip') as SignalsResult | undefined
  const timeline = useQuery(api.ledger.orderTimeline, backend && timelineId ? { token: auth!.token, orderId: timelineId } : 'skip')
  const markPaid = useMutation(api.settlement.markPaid)
  const waive = useMutation(api.settlement.waive)

  const data = log ?? (backend ? null : demoLog())
  const signals = signalsResult ?? (backend ? undefined : demoSignals())

  const staffOptions = useMemo(() => data ? [...new Set(data.entries.map((entry) => entry.actorName))].sort() : [], [data])
  const filtered = useMemo(() => data ? data.entries.filter((entry) =>
    (!methodFilter || entry.method === methodFilter) && (!kindFilter || entry.kind === kindFilter) && (!staffFilter || entry.actorName === staffFilter),
  ) : [], [data, methodFilter, kindFilter, staffFilter])

  if (!data) return <DashboardShell section="Settlements"><section className="page-section"><p className="muted">Loading settlements…</p></section></DashboardShell>

  const windowLabel = window === 'today' ? 'Today' : window === '7d' ? 'Last 7 days' : window === '30d' ? 'Last 30 days' : 'Last 90 days'

  async function confirmPaid(order: UnpaidRow, method: PaymentMethod) {
    setPayOrder(null)
    try { if (backend) await markPaid({ token: auth!.token, orderId: order._id, method }); notify(`Order marked paid · ${paymentMethodLabels[method]}`) }
    catch { notify('Marking paid failed', 'error') }
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
    try { if (backend) await waive({ token: auth!.token, orderId: target._id, reason }); notify('Order waived') }
    catch { notify('Waiving failed', 'error') }
  }
  function drillToLog() { setLogOpen(true); requestAnimationFrame(() => document.getElementById('full-log')?.scrollIntoView({ behavior: 'smooth' })) }

  const attention = data.attention
  const attentionEmpty = attention.unpaidOrders.length === 0 && attention.refundsDue.length === 0 && attention.waives.length === 0 && attention.corrections.length === 0

  return <DashboardShell section="Settlements" actions={<WindowSelector value={window} onChange={setWindow} />}>
    <LedgerLayer title={`Settlements · ${windowLabel.toLowerCase()}`} surface="canvas">
      <SummaryFigureGrid figures={[
        { label: 'Recorded', value: `KES ${data.summary.recordedValueKes.toLocaleString()}`, window: `${data.summary.recordedCount} settled · ${windowLabel}` },
        { label: 'Waived', value: `KES ${data.summary.waivedValueKes.toLocaleString()}`, window: `${data.summary.waivedCount} · ${windowLabel}` },
        { label: 'Unpaid', value: `KES ${data.summary.unpaidValueKes.toLocaleString()}`, window: `${data.summary.unpaidCount} · ${windowLabel}` },
      ]} />
      {data.summary.byMethod.length > 0 && <ul className="method-tally">
        {data.summary.byMethod.map((entry) => <li key={entry.method}><span>{paymentMethodLabels[entry.method as PaymentMethod]}</span><span className="method-tally-count">{entry.count}</span><span className="method-tally-value">KES {entry.valueKes.toLocaleString()}</span></li>)}
      </ul>}
    </LedgerLayer>

    <LedgerLayer title="Needs attention" surface="parchment" empty={attentionEmpty} emptyMessage="Nothing needs attention.">
      {attention.unpaidOrders.length > 0 && <div className="attention-group">
        <p className="attention-group-head">Unpaid past 45 minutes</p>
        <ul className="attention-list">{attention.unpaidOrders.map((order) => <li key={order._id} className="attention-resolve">
          <div><span className="ledger-ref">{order.reference ?? `Table ${order.tableNumber}`}</span><span className="fine-print"> Table {order.tableNumber} · {order.customerName} · KES {order.totalKes.toLocaleString()} · {servedAgo(order.servedAt)}</span></div>
          <div className="attention-resolve-actions"><Button size="small" onClick={() => setPayOrder(order)}>Mark paid</Button><button type="button" className="settlement-link" onClick={() => setWaiveTarget(order)}>Waive</button></div>
        </li>)}</ul>
      </div>}
      {attention.refundsDue.length > 0 && <div className="attention-group">
        <p className="attention-group-head">Refunds due</p>
        <ul className="attention-list">{attention.refundsDue.map((order) => <li key={order._id}><span className="ledger-ref">{order.reference ?? `Table ${order.tableNumber}`}</span><span className="fine-print"> Table {order.tableNumber} · KES {order.totalKes.toLocaleString()}</span></li>)}</ul>
      </div>}
      {attention.waives.length > 0 && <div className="attention-group">
        <p className="attention-group-head">Waived {window === 'today' ? 'today' : 'in window'}</p>
        <ul className="attention-list">{attention.waives.map((entry) => <li key={entry._id}><span className="ledger-ref">{entry.reference ?? '—'}</span><span className="fine-print"> KES {entry.amountKes.toLocaleString()} · {entry.actorName}{entry.reason ? ` · "${entry.reason}"` : ''}</span></li>)}</ul>
      </div>}
      {attention.corrections.length > 0 && <div className="attention-group">
        <p className="attention-group-head">Corrections {window === 'today' ? 'today' : 'in window'}</p>
        <ul className="attention-list">{attention.corrections.map((entry) => <li key={entry._id}><span className="ledger-ref">{entry.reference ?? '—'}</span><span className="fine-print"> {entry.fromLabel} → {entry.toLabel} · {entry.actorName}{entry.reason ? ` · "${entry.reason}"` : ''}</span></li>)}</ul>
      </div>}
    </LedgerLayer>

    {isOwner && <LedgerLayer title="Patterns worth reviewing" surface="canvas"
      empty={!signals || signals.status === 'insufficient' || signals.signals.length === 0}
      emptyMessage={!signals ? 'Loading…' : signals.status === 'insufficient' ? 'Not enough activity yet.' : 'Nothing needs attention.'}>
      <div className="signal-stack">
        {signals?.signals.map((signal) => <SignalCard key={signal.id} headline={signal.headline} summary={signal.summary} breakdown={signal.breakdown} benignNote={signal.benignNote} onDrillThrough={drillToLog} />)}
      </div>
    </LedgerLayer>}

    <div id="full-log">
      <LedgerLayer key={logOpen ? 'open' : 'closed'} title="Full log" surface="parchment" collapsible defaultOpen={logOpen} count={data.totalEntries} empty={data.entries.length === 0} emptyMessage="No settlements recorded in this window.">
        <div className="log-filters">
          <Select aria-label="Filter by staff" value={staffFilter} onChange={(event) => setStaffFilter(event.target.value)}><option value="">All staff</option>{staffOptions.map((name) => <option key={name} value={name}>{name}</option>)}</Select>
          <Select aria-label="Filter by method" value={methodFilter} onChange={(event) => setMethodFilter(event.target.value)}><option value="">All methods</option>{paymentMethods.map((method) => <option key={method} value={method}>{paymentMethodLabels[method]}</option>)}</Select>
          <Select aria-label="Filter by kind" value={kindFilter} onChange={(event) => setKindFilter(event.target.value)}><option value="">All kinds</option><option value="paid">Paid</option><option value="waived">Waived</option><option value="correction">Correction</option></Select>
        </div>
        <table className="ledger-table">
          <caption className="sr-only">Settlement events, most recent first</caption>
          <thead><tr><th scope="col">Reference</th><th scope="col">Details</th><th scope="col">Method</th><th scope="col">Amount</th><th scope="col">When</th></tr></thead>
          <tbody>{filtered.map((entry: LedgerEntry) => <LedgerEntryRow key={entry._id} entry={entry} onOpen={backend ? (row) => setTimelineId(row._id) : undefined} />)}</tbody>
        </table>
        <p className="retention-note fine-print">Showing the last {data.retentionDays} days. Older entries are not retained.</p>
      </LedgerLayer>
    </div>

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
        <div className="field"><label htmlFor="w-reason">Reason</label><Select id="w-reason" name="reason" defaultValue={waiveReasons[0]}>{waiveReasons.map((reason) => <option key={reason} value={reason}>{reason}</option>)}</Select></div>
        <div className="field"><label htmlFor="w-other">If other, describe</label><Input id="w-other" name="otherReason" placeholder="Reason" /></div>
        <div className="form-actions"><Button type="button" variant="secondary" onClick={() => setWaiveTarget(null)}>Cancel</Button><Button type="submit">Waive order</Button></div>
      </form>}
    </Dialog>

    <OrderTimeline open={Boolean(timelineId)} onClose={() => setTimelineId(null)} data={timeline ?? undefined} loading={!timeline} />
  </DashboardShell>
}

function demoLog(): SettlementLog {
  const now = Date.now()
  return {
    window: { from: now - 12 * 60 * 60_000, to: now, key: 'today' },
    retentionDays: 90,
    summary: { recordedCount: 35, recordedValueKes: 41_200, waivedCount: 1, waivedValueKes: 1_150, unpaidCount: 2, unpaidValueKes: 1_890, byMethod: [
      { method: 'cash', count: 22, valueKes: 24_900 }, { method: 'mpesa', count: 11, valueKes: 14_150 }, { method: 'card', count: 2, valueKes: 2_150 },
    ] },
    attention: {
      unpaidOrders: [{ _id: 'a1' as Id, reference: 'HF-20260724-0042', tableNumber: 7, customerName: 'Grace', totalKes: 1_450, servedAt: now - 62 * 60_000 }],
      refundsDue: [],
      waives: [{ _id: 'w1' as Id, kind: 'waived', reference: 'HF-20260724-0030', tableNumber: 3, amountKes: 1_150, at: now - 3 * 60 * 60_000, actorName: 'Sarah M.', reason: 'Staff meal' }],
      corrections: [{ _id: 'c1' as Id, kind: 'correction', reference: 'HF-20260724-0021', amountKes: 980, at: now - 2 * 60 * 60_000, actorName: 'Sarah M.', reason: 'Wrong method selected', fromLabel: 'cash', toLabel: 'mpesa' }],
    },
    entries: [
      { _id: 'e1' as Id, kind: 'paid', reference: 'HF-20260724-0040', tableNumber: 5, customerName: 'Amina', amountKes: 1_460, method: 'cash', at: now - 40 * 60_000, actorName: 'Peter M.' },
      { _id: 'c1' as Id, kind: 'correction', reference: 'HF-20260724-0021', amountKes: 980, at: now - 2 * 60 * 60_000, actorName: 'Sarah M.', reason: 'Wrong method selected', fromLabel: 'cash', toLabel: 'mpesa' },
    ],
    totalEntries: 35,
  }
}

function demoSignals(): SignalsResult {
  return {
    window: { from: Date.now() - 7 * 24 * 60 * 60_000, to: Date.now(), key: '7d' },
    status: 'ok',
    signals: [{
      id: 'S1', headline: 'Late settlements',
      summary: '6 settlements recorded more than 90 minutes after service, out of 214 in this window.',
      breakdown: [{ name: 'Peter M.', count: 4, denominator: 68 }, { name: 'Grace N.', count: 2, denominator: 51 }],
      benignNote: 'Diners who linger produce the same pattern.',
    }],
  }
}
