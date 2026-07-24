'use client'

import { useQuery } from 'convex/react'
import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, LabelList, Tooltip, XAxis } from 'recharts'
import { DashboardShell } from '@/components/shell'
import { Card } from '@/components/ui/card'
import { ChartContainer } from '@/components/ui/chart'
import { Select } from '@/components/ui/select'
import { Table, TableWrap, Td, Th } from '@/components/ui/table'
import { useAuthArgs, useBackendAvailable } from '@/components/providers'
import { api, type AnalyticsDashboard } from '@/lib/convex'

type HourEntry = { hour: number; orders: number; revenueKes: number }
type ChartDatum = { label: string; orders: number; revenueKes: number }
type TimeWindow = 'morning' | 'afternoon' | 'evening' | 'overtime' | 'full'

const windowOptions: Array<{ value: TimeWindow; label: string }> = [
  { value: 'morning', label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'evening', label: 'Evening' },
  { value: 'overtime', label: 'Overtime' },
  { value: 'full', label: 'Full time' },
]

const windowRanges: Record<Exclude<TimeWindow, 'full'>, number[]> = {
  morning: [6, 7, 8, 9, 10, 11],
  afternoon: [12, 13, 14, 15, 16],
  evening: [17, 18, 19, 20, 21],
  overtime: [22, 23, 0, 1, 2, 3, 4, 5],
}

const pad = (hour: number) => String(hour).padStart(2, '0')

// Builds the chart series for the selected window. "Full time" collapses the day into
// eight 3-hour buckets so the whole day reads on one chart instead of 24 thin bars.
function buildChartData(hours: HourEntry[], window: TimeWindow): ChartDatum[] {
  const byHour = new Map(hours.map((entry) => [entry.hour, entry]))
  const at = (hour: number) => byHour.get(hour) ?? { hour, orders: 0, revenueKes: 0 }
  if (window === 'full') {
    return Array.from({ length: 8 }, (_, index) => {
      const start = index * 3
      const slice = [start, start + 1, start + 2].map(at)
      return {
        label: `${pad(start)}–${pad(start + 3)}`,
        orders: slice.reduce((sum, entry) => sum + entry.orders, 0),
        revenueKes: slice.reduce((sum, entry) => sum + entry.revenueKes, 0),
      }
    })
  }
  return windowRanges[window].map((hour) => {
    const entry = at(hour)
    return { label: `${pad(hour)}:00`, orders: entry.orders, revenueKes: entry.revenueKes }
  })
}

function OrdersTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ChartDatum }> }) {
  if (!active || !payload?.length) return null
  const datum = payload[0]!.payload
  return <div className="chart-tip"><p className="chart-tip-label">{datum.label}</p><p><strong>{datum.orders}</strong> {datum.orders === 1 ? 'order' : 'orders'}</p><p className="fine-print muted">KES {datum.revenueKes.toLocaleString()}</p></div>
}

const demoAnalytics: AnalyticsDashboard = {
  windows: { today: { from: Date.now() - 12 * 60 * 60_000, to: Date.now() }, last7Days: { from: Date.now() - 7 * 24 * 60 * 60_000, to: Date.now() } },
  today: { orders: 87, revenueKes: 48_620, averageOrderValueKes: 559 },
  topItems: [
    { itemId: '1', name: 'Chicken biryani', quantity: 52, orderCount: 46 },
    { itemId: '2', name: 'Beef stew', quantity: 43, orderCount: 39 },
    { itemId: '3', name: 'Chapati', quantity: 72, orderCount: 36 },
  ],
  ordersByHour: [{ hour: 10, orders: 7, revenueKes: 4_100 }, { hour: 11, orders: 12, revenueKes: 6_800 }, { hour: 12, orders: 24, revenueKes: 13_400 }, { hour: 13, orders: 31, revenueKes: 18_200 }],
  tables: [{ tableNumber: 7, orders: 31, revenueKes: 18_420, medianTurnaroundMs: 21 * 60_000 }],
  waiters: [{ waiterId: '1', name: 'Mary Njeri', ordersServed: 42, medianServeTimeMs: 17 * 60_000, meanRating: 4.7, ratingCount: 31 }],
  lowestRatedItems: [{ itemId: '5', name: 'Fresh passion juice', meanRating: 3.1, ratingCount: 8, comments: ['Took too long', 'Not cold enough'] }],
}

function minutes(milliseconds: number | null) {
  return milliseconds === null ? '—' : `${Math.round(milliseconds / 60_000)} min`
}

export function ManagerAnalytics() {
  const backend = useBackendAvailable()
  const auth = useAuthArgs()
  const result = useQuery(api.analytics.dashboard, backend ? auth! : 'skip')
  const data = result ?? (backend ? null : demoAnalytics)
  const [hourWindow, setHourWindow] = useState<TimeWindow>('full')
  const chartData = useMemo(() => buildChartData(data?.ordersByHour ?? [], hourWindow), [data?.ordersByHour, hourWindow])
  if (!data) return <DashboardShell section="Analytics"><section className="page-section"><p className="muted">Loading live analytics…</p></section></DashboardShell>

  return <DashboardShell section="Analytics" actions={<span className="caption">Live now</span>}><section className="metric-grid" aria-label="Today’s headline metrics"><article className="metric-tile"><span className="caption">Orders today</span><strong className="metric-value">{data.today.orders}</strong><span className="fine-print">Since midnight</span></article><article className="metric-tile"><span className="caption">Revenue today</span><strong className="metric-value">KES {data.today.revenueKes.toLocaleString()}</strong><span className="fine-print">Settled only · since midnight</span></article><article className="metric-tile"><span className="caption">Average order value</span><strong className="metric-value">KES {Math.round(data.today.averageOrderValueKes).toLocaleString()}</strong><span className="fine-print">Settled orders today</span></article></section><section className="page-section"><div className="section-heading"><div><p className="caption">Live operating picture</p><h1>Restaurant performance</h1><p className="muted">Every figure is computed from current order and feedback data</p></div></div><div className="analytics-grid"><Card className="chart-card"><div className="chart-card-head"><div><h3>Orders by hour</h3><p className="fine-print muted">Last 7 days{hourWindow === 'full' ? ' · grouped in 3-hour blocks' : ''}</p></div><Select className="chart-window-select" aria-label="Time window" value={hourWindow} onChange={(event) => setHourWindow(event.target.value as TimeWindow)}>{windowOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select></div><ChartContainer height={280}><BarChart accessibilityLayer data={chartData} margin={{ top: 24, right: 8, left: 8, bottom: 0 }}><CartesianGrid vertical={false} stroke="var(--hf-divider-soft)" /><XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={10} interval={0} tick={{ fontSize: 11, fill: 'var(--hf-ink-48)' }} /><Tooltip cursor={{ fill: 'rgba(0,0,0,.04)' }} content={<OrdersTooltip />} /><Bar dataKey="orders" fill="var(--hf-ink)" radius={[8, 8, 0, 0]} maxBarSize={56}><LabelList dataKey="orders" position="top" offset={10} fontSize={12} fill="var(--hf-ink)" /></Bar></BarChart></ChartContainer></Card><Card><h3>Top five items</h3><p className="fine-print muted">Order count · last 7 days</p><TableWrap><Table><thead><tr><Th>Item</Th><Th>Orders</Th></tr></thead><tbody>{data.topItems.map((item) => <tr key={item.itemId}><Td>{item.name}</Td><Td><strong>{item.orderCount}</strong></Td></tr>)}</tbody></Table></TableWrap></Card><Card><h3>Table performance</h3><p className="fine-print muted">Orders and settled revenue · last 7 days</p><TableWrap><Table><thead><tr><Th>Table</Th><Th>Orders</Th><Th>Revenue</Th><Th>Median turn</Th></tr></thead><tbody>{data.tables.map((entry) => <tr key={entry.tableNumber}><Td>{entry.tableNumber}</Td><Td>{entry.orders}</Td><Td>KES {entry.revenueKes.toLocaleString()}</Td><Td>{minutes(entry.medianTurnaroundMs)}</Td></tr>)}</tbody></Table></TableWrap></Card><Card><h3>Waiter performance</h3><p className="fine-print muted">Service and ratings · last 7 days</p><TableWrap><Table><thead><tr><Th>Waiter</Th><Th>Served</Th><Th>Median</Th><Th>Rating</Th></tr></thead><tbody>{data.waiters.map((entry) => <tr key={entry.waiterId}><Td>{entry.name}</Td><Td>{entry.ordersServed}</Td><Td>{minutes(entry.medianServeTimeMs)}</Td><Td>{entry.ratingCount < 5 ? `${entry.ratingCount} ratings` : `${entry.meanRating?.toFixed(1) ?? '—'} · ${entry.ratingCount}`}</Td></tr>)}</tbody></Table></TableWrap></Card><Card><h3>Lowest-rated items</h3><p className="fine-print muted">Feedback · last 7 days</p>{data.lowestRatedItems.map((item) => <div key={item.itemId}><p><strong>{item.name}</strong> · {item.ratingCount < 5 ? `${item.ratingCount} ratings` : `${item.meanRating?.toFixed(1) ?? '—'} from ${item.ratingCount}`}</p><ul>{item.comments.map((comment) => <li key={comment}>{comment}</li>)}</ul></div>)}</Card></div></section></DashboardShell>
}
