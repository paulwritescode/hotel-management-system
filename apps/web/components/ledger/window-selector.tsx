'use client'

import type { WindowKey } from '@/lib/convex'

// Addendum 05 §8.6 — shared window control. Tabs on desktop, a select below 640px (CSS toggles
// which is shown). The selection is deliberately NOT persisted across navigation; a fresh view
// defaults to Today so nobody reads a stale window by accident.
const options: Array<{ key: WindowKey; label: string }> = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
  { key: '90d', label: 'Last 90 days' },
]

export function WindowSelector({ value, onChange }: { value: WindowKey; onChange: (value: WindowKey) => void }) {
  return <div className="window-selector">
    <div className="window-tabs" role="tablist" aria-label="Time window">
      {options.map((option) => <button key={option.key} type="button" role="tab" aria-selected={value === option.key} className={value === option.key ? 'window-tab window-tab-active' : 'window-tab'} onClick={() => onChange(option.key)}>{option.label}</button>)}
    </div>
    <select className="window-select select" aria-label="Time window" value={value} onChange={(event) => onChange(event.target.value as WindowKey)}>
      {options.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
    </select>
  </div>
}
