'use client'

import type { SignalBreakdown } from '@/lib/convex'

// Addendum 05 §5.4 / §8.4 — the signal card enforces §5.1's rules by construction.
// - benignNote is REQUIRED: the component cannot render without one. This is how the
//   "signals, not verdicts" rule survives a hurried implementation.
// - Every breakdown row carries its own denominator, so a person with many settlements is not
//   made to look worse than one with few. The type makes a bare count unrepresentable.
// - There is NO severity prop and NO colour prop. Every card renders identically (§5.4). The
//   system is not qualified to judge severity, so it encodes none.
export function SignalCard({
  headline, summary, breakdown, benignNote, onDrillThrough,
}: {
  headline: string
  summary: string
  breakdown: SignalBreakdown[]
  benignNote: string
  onDrillThrough?: () => void
}) {
  return <article className="signal-card">
    <h3 className="signal-headline">{headline}</h3>
    <p className="signal-summary">{summary}</p>
    {breakdown.length > 0 && <ul className="signal-breakdown">
      {breakdown.map((row) => <li key={row.name}><span className="signal-breakdown-name">{row.name}</span><span className="signal-breakdown-count fine-print">{row.count} of {row.denominator} settlements</span></li>)}
    </ul>}
    <p className="signal-benign fine-print">{benignNote}</p>
    {onDrillThrough && <div className="signal-actions"><button type="button" className="button button-secondary button-small" onClick={onDrillThrough}>View these settlements</button></div>}
  </article>
}
