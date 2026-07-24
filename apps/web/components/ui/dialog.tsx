'use client'

import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'

export function Dialog({ open, title, description, children, onClose }: { open: boolean; title: string; description?: string | undefined; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])
  return <dialog ref={ref} className="dialog" onCancel={onClose} onClose={onClose} aria-labelledby="dialog-title"><div className="dialog-heading"><div><h2 id="dialog-title">{title}</h2>{description && <p className="muted">{description}</p>}</div><button className="icon-button" type="button" aria-label="Close dialog" onClick={onClose}><X size={18} /></button></div>{children}</dialog>
}
