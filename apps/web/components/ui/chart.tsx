'use client'

import { ResponsiveContainer } from 'recharts'
import type { ReactElement } from 'react'

// Lightweight, token-aligned chart shell. Recharts needs a sized parent and a single
// chart child, so the container fixes the height and hands the rest to ResponsiveContainer.
export function ChartContainer({ children, height = 260, className = '' }: { children: ReactElement; height?: number; className?: string }) {
  return (
    <div className={`chart-container ${className}`} style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  )
}
