'use client'

import type { LedgerEntry } from '@/lib/convex'
import { paymentMethodLabels, type PaymentMethod } from '@/lib/models'

function timeOfDay(at: number) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Nairobi', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(at))
}

function methodLabel(method?: string) {
  return method ? paymentMethodLabels[method as PaymentMethod] ?? method : ''
}

// Addendum 05 §8.3 / §7.3 — the atomic full-log row, rendered inside a semantic <table> (§10.3).
// A 3px status bar reinforces a text label; status is never carried by colour (§7.3). The order
// reference is never truncated (§9.2). The row is the drill-through tap target, >=44px (§9.3).
export function LedgerEntryRow({ entry, onOpen }: { entry: LedgerEntry; onOpen?: ((entry: LedgerEntry) => void) | undefined }) {
  const correction = entry.kind === 'correction'
  const barClass = correction ? 'ledger-bar-correction' : 'ledger-bar-recorded'
  const statusLabel = correction ? 'Corrected' : entry.kind === 'waived' ? 'Waived' : 'Paid'
  const details = correction
    ? `Corrected by ${entry.actorName}${entry.reason ? ` · "${entry.reason}"` : ''}`
    : [entry.tableNumber ? `Table ${entry.tableNumber}` : null, entry.customerName, entry.actorName].filter(Boolean).join(' · ')

  return <tr
    className={`ledger-row ${onOpen ? 'ledger-row-clickable' : ''}`}
    tabIndex={onOpen ? 0 : undefined}
    onClick={onOpen ? () => onOpen(entry) : undefined}
    onKeyDown={onOpen ? (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpen(entry) } } : undefined}
  >
    <td className="ledger-cell-ref" data-label="Reference">
      <span className={`ledger-bar ${barClass}`} aria-hidden="true" />
      <span className="ledger-ref">{entry.reference ?? '—'}</span>
      <span className="ledger-status-text fine-print">{statusLabel}</span>
    </td>
    <td className="ledger-cell-details" data-label="Details">{details}</td>
    <td className="ledger-cell-method" data-label="Method">{correction ? `${methodLabel(entry.fromLabel) || entry.fromLabel} → ${methodLabel(entry.toLabel) || entry.toLabel}` : methodLabel(entry.method)}</td>
    <td className="ledger-cell-amount" data-label="Amount" aria-label={`KES ${entry.amountKes.toLocaleString()}`}>KES {entry.amountKes.toLocaleString()}</td>
    <td className="ledger-cell-when" data-label="When">{timeOfDay(entry.at)}</td>
  </tr>
}
