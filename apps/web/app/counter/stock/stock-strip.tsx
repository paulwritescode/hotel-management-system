'use client'

import { useMutation, useQuery } from 'convex/react'
import { useEffect, useMemo, useState } from 'react'
import { DashboardShell } from '@/components/shell'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/toast'
import { useAuthArgs, useBackendAvailable } from '@/components/providers'
import { api } from '@/lib/convex'
import { demoItems } from '@/lib/demo-data'
import { categories, type Item } from '@/lib/models'

type RestockMode = 'add' | 'set'

export function StockStrip() {
  const backend = useBackendAvailable()
  const auth = useAuthArgs()
  const liveItems = useQuery(api.items.inventory, backend ? auth! : 'skip')
  const setAvailability = useMutation(api.items.setAvailability)
  const restock = useMutation(api.items.restock)
  const setQuantity = useMutation(api.items.setQuantity)
  const notify = useToast()
  const [items, setItems] = useState<Item[]>(backend ? [] : demoItems)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [target, setTarget] = useState<Item | null>(null)
  const [mode, setMode] = useState<RestockMode>('add')
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (liveItems) setItems(liveItems) }, [liveItems])

  const filtered = useMemo(() => items.filter((item) => !item.archived && (category === 'all' || item.category === category) && item.name.toLowerCase().includes(search.toLowerCase())), [category, items, search])

  async function toggleItem(item: Item) {
    const available = !item.available
    setItems((current) => current.map((entry) => entry._id === item._id ? { ...entry, available } : entry))
    try { if (backend) await setAvailability({ token: auth!.token, itemId: item._id, available }) }
    catch { setItems((current) => current.map((entry) => entry._id === item._id ? item : entry)); notify('Availability update failed and was reverted', 'error') }
  }

  function openRestock(item: Item) {
    setTarget(item); setMode('add'); setAmount('')
  }

  const preview = useMemo(() => {
    if (!target) return null
    const current = target.quantityOnHand ?? 0
    const value = Number(amount)
    if (amount === '' || !Number.isInteger(value) || value < 0) return null
    if (mode === 'add') return value <= 0 ? null : current + value
    return value
  }, [amount, mode, target])

  async function submitRestock(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!target) return
    const value = Number(amount)
    if (!Number.isInteger(value) || value < 0 || (mode === 'add' && value <= 0)) { notify('Enter a valid whole quantity', 'error'); return }
    setBusy(true)
    try {
      let result: { quantityOnHand: number; available: boolean; reenabled: boolean }
      if (backend) {
        result = mode === 'add'
          ? await restock({ token: auth!.token, itemId: target._id, addQuantity: value })
          : await setQuantity({ token: auth!.token, itemId: target._id, quantity: value })
      } else {
        const next = mode === 'add' ? (target.quantityOnHand ?? 0) + value : value
        const reenabled = (target.quantityOnHand ?? 0) === 0 && next > 0 && !target.available
        result = { quantityOnHand: next, available: target.available || reenabled, reenabled }
        setItems((current) => current.map((entry) => entry._id === target._id ? { ...entry, quantityOnHand: next, available: result.available } : entry))
      }
      setItems((current) => current.map((entry) => entry._id === target._id ? { ...entry, quantityOnHand: result.quantityOnHand, available: result.available } : entry))
      notify(result.reenabled ? `${target.name} restocked to ${result.quantityOnHand} and back on the menu` : `${target.name} updated to ${result.quantityOnHand}`)
      setTarget(null)
    } catch (reason) { notify(reason instanceof Error ? reason.message : 'Stock update failed', 'error') }
    finally { setBusy(false) }
  }

  return <DashboardShell role="counter" section="Stock">
    <section className="page-section" aria-labelledby="stock-heading">
      <div className="section-heading"><div><p className="caption">Live menu controls</p><h1 id="stock-heading">Stock strip</h1><p className="muted">Update availability and counts as batches come out of the kitchen. Prices are managed by managers.</p></div></div>
      <div className="filter-bar"><Input type="search" placeholder="Search menu items" value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search menu items"/><Select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filter by category"><option value="all">All categories</option>{categories.map((entry) => <option key={entry}>{entry}</option>)}</Select></div>
      {filtered.length === 0
        ? <div className="empty-state"><p className="muted">No matching menu items.</p></div>
        : <div className="stock-grid">{filtered.map((item) => <Card className="stock-card" key={item._id}>
            <div className="stock-card-top"><div><div className="stock-card-title"><h3>{item.name}</h3>{!item.available && <span className="stock-flag">Unavailable</span>}</div><p className="caption muted">{item.category} · KES {item.priceKes.toLocaleString()}</p></div><Switch checked={item.available} onClick={() => toggleItem(item)} aria-label={`${item.available ? 'Make' : 'Mark'} ${item.name} ${item.available ? 'unavailable' : 'available'}`} /></div>
            <div className="stock-card-foot">
              {item.quantityOnHand === undefined
                ? <span className="fine-print muted">Not tracked</span>
                : <span className="stock-count"><strong>{item.quantityOnHand}</strong> <span className="fine-print muted">{item.unit ?? 'in stock'}</span></span>}
              {item.quantityOnHand !== undefined && <Button size="small" variant="secondary" onClick={() => openRestock(item)}>Restock</Button>}
            </div>
          </Card>)}</div>}
    </section>

    <Dialog open={Boolean(target)} onClose={() => { if (!busy) setTarget(null) }} title={target ? `Restock — ${target.name}` : 'Restock'} description={target ? `Currently: ${target.quantityOnHand ?? 0}` : ''}>
      <form className="form-stack" onSubmit={submitRestock}>
        <div className="field">
          <label htmlFor="restock-amount">{mode === 'add' ? 'Add' : 'Set to'}</label>
          <Input id="restock-amount" type="number" inputMode="numeric" min={mode === 'add' ? 1 : 0} step="1" value={amount} onChange={(event) => setAmount(event.target.value.replace(/[^\d]/gu, ''))} autoFocus required />
        </div>
        {preview !== null && <p className="restock-preview">{target?.quantityOnHand ?? 0} → <strong>{preview}</strong></p>}
        <button type="button" className="restock-mode-link" onClick={() => { setMode((current) => current === 'add' ? 'set' : 'add'); setAmount('') }}>
          {mode === 'add' ? 'Set exact count instead' : 'Add to current count instead'}
        </button>
        <div className="form-actions"><Button type="button" variant="secondary" disabled={busy} onClick={() => setTarget(null)}>Cancel</Button><Button type="submit" disabled={busy}>{mode === 'add' ? 'Restock' : 'Set count'}</Button></div>
      </form>
    </Dialog>
  </DashboardShell>
}
