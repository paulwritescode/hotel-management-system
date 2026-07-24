'use client'

import { useQuery } from 'convex/react'
import { useState } from 'react'
import Link from 'next/link'
import { DashboardShell } from '@/components/shell'
import { LedgerLayer } from '@/components/ledger/ledger-layer'
import { SummaryFigureGrid } from '@/components/ledger/summary-figure-grid'
import { LedgerEntryRow } from '@/components/ledger/ledger-entry-row'
import { OrderTimeline } from '@/components/ledger/order-timeline'
import { useAuthArgs, useBackendAvailable } from '@/components/providers'
import { api, type LedgerEntry, type MyShift as MyShiftData } from '@/lib/convex'
import { paymentMethodLabels, type Id, type PaymentMethod } from '@/lib/models'

function since(from: number) {
  return `since ${new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Nairobi', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(from))}`
}
function servedAgo(at: number) {
  const minutes = Math.max(0, Math.floor((Date.now() - at) / 60_000))
  return minutes < 60 ? `${minutes} min ago` : `${Math.floor(minutes / 60)}h ${minutes % 60}m ago`
}

const demoShift: MyShiftData = {
  window: { from: Date.now() - 5 * 60 * 60_000, to: Date.now(), key: 'today' },
  summary: { recordedCount: 18, recordedValueKes: 21_400, byMethod: [
    { method: 'cash', count: 11, valueKes: 12_900 }, { method: 'mpesa', count: 6, valueKes: 7_350 }, { method: 'card', count: 1, valueKes: 1_150 },
  ] },
  attention: { unpaidOrders: [
    { _id: 'd1' as Id, reference: 'HF-20260724-0042', tableNumber: 7, customerName: 'Grace', totalKes: 1_450, servedAt: Date.now() - 52 * 60_000 },
  ] },
  entries: [
    { _id: 'd2' as Id, kind: 'paid', reference: 'HF-20260724-0039', tableNumber: 4, customerName: 'Otieno', amountKes: 980, method: 'cash', at: Date.now() - 30 * 60_000, actorName: 'You' },
    { _id: 'd3' as Id, kind: 'paid', reference: 'HF-20260724-0035', tableNumber: 2, customerName: 'Mwangi', amountKes: 1_150, method: 'mpesa', at: Date.now() - 74 * 60_000, actorName: 'You' },
  ],
  totalEntries: 18,
}

export function MyShift() {
  const backend = useBackendAvailable()
  const auth = useAuthArgs()
  const result = useQuery(api.ledger.myShift, backend ? auth! : 'skip')
  const [timelineId, setTimelineId] = useState<Id | null>(null)
  const timeline = useQuery(api.ledger.orderTimeline, backend && timelineId ? { token: auth!.token, orderId: timelineId } : 'skip')

  const data = result ?? (backend ? null : demoShift)
  if (!data) return <DashboardShell role="counter" section="My shift"><section className="page-section"><p className="muted">Loading your shift…</p></section></DashboardShell>

  const windowLabel = since(data.window.from)

  return <DashboardShell role="counter" section="My shift">
    <LedgerLayer title="My shift" surface="canvas">
      <SummaryFigureGrid figures={[
        { label: 'Settlements recorded', value: String(data.summary.recordedCount), window: windowLabel, tone: 'count' },
        { label: 'Value', value: `KES ${data.summary.recordedValueKes.toLocaleString()}`, window: windowLabel, tone: 'revenue' },
      ]} />
      {data.summary.byMethod.length > 0 && <ul className="method-tally">
        <li className="method-tally-head"><span>Method</span><span className="method-tally-count">Count</span><span className="method-tally-value">Value</span></li>
        {data.summary.byMethod.map((entry) => <li key={entry.method} className={`method-row method-${entry.method}`}><span className="method-name"><span className="method-dot" aria-hidden="true" />{paymentMethodLabels[entry.method as PaymentMethod]}</span><span className="method-tally-count">{entry.count}</span><span className="method-tally-value">KES {entry.valueKes.toLocaleString()}</span></li>)}
      </ul>}
    </LedgerLayer>

    <LedgerLayer title="Needs attention" surface="parchment" empty={data.attention.unpaidOrders.length === 0} emptyMessage="Nothing needs attention.">
      <ul className="attention-list">
        {data.attention.unpaidOrders.map((order) => <li key={order._id}>
          <Link className="attention-row" href="/counter">
            <span className="ledger-ref">{order.reference ?? `Table ${order.tableNumber}`}</span>
            <span className="fine-print">Table {order.tableNumber} · KES {order.totalKes.toLocaleString()} · served {servedAgo(order.servedAt)}</span>
          </Link>
        </li>)}
      </ul>
    </LedgerLayer>

    <LedgerLayer title="Full log" surface="parchment" collapsible defaultOpen={false} count={data.totalEntries} empty={data.entries.length === 0} emptyMessage="No settlements recorded today.">
      <table className="ledger-table">
        <caption className="sr-only">Your settlements this shift, most recent first</caption>
        <thead><tr><th scope="col">Reference</th><th scope="col">Details</th><th scope="col">Method</th><th scope="col">Amount</th><th scope="col">When</th></tr></thead>
        <tbody>{data.entries.map((entry: LedgerEntry) => <LedgerEntryRow key={entry._id} entry={entry} onOpen={backend ? (row) => setTimelineId(row._id) : undefined} />)}</tbody>
      </table>
    </LedgerLayer>

    <OrderTimeline open={Boolean(timelineId)} onClose={() => setTimelineId(null)} data={timeline ?? undefined} loading={!timeline} />
  </DashboardShell>
}
