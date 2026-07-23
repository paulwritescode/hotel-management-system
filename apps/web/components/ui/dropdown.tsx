'use client'

import { useState, type ReactNode } from 'react'

export function Dropdown({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return <div className="dropdown"><button type="button" className="button button-secondary" aria-expanded={open} onClick={() => setOpen(!open)}>{label}</button>{open && <div className="dropdown-menu">{children}</div>}</div>
}
