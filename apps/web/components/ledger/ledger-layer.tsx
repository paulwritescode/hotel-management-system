'use client'

import { ChevronDown, ChevronRight } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'

// Addendum 05 §2/§8.1 — the three-layer structure. A ledger surface never opens as a chronological
// dump: Layers 1 and 2 are always open, Layer 3 is collapsed behind a deliberate disclosure. An
// empty layer renders an affirmative message, never blank space (§2, §10.1).
export function LedgerLayer({
  title, surface = 'canvas', collapsible = false, defaultOpen = false, count, empty = false, emptyMessage, children,
}: {
  title: string
  surface?: 'canvas' | 'parchment'
  collapsible?: boolean
  defaultOpen?: boolean
  count?: number
  empty?: boolean
  emptyMessage?: string
  children?: ReactNode
}) {
  const [open, setOpen] = useState(collapsible ? defaultOpen : true)
  const regionId = useId()
  const body = empty
    ? <p className="ledger-empty">{emptyMessage}</p>
    : children

  return <section className={`ledger-layer ledger-layer-${surface}`}>
    {collapsible
      ? <button type="button" className="ledger-disclosure" aria-expanded={open} aria-controls={regionId} onClick={() => setOpen((value) => !value)}>
          {open ? <ChevronDown size={18} aria-hidden="true" /> : <ChevronRight size={18} aria-hidden="true" />}
          <span className="section-head">{title}</span>
          {typeof count === 'number' && <span className="ledger-disclosure-count">{count} {count === 1 ? 'entry' : 'entries'}</span>}
        </button>
      : <h2 className="section-head">{title}</h2>}
    <div id={regionId} className="ledger-layer-body" hidden={collapsible && !open}>{body}</div>
  </section>
}
