'use client'

import { useQuery } from 'convex/react'
import { Card } from '@/components/ui/card'
import { Table, TableWrap, Td, Th } from '@/components/ui/table'
import { useAuthArgs, useBackendAvailable } from '@/components/providers'
import { api } from '@/lib/convex'

function relativeTime(at: number): string {
  const diff = Date.now() - at
  if (diff < 60_000) return 'just now'
  const minutes = Math.round(diff / 60_000)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} hr ago`
  return `${Math.round(hours / 24)} d ago`
}

// Role-scoped activity feed. The server decides which rows the viewer may see, so this
// component simply renders whatever the query returns.
export function ActivityFeed({ title = 'Activity', scopeNote, limit = 100, showMetrics = true }: { title?: string; scopeNote?: string; limit?: number; showMetrics?: boolean }) {
  const backend = useBackendAvailable()
  const auth = useAuthArgs()
  const entries = useQuery(api.activity.feed, backend ? { ...auth!, limit } : 'skip')
  const metrics = useQuery(api.activity.metrics, backend && showMetrics ? auth! : 'skip')
  const rows = entries ?? []

  return <div className="activity-block">
    <div className="section-heading"><div><p className="caption">Logs and traces</p><h2>{title}</h2>{scopeNote && <p className="muted">{scopeNote}</p>}</div></div>
    {showMetrics && <div className="stat-strip activity-metrics"><div className="stat-block"><span className="fine-print muted">Actions · 24h</span><strong>{metrics?.total ?? '—'}</strong></div><div className="stat-block"><span className="fine-print muted">Sign-ins · 24h</span><strong>{metrics?.signIns ?? '—'}</strong></div><div className="stat-block"><span className="fine-print muted">Active staff · 24h</span><strong>{metrics?.activeStaff ?? '—'}</strong></div></div>}
    {rows.length === 0
      ? <Card><p className="muted">{backend ? 'No activity recorded yet.' : 'Activity is available once connected to the backend.'}</p></Card>
      : <Card className="staff-table-card"><TableWrap><Table>
          <thead><tr><Th>Who</Th><Th>Activity</Th><Th>When</Th></tr></thead>
          <tbody>{rows.map((entry) => <tr key={entry._id}>
            <Td><span className="body-strong">{entry.actorName}</span> <span className="fine-print muted">{entry.actorRole}</span></Td>
            <Td>{entry.detail ?? entry.action}</Td>
            <Td className="fine-print muted" title={new Date(entry.at).toLocaleString()}>{relativeTime(entry.at)}</Td>
          </tr>)}</tbody>
        </Table></TableWrap>{rows.length >= limit && <p className="fine-print muted activity-cap-note">Showing the {limit} most recent entries.</p>}</Card>}
  </div>
}
