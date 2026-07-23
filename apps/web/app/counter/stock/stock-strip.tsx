'use client'

import { useMutation, useQuery } from 'convex/react'
import { useEffect, useMemo, useState } from 'react'
import { DashboardShell } from '@/components/shell'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/toast'
import { useAuthArgs, useBackendAvailable } from '@/components/providers'
import { api } from '@/lib/convex'
import { demoItems } from '@/lib/demo-data'
import { categories, type Item } from '@/lib/models'

export function StockStrip() {
  const backend = useBackendAvailable()
  const auth = useAuthArgs()
  const liveItems = useQuery(api.items.inventory, backend ? auth! : 'skip')
  const setAvailability = useMutation(api.items.setAvailability)
  const notify = useToast()
  const [items, setItems] = useState<Item[]>(backend ? [] : demoItems)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  useEffect(() => { if (liveItems) setItems(liveItems) }, [liveItems])

  const filtered = useMemo(() => items.filter((item) => !item.archived && (category === 'all' || item.category === category) && item.name.toLowerCase().includes(search.toLowerCase())), [category, items, search])

  async function toggleItem(item: Item) {
    const available = !item.available
    setItems((current) => current.map((entry) => entry._id === item._id ? { ...entry, available } : entry))
    try { if (backend) await setAvailability({ token: auth!.token, itemId: item._id, available }) }
    catch { setItems((current) => current.map((entry) => entry._id === item._id ? item : entry)); notify('Availability update failed and was reverted', 'error') }
  }

  return <DashboardShell role="counter" section="Stock">
    <section className="page-section" aria-labelledby="stock-heading">
      <div className="section-heading"><div><p className="caption">Live menu controls</p><h1 id="stock-heading">Stock strip</h1><p className="muted">One tap updates every connected menu and dashboard</p></div></div>
      <div className="filter-bar"><Input type="search" placeholder="Search menu items" value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search menu items"/><Select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filter by category"><option value="all">All categories</option>{categories.map((entry) => <option key={entry}>{entry}</option>)}</Select></div>
      {filtered.length === 0
        ? <div className="empty-state"><p className="muted">No matching menu items.</p></div>
        : <div className="stock-grid">{filtered.map((item) => <Card className="stock-card" key={item._id}><div className="stock-card-top"><div><div className="stock-card-title"><h3>{item.name}</h3>{!item.available && <span className="stock-flag">Unavailable</span>}</div><p className="caption muted">{item.category} · KES {item.priceKes.toLocaleString()}</p></div><Switch checked={item.available} onClick={() => toggleItem(item)} aria-label={`${item.available ? 'Make' : 'Mark'} ${item.name} ${item.available ? 'unavailable' : 'available'}`} /></div><p className="fine-print">{item.quantityOnHand === undefined ? 'Quantity not tracked' : `${item.quantityOnHand} ${item.unit ?? 'units'} on hand`}</p></Card>)}</div>}
    </section>
  </DashboardShell>
}
