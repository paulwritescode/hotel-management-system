'use client'

import { Dialog } from '@/components/ui/dialog'
import type { OrderTimelineResult } from '@/lib/convex'

function timeOfDay(at: number) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Nairobi', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(at))
}

// Addendum 05 §4 / §8.5 — per-order timeline. Sequence is the meaning, so it is an ordered list.
// A filled node is a completed event; a hollow node is a correction or exception. Visibility is
// applied in the query (a counter viewer never receives correction events), not here.
export function OrderTimeline({ open, onClose, data, loading }: { open: boolean; onClose: () => void; data?: OrderTimelineResult | undefined; loading?: boolean | undefined }) {
  const title = data ? `${data.order.reference ?? `Table ${data.order.tableNumber}`}` : 'Timeline'
  return <Dialog open={open} onClose={onClose} title={title} description={data ? `Table ${data.order.tableNumber} · ${data.order.customerName}` : undefined}>
    {loading || !data
      ? <p className="ledger-empty">Loading timeline…</p>
      : <ol className="timeline">
        {data.events.map((event, index) => <li key={`${event.at}-${index}`} className={event.exception ? 'timeline-item timeline-item-exception' : 'timeline-item'}>
          <span className="timeline-time fine-print">{timeOfDay(event.at)}</span>
          <span className={event.exception ? 'timeline-node timeline-node-hollow' : 'timeline-node'} aria-hidden="true" />
          <span className="timeline-body"><span className="timeline-label">{event.label}</span><span className="timeline-actor fine-print">{event.actor}</span></span>
        </li>)}
      </ol>}
  </Dialog>
}
