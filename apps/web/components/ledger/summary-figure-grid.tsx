'use client'

// Addendum 05 §8.2 — Layer 1. Figures sit on the layer surface with no card chrome. Every figure
// states its time window (§2.6). Values arrive pre-formatted (tabular figures handled in CSS).
export type SummaryFigure = { label: string; value: string; window: string }

export function SummaryFigureGrid({ figures }: { figures: SummaryFigure[] }) {
  return <dl className="summary-grid">
    {figures.map((figure) => <div key={figure.label} className="summary-figure">
      <dt className="caption">{figure.label}</dt>
      <dd className="figure-value">{figure.value}</dd>
      <span className="fine-print summary-figure-window">{figure.window}</span>
    </div>)}
  </dl>
}
