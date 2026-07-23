'use client'

import { MoreHorizontal } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

export type RowAction = { label: string; onClick: () => void; danger?: boolean; disabled?: boolean }

// A compact "⋯" trigger that opens a dropdown menu of row actions. Keeps action-heavy table
// rows tidy and works well on mobile. Closes on outside click or Escape.
export function RowActions({ actions, label = 'Actions' }: { actions: RowAction[]; label?: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDocClick = (event: MouseEvent) => { if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false) }
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDocClick); document.removeEventListener('keydown', onKey) }
  }, [open])

  if (actions.length === 0) return <span className="fine-print muted">—</span>

  return <div className="row-actions" ref={ref}>
    <button type="button" className="row-actions-trigger" aria-haspopup="menu" aria-expanded={open} aria-label={label} onClick={() => setOpen((value) => !value)}>
      <MoreHorizontal size={18} />
    </button>
    {open && <div className="row-actions-menu" role="menu">
      {actions.map((action) => <button
        key={action.label}
        type="button"
        role="menuitem"
        disabled={action.disabled}
        className={action.danger ? 'row-actions-item row-actions-item-danger' : 'row-actions-item'}
        onClick={() => { setOpen(false); action.onClick() }}
      >{action.label}</button>)}
    </div>}
  </div>
}
