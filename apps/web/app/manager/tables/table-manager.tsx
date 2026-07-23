'use client'

import QRCode from 'qrcode'
import { Download, Printer, QrCode, Users } from 'lucide-react'
import { useMutation, useQuery } from 'convex/react'
import { useEffect, useState } from 'react'
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
import { demoStaff, demoTables } from '@/lib/demo-data'
import type { DiningTable, Staff } from '@/lib/models'

export function TableManager() {
  const backend = useBackendAvailable()
  const auth = useAuthArgs()
  const liveTables = useQuery(api.tables.list, backend ? auth! : 'skip')
  const liveStaff = useQuery(api.staff.listVisible, backend ? auth! : 'skip')
  const createTable = useMutation(api.tables.create)
  const updateTable = useMutation(api.tables.update)
  const assignWaiter = useMutation(api.tables.assignWaiter)
  const removeTable = useMutation(api.tables.remove)
  const notify = useToast()
  const [tables, setTables] = useState<DiningTable[]>(backend ? [] : demoTables)
  const [staff, setStaff] = useState<Staff[]>(backend ? [] : demoStaff)
  const [editing, setEditing] = useState<DiningTable | 'new' | null>(null)
  const [removing, setRemoving] = useState<DiningTable | null>(null)
  const [phone, setPhone] = useState(process.env.NEXT_PUBLIC_WHATSAPP_MSISDN ?? '')
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({})
  useEffect(() => { if (liveTables) setTables(liveTables) }, [liveTables])
  useEffect(() => { if (liveStaff) setStaff(liveStaff) }, [liveStaff])
  useEffect(() => {
    let cancelled = false
    async function generate() {
      const clean = phone.replace(/\D/gu, '')
      if (!clean) { setQrCodes({}); return }
      const pairs = await Promise.all(tables.filter((table) => table.active).map(async (table) => [table._id, await QRCode.toDataURL(`https://wa.me/${clean}?text=${encodeURIComponent(`Table ${table.number}`)}`, { width: 640, margin: 2, color: { dark: '#1d1d1f', light: '#ffffff' } })] as const))
      if (!cancelled) setQrCodes(Object.fromEntries(pairs))
    }
    void generate()
    return () => { cancelled = true }
  }, [phone, tables])
  const waiters = staff.filter((person) => person.role === 'waiter' && person.enabled)
  const cleanPhone = phone.replace(/\D/gu, '')
  const activeWithCodes = tables.filter((table) => table.active && qrCodes[table._id])

  function waiterName(id?: string) {
    return staff.find((person) => person._id === id)?.name
  }

  function downloadQr(table: DiningTable) {
    const dataUrl = qrCodes[table._id]
    if (!dataUrl) return
    const link = document.createElement('a')
    link.href = dataUrl
    link.download = `heavenly-foods-table-${table.number}-qr.png`
    document.body.appendChild(link)
    link.click()
    link.remove()
    notify(`Table ${table.number} QR downloaded`)
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const number = Number(data.get('number')); const seatsRaw = String(data.get('seats') ?? ''); const seats = seatsRaw ? Number(seatsRaw) : undefined
    if (!Number.isInteger(number) || number < 1 || number > 999 || (seats !== undefined && (!Number.isInteger(seats) || seats < 1))) { notify('Enter a table number from 1–999 and valid seat count', 'error'); return }
    if (tables.some((table) => table.number === number && (editing === 'new' || table._id !== editing?._id))) { notify('That table number already exists', 'error'); return }
    const before = tables
    try {
      if (editing === 'new') {
        if (backend) await createTable({ ...auth!, number, ...(seats === undefined ? {} : { seats }) })
        else { const table: DiningTable = { _id: `table-${Date.now()}`, number, active: true }; if (seats !== undefined) table.seats = seats; setTables((current) => [...current, table]) }
        notify('Table created')
      } else if (editing) {
        if (backend) await updateTable({ token: auth!.token, tableId: editing._id, number, active: editing.active, ...(seats === undefined ? {} : { seats }) })
        setTables((current) => current.map((table) => table._id === editing._id ? withSeats({ ...table, number }, seats) : table)); notify('Table updated')
      }
      setEditing(null)
    } catch { setTables(before); notify('Table could not be saved and changes were reverted', 'error') }
  }

  function withSeats(entry: DiningTable, seats: number | undefined): DiningTable {
    const { seats: _currentSeats, ...tableWithoutSeats } = entry
    return seats === undefined ? tableWithoutSeats : { ...tableWithoutSeats, seats }
  }

  function withWaiter(entry: DiningTable, waiterId: string | undefined): DiningTable {
    const { assignedWaiterId: _currentWaiter, ...tableWithoutWaiter } = entry
    return waiterId ? { ...tableWithoutWaiter, assignedWaiterId: waiterId } : tableWithoutWaiter
  }

  async function assign(table: DiningTable, waiterId: string) {
    const previous = table.assignedWaiterId
    setTables((current) => current.map((entry) => entry._id === table._id ? withWaiter(entry, waiterId || undefined) : entry))
    try {
      if (backend) await assignWaiter({ token: auth!.token, tableId: table._id, ...(waiterId ? { waiterId } : {}) })
    } catch { setTables((current) => current.map((entry) => entry._id === table._id ? withWaiter(entry, previous) : entry)); notify('Waiter assignment failed and was reverted', 'error') }
  }

  async function toggle(table: DiningTable) {
    const active = !table.active
    setTables((current) => current.map((entry) => entry._id === table._id ? { ...entry, active } : entry))
    try { if (backend) await updateTable({ token: auth!.token, tableId: table._id, number: table.number, active, ...(table.seats === undefined ? {} : { seats: table.seats }) }) }
    catch { setTables((current) => current.map((entry) => entry._id === table._id ? table : entry)); notify('Table status update failed and was reverted', 'error') }
  }

  async function remove() {
    if (!removing) return
    try {
      if (backend) await removeTable({ token: auth!.token, tableId: removing._id })
      setTables((current) => current.filter((table) => table._id !== removing._id)); setRemoving(null); notify('Table removed')
    } catch { notify('Table could not be removed', 'error') }
  }

  const current = editing === 'new' ? undefined : editing ?? undefined
  return <DashboardShell section="Tables" actions={<><Button size="small" variant="outline" disabled={!activeWithCodes.length} onClick={() => window.print()}>Print QR sheet</Button><Button size="small" onClick={() => setEditing('new')}>Add table</Button></>}>
    <section className="page-section">
      <div className="section-heading"><div><p className="caption">Dining room setup</p><h1>Tables and QR codes</h1><p className="muted">Every active table has a distinct WhatsApp entry point diners scan to start an order</p></div></div>

      <Card className="tables-toolbar">
        <div className="field">
          <label htmlFor="whatsapp-number">WhatsApp number in international format</label>
          <Input id="whatsapp-number" inputMode="numeric" placeholder="2547…" value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/gu, ''))} aria-describedby="phone-help"/>
          <span id="phone-help" className="fine-print muted">Required before QR codes generate. Each code opens WhatsApp pre-filled with “Table &lt;number&gt;”.</span>
        </div>
        <div className="tables-toolbar-status">
          <span className="caption-strong">{tables.filter((table) => table.active).length} active</span>
          <span className="fine-print muted">{cleanPhone ? `${activeWithCodes.length} QR codes ready` : 'Add a number to generate codes'}</span>
        </div>
      </Card>

      <div className="tables-grid">{tables.map((table) => {
        const code = qrCodes[table._id]
        return <Card className={`table-card ${table.active ? '' : 'table-card-inactive'}`} key={table._id}>
          <div className="table-card-head">
            <div className="table-card-title"><span className="fine-print muted">Table</span><p className="table-number">{table.number}</p></div>
            <Switch checked={table.active} onClick={() => toggle(table)} aria-label={`Toggle table ${table.number}`} />
          </div>

          <div className="table-qr">
            {code ? <img className="qr-image" src={code} alt={`QR code for table ${table.number}`} />
              : <div className="table-qr-empty"><QrCode size={26} strokeWidth={1.6} /><span className="fine-print">{table.active ? 'Enter WhatsApp number' : 'Table inactive'}</span></div>}
          </div>

          <div className="table-meta">
            <span className="table-meta-item"><Users size={14} strokeWidth={1.8} />{table.seats ? `${table.seats} seats` : 'Seats not set'}</span>
            <span className="table-meta-item muted">{waiterName(table.assignedWaiterId) ?? 'No waiter'}</span>
          </div>

          <div className="field">
            <label htmlFor={`waiter-${table._id}`}>Assigned waiter</label>
            <Select id={`waiter-${table._id}`} value={table.assignedWaiterId ?? ''} onChange={(event) => assign(table, event.target.value)}>
              <option value="">Unassigned</option>
              {waiters.map((waiter) => <option key={waiter._id} value={waiter._id}>{waiter.name}</option>)}
            </Select>
          </div>

          <div className="table-actions">
            <Button size="small" variant="secondary" icon={Download} disabled={!code} onClick={() => downloadQr(table)}>Export QR</Button>
            <Button size="small" variant="secondary" onClick={() => setEditing(table)}>Edit</Button>
            <Button size="small" variant="outline" onClick={() => setRemoving(table)}>Remove</Button>
          </div>
        </Card>
      })}</div>
    </section>

    <section className="qr-sheet" aria-label="Printable QR code sheet">{activeWithCodes.map((table) => <article className="qr-print-card" key={table._id}><div><p className="caption">Heavenly Foods</p><h1>Table {table.number}</h1><img className="qr-image" src={qrCodes[table._id]} alt=""/><p>Scan to order on WhatsApp</p></div></article>)}</section>

    <Dialog open={Boolean(editing)} onClose={() => setEditing(null)} title={current ? 'Edit table' : 'Add table'}><form className="form-stack" onSubmit={save}><div className="field-grid"><div className="field"><label htmlFor="table-number">Table number</label><Input id="table-number" name="number" type="number" min="1" max="999" defaultValue={current?.number} required /></div><div className="field"><label htmlFor="table-seats">Seats</label><Input id="table-seats" name="seats" type="number" min="1" defaultValue={current?.seats} /></div></div><div className="form-actions"><Button type="button" variant="secondary" onClick={() => setEditing(null)}>Discard</Button><Button type="submit">Save table</Button></div></form></Dialog>
    <Dialog open={Boolean(removing)} onClose={() => setRemoving(null)} title="Remove table" description="Only remove a table that is no longer part of the dining room"><p>Remove table <strong>{removing?.number}</strong>?</p><div className="form-actions"><Button variant="secondary" onClick={() => setRemoving(null)}>Keep table</Button><Button variant="danger" onClick={remove}>Remove table</Button></div></Dialog>
  </DashboardShell>
}
