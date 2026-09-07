'use client'

import { useAction, useMutation, useQuery } from 'convex/react'
import { Check, Copy, Download, RefreshCw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { ActivityFeed } from '@/components/activity-feed'
import { DashboardShell } from '@/components/shell'
import { Button } from '@/components/ui/button'
import { RowActions } from '@/components/ui/row-actions'
import { Card } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Table, TableWrap, Td, Th } from '@/components/ui/table'
import { useToast } from '@/components/ui/toast'
import { useAuthArgs, useBackendAvailable, useStaffIdentity } from '@/components/providers'
import { api } from '@/lib/convex'
import { demoStaff } from '@/lib/demo-data'
import { canManageStaff, creatableRoles, roleLevel, type Staff } from '@/lib/models'
import { credentialMessage, generatePin } from '@/lib/staff-credentials'
import { downloadRosterPdf } from '@/lib/roster-pdf'

type ViewerRole = Staff['role']
type Reveal = { name: string; role: Staff['role']; pin: string }
type StaffChoice = 'manager' | 'waiter' | 'counter:payment' | 'counter:kitchen' | 'counter:custom'

function staffChoice(person?: Staff): StaffChoice {
  if (!person || person.role === 'owner') return 'waiter'
  if (person.role === 'manager' || person.role === 'waiter') return person.role
  return person.counterLabel === 'Kitchen counter' ? 'counter:kitchen' : person.counterLabel && person.counterLabel !== 'Payment counter' ? 'counter:custom' : 'counter:payment'
}

function roleFromChoice(choice: string): Staff['role'] {
  return choice.startsWith('counter:') ? 'counter' : choice as Staff['role']
}


function relativeTime(at?: number): string {
  if (!at) return '—'
  const diff = Date.now() - at
  if (diff < 60_000) return 'just now'
  const minutes = Math.round(diff / 60_000)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} hr ago`
  return `${Math.round(hours / 24)} d ago`
}

const actionLabels: Record<string, string> = {
  create: 'Created', update_role: 'Changed role', enable: 'Enabled', disable: 'Disabled', reset_pin: 'Reset PIN',
}

// The PIN is shown exactly once — it is stored only as a salted PBKDF2 hash and cannot be read
// back — so copying has to happen while this panel is open.
function PinReveal({ reveal, onDone }: { reveal: Reveal; onDone: () => void }) {
  const [copied, setCopied] = useState(false)
  const notify = useToast()

  async function copy() {
    try {
      await navigator.clipboard.writeText(credentialMessage(reveal))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      notify('Clipboard is unavailable — copy the PIN manually', 'error')
    }
  }

  return <div className="pin-reveal">
    <p className="muted">Share these details with <strong>{reveal.name}</strong> now. The PIN will not be shown again.</p>
    <p className="pin-reveal-value">{reveal.pin}</p>
    <div className="pin-reveal-meta fine-print muted">{reveal.name} · {reveal.role}</div>
    <div className="form-actions">
      <Button type="button" variant="secondary" onClick={copy}>
        {copied ? <><Check size={16} /> Copied</> : <><Copy size={16} /> Copy details</>}
      </Button>
      <Button type="button" onClick={onDone}>Done</Button>
    </div>
  </div>
}

export function StaffManager({ viewerRole, viewerStaffId }: { viewerRole?: ViewerRole | undefined; viewerStaffId?: string | undefined }) {
  const backend = useBackendAvailable()
  const auth = useAuthArgs()
  const identity = useStaffIdentity()
  const actorRole: ViewerRole = viewerRole ?? identity?.role ?? 'manager'
  const actorId = viewerStaffId ?? identity?.staffId
  const isOwner = actorRole === 'owner'

  const live = useQuery(api.staff.listVisible, backend ? auth! : 'skip')
  const auditLive = useQuery(api.staff.auditTrail, backend && isOwner ? auth! : 'skip')
  const lastActive = useQuery(api.activity.lastActive, backend ? auth! : 'skip')
  const roster = useQuery(api.activity.roster, backend ? auth! : 'skip')
  const rosterHistory = useQuery(api.activity.rosterHistory, backend ? auth! : 'skip')
  const analytics = useQuery(api.analytics.dashboard, backend ? auth! : 'skip')
  const clockIn = useMutation(api.activity.clockIn)
  const clockOut = useMutation(api.activity.clockOut)
  const createStaff = useAction(api.staff.create)
  const updateStaff = useMutation(api.staff.update)
  const setPin = useAction(api.staff.setPin)
  const removeStaff = useMutation(api.staff.remove)
  const notify = useToast()

  const assignableRoles = creatableRoles(actorRole)
  const [staff, setStaff] = useState<Staff[]>(backend ? [] : demoStaff.filter((person) => person._id === actorId || roleLevel[actorRole] > roleLevel[person.role]))
  useEffect(() => { if (live) setStaff(live) }, [live])

  const [adding, setAdding] = useState(false)
  const [addReveal, setAddReveal] = useState<Reveal | null>(null)
  const [draftPin, setDraftPin] = useState<string | null>(null)
  const [editing, setEditing] = useState<Staff | null>(null)
  const [pinTarget, setPinTarget] = useState<Staff | null>(null)
  const [pinReveal, setPinReveal] = useState<Reveal | null>(null)
  const [removeTarget, setRemoveTarget] = useState<Staff | null>(null)
  const [busy, setBusy] = useState(false)
  const [rosterBusy, setRosterBusy] = useState<string | null>(null)

  const rows = useMemo(() => [...staff].sort((left, right) =>
    Number(right.enabled) - Number(left.enabled) ||
    roleLevel[right.role] - roleLevel[left.role] ||
    left.name.localeCompare(right.name),
  ), [staff])

  async function add(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const name = String(data.get('name') ?? '').trim()
    const choice = String(data.get('role')) as StaffChoice
    const role = roleFromChoice(choice)
    const counterLabel = role === 'counter' ? (choice === 'counter:kitchen' ? 'Kitchen counter' : choice === 'counter:custom' ? String(data.get('counterLabel') ?? '').trim() : 'Payment counter') : undefined
    if (name.length < 2 || !assignableRoles.includes(role) || (choice === 'counter:custom' && (!counterLabel || counterLabel.length < 2))) { notify('Enter a name, a permitted role and a custom counter label', 'error'); return }
    if (!draftPin) { notify('Generate a PIN before adding the staff member', 'error'); return }
    setBusy(true)
    try {
      if (backend) await createStaff({ ...auth!, name, role, ...(counterLabel ? { counterLabel } : {}), pin: draftPin })
      else setStaff((current) => [...current, { _id: `staff-${Date.now()}`, name, role, ...(counterLabel ? { counterLabel } : {}), enabled: true }])
      setAddReveal({ name, role, pin: draftPin })
      notify('Staff member added')
    } catch (reason) { notify(reason instanceof Error ? reason.message : 'Staff member could not be added', 'error') }
    finally { setBusy(false) }
  }

  function closeAdd() { setAdding(false); setAddReveal(null); setDraftPin(null) }

  async function saveEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editing) return
    const data = new FormData(event.currentTarget)
    const name = String(data.get('name') ?? '').trim()
    const choice = String(data.get('role')) as StaffChoice
    const role = roleFromChoice(choice)
    const counterLabel = role === 'counter' ? (choice === 'counter:kitchen' ? 'Kitchen counter' : choice === 'counter:custom' ? String(data.get('counterLabel') ?? '').trim() : 'Payment counter') : undefined
    if (name.length < 2 || !assignableRoles.includes(role) || (choice === 'counter:custom' && (!counterLabel || counterLabel.length < 2))) { notify('Enter a name, a permitted role and a custom counter label', 'error'); return }
    const previous = staff
    setBusy(true)
    try {
      setStaff((current) => current.map((person) => {
        if (person._id !== editing._id) return person
        const updated = { ...person, name, role }
        if (role === 'counter' && counterLabel) updated.counterLabel = counterLabel
        else if (role !== 'counter') delete updated.counterLabel
        return updated
      }))
      if (backend) await updateStaff({ token: auth!.token, staffId: editing._id, name, role, ...(counterLabel ? { counterLabel } : {}), enabled: editing.enabled })
      notify('Staff member updated'); setEditing(null)
    } catch (reason) { setStaff(previous); notify(reason instanceof Error ? reason.message : 'Update failed and was reverted', 'error') }
    finally { setBusy(false) }
  }

  async function toggle(person: Staff) {
    const enabled = !person.enabled
    const previous = staff
    setStaff((current) => current.map((entry) => entry._id === person._id ? { ...entry, enabled } : entry))
    try {
      if (backend) await updateStaff({ token: auth!.token, staffId: person._id, name: person.name, role: person.role, enabled })
      notify(enabled ? 'Staff access enabled' : 'Staff disabled and active sessions invalidated')
    } catch { setStaff(previous); notify('Access update failed and was reverted', 'error') }
  }

  async function resetPin(person: Staff) {
    const pin = generatePin()
    setBusy(true)
    try {
      if (backend) await setPin({ token: auth!.token, staffId: person._id, pin })
      setPinReveal({ name: person.name, role: person.role, pin })
      notify('PIN reset — the previous PIN no longer works')
    } catch (reason) { notify(reason instanceof Error ? reason.message : 'PIN could not be updated', 'error') }
    finally { setBusy(false) }
  }

  function closePin() { setPinTarget(null); setPinReveal(null) }

  async function remove() {
    if (!removeTarget) return
    const previous = staff
    setBusy(true)
    try {
      if (backend) await removeStaff({ token: auth!.token, staffId: removeTarget._id })
      setStaff((current) => current.filter((person) => person._id !== removeTarget._id))
      notify(`${removeTarget.name} removed`); setRemoveTarget(null)
    } catch (reason) { setStaff(previous); notify(reason instanceof Error ? reason.message : 'Staff member could not be removed', 'error') }
    finally { setBusy(false) }
  }

  const description = isOwner
    ? 'Manage manager, payment counter, kitchen counter and waiter access without exposing stored PINs'
    : 'Manage payment counter, kitchen counter and waiter access without exposing stored PINs'

  async function toggleRoster(person: Staff) {
    setRosterBusy(person._id)
    try {
      const current = roster?.[person._id]
      if (backend) await (current?.status === 'clocked_in' ? clockOut : clockIn)({ ...auth!, staffId: person._id })
      notify(current?.status === 'clocked_in' ? `${person.name} clocked out` : `${person.name} clocked in`)
    } catch (reason) { notify(reason instanceof Error ? reason.message : 'Roster update failed', 'error') }
    finally { setRosterBusy(null) }
  }

  return <DashboardShell section="Staff" role={actorRole}>
    <section className="page-section">
      <div className="section-heading">
        <div><p className="caption">Access and roles</p><h1>Staff</h1><p className="muted">{description}</p></div>
        <Button size="small" disabled={assignableRoles.length === 0} onClick={() => setAdding(true)}>Add staff</Button>
      </div>

      {rows.length === 0 ? <Card><p className="muted">No counter or waiter staff yet.</p></Card>
        : <Card className="staff-table-card"><TableWrap><Table>
          <thead><tr><Th className="staff-index-col">#</Th><Th>Name</Th><Th>Role</Th><Th>Assigned tables</Th><Th>Performance</Th><Th>Status</Th><Th>Shift</Th><Th>Roster</Th><Th>Last active</Th><Th className="staff-actions-col">Actions</Th></tr></thead>
          <tbody>{rows.map((person, index) => {
            const actionable = canManageStaff(actorRole, actorId, person)
            const activeAt = lastActive?.[person._id]
            const performance = analytics?.waiters.find((entry) => entry.waiterId === person._id)
            return <tr key={person._id} className={person.enabled ? 'staff-row staff-row-active' : 'staff-row staff-row-disabled'}>
              <Td className="staff-index-col fine-print muted">{index + 1}</Td>
              <Td><div className="staff-name-cell"><span className="staff-avatar">{person.name.trim().charAt(0).toUpperCase()}</span><span><span className="body-strong">{person.name}</span>{person._id === actorId && <span className="fine-print muted"> · you</span>}</span></div></Td>
              <Td><span className="staff-role-pill">{person.role === 'counter' ? person.counterLabel ?? 'Payment counter' : person.role}</span></Td>
              <Td className="fine-print muted">{person.role === 'waiter' ? performance?.tableNumbers.length ? performance.tableNumbers.join(', ') : 'No tables assigned' : '—'}</Td>
              <Td className="fine-print muted">{person.role === 'waiter' ? performance ? `${performance.ordersServed} served · ${performance.medianServeTimeMs === null ? '—' : `${Math.round(performance.medianServeTimeMs / 60_000)} min median`}` : 'No service data' : '—'}</Td>
              <Td><span className={person.enabled ? 'staff-status staff-status-active' : 'staff-status staff-status-disabled'}><span className="staff-status-dot" aria-hidden="true" />{person.enabled ? 'Active' : 'Disabled'}</span></Td>
              <Td className="fine-print muted">{roster?.[person._id]?.status === 'clocked_in' ? <span title={new Date(roster[person._id]!.at).toLocaleString()}>In {new Date(roster[person._id]!.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span> : roster?.[person._id]?.status === 'clocked_out' ? <span title={new Date(roster[person._id]!.at).toLocaleString()}>Out {new Date(roster[person._id]!.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span> : 'Not today'}</Td>
              <Td><Button size="small" variant={roster?.[person._id]?.status === 'clocked_in' ? 'secondary' : 'outline'} disabled={rosterBusy === person._id || !person.enabled || !['counter', 'waiter'].includes(person.role)} onClick={() => toggleRoster(person)}>{rosterBusy === person._id ? 'Saving…' : roster?.[person._id]?.status === 'clocked_in' ? 'Clock out' : 'Clock in'}</Button></Td>
              <Td className="fine-print muted">{activeAt ? <span title={new Date(activeAt).toLocaleString()}>{relativeTime(activeAt)}</span> : 'Never'}</Td>
              <Td className="staff-actions-col">{actionable
                ? <RowActions label={`Actions for ${person.name}`} actions={[
                    { label: 'Edit', onClick: () => setEditing(person) },
                    { label: person.enabled ? 'Disable' : 'Enable', onClick: () => toggle(person) },
                    // Stored PINs are salted hashes, so an existing PIN can never be read back to
                    // be copied. Issuing a fresh one is the only way to hand a staff member their
                    // credentials again — the label says so, because it invalidates the old PIN.
                    { label: 'New PIN & copy', onClick: () => setPinTarget(person) },
                    { label: 'Remove', danger: true, onClick: () => setRemoveTarget(person) },
                  ]} />
                : <span className="fine-print muted">—</span>}</Td>
            </tr>
          })}</tbody>
        </Table></TableWrap></Card>}
    </section>

    <section className="page-section" aria-labelledby="roster-history-heading" style={{ paddingTop: 0 }}>
      <div className="section-heading"><div><p className="caption">Attendance</p><h2 id="roster-history-heading">Roster history</h2><p className="muted">Clock-in and clock-out records for the latest staff shifts</p></div><Button size="small" variant="outline" disabled={!rosterHistory?.length} onClick={() => rosterHistory && void downloadRosterPdf(rosterHistory)}><Download size={15} />Export PDF</Button></div>
      {(rosterHistory?.length ?? 0) === 0 ? <Card><p className="muted">No shifts have been recorded yet.</p></Card> : <Card className="staff-table-card"><TableWrap><Table><thead><tr><Th>Staff</Th><Th>Role</Th><Th>Clocked in</Th><Th>Clocked out</Th><Th>Duration</Th></tr></thead><tbody>{rosterHistory!.map((shift) => { const duration = (shift.clockOutAt ?? Date.now()) - shift.clockInAt; return <tr key={shift._id}><Td><span className="body-strong">{shift.staffName}</span></Td><Td><span className="staff-role-pill">{shift.staffRole}</span></Td><Td className="fine-print muted">{new Date(shift.clockInAt).toLocaleString()}</Td><Td className="fine-print muted">{shift.clockOutAt ? new Date(shift.clockOutAt).toLocaleString() : 'Currently on shift'}</Td><Td className="fine-print muted">{Math.floor(duration / 3_600_000)}h {Math.floor(duration / 60_000) % 60}m</Td></tr> })}</tbody></Table></TableWrap></Card>}
    </section>

    {isOwner && <section className="page-section" aria-labelledby="audit-heading" style={{ paddingTop: 0 }}>
      <div className="section-heading"><div><p className="caption">Accountability</p><h2 id="audit-heading">Audit trail</h2><p className="muted">Every staff account change, newest first</p></div></div>
      {(auditLive?.length ?? 0) === 0 ? <Card><p className="muted">No staff account changes recorded yet.</p></Card>
        : <Card className="staff-table-card"><TableWrap><Table>
          <thead><tr><Th>Actor</Th><Th>Action</Th><Th>Target</Th><Th>Detail</Th><Th>When</Th></tr></thead>
          <tbody>{auditLive!.map((entry) => <tr key={entry._id}>
            <Td><span className="body-strong">{entry.actorName}</span> <span className="fine-print muted">{entry.actorRole}</span></Td>
            <Td>{actionLabels[entry.action] ?? entry.action}</Td>
            <Td>{entry.targetName}</Td>
            <Td className="muted">{entry.action === 'update_role' && entry.targetRoleBefore && entry.targetRoleAfter ? `${entry.targetRoleBefore} → ${entry.targetRoleAfter}` : ''}</Td>
            <Td className="fine-print muted" title={new Date(entry.at).toLocaleString()}>{relativeTime(entry.at)}</Td>
          </tr>)}</tbody>
        </Table></TableWrap>{auditLive!.length >= 100 && <p className="fine-print muted" style={{ marginTop: 12 }}>Showing the 100 most recent changes.</p>}</Card>}
    </section>}

    <section className="page-section" style={{ paddingTop: 0 }}>
      <ActivityFeed title="Activity log" scopeNote={isOwner ? 'All staff activity, including clock-in and clock-out events' : 'Counter and waiter activity, including clock-in and clock-out events'} limit={100} />
    </section>

    <Dialog open={adding} onClose={() => { if (!busy) closeAdd() }} title="Add staff member" description="PINs are hashed with salted PBKDF2 and shown only once here">
      {addReveal
        ? <PinReveal reveal={addReveal} onDone={closeAdd} />
        : <form className="form-stack" onSubmit={add}>
            <div className="field"><label htmlFor="staff-name">Name</label><Input id="staff-name" name="name" minLength={2} required /></div>
            <div className="field"><label htmlFor="staff-role">Staff category</label><Select id="staff-role" name="role" defaultValue={assignableRoles.includes('counter') ? 'counter:payment' : 'waiter'}><option value="waiter" disabled={!assignableRoles.includes('waiter')}>Waiter</option><option value="counter:payment" disabled={!assignableRoles.includes('counter')}>Payment counter</option><option value="counter:kitchen" disabled={!assignableRoles.includes('counter')}>Kitchen counter</option><option value="counter:custom" disabled={!assignableRoles.includes('counter')}>Custom counter</option>{assignableRoles.includes('manager') && <option value="manager">Manager</option>}</Select><p className="fine-print muted">Kitchen counter staff use the Kitchen dashboard. Custom counter labels are for other counter duties.</p></div>
            <div className="field"><label htmlFor="staff-counter-label">Custom counter label <span className="muted">(only for Custom counter)</span></label><Input id="staff-counter-label" name="counterLabel" placeholder="e.g. Bar counter" /></div>
            <div className="field">
              <label>PIN</label>
              {draftPin
                ? <div className="pin-draft">
                    <span className="pin-draft-value">{draftPin}</span>
                    <button type="button" className="pin-draft-action" onClick={() => setDraftPin(generatePin())} aria-label="Generate a different PIN"><RefreshCw size={15} /></button>
                  </div>
                : <Button type="button" variant="secondary" onClick={() => setDraftPin(generatePin())}>Generate PIN</Button>}
              <p className="fine-print muted">{draftPin ? 'Add the staff member to save it, then copy the full details.' : 'A random 6-digit PIN is created for you.'}</p>
            </div>
            <div className="form-actions"><Button type="button" variant="secondary" disabled={busy} onClick={closeAdd}>Discard</Button><Button type="submit" disabled={busy || !draftPin}>Add staff</Button></div>
          </form>}
    </Dialog>

    <Dialog open={Boolean(editing)} onClose={() => { if (!busy) setEditing(null) }} title="Edit staff member" description="Change the name or role. Use reset PIN to change the PIN.">
      {editing && <form className="form-stack" onSubmit={saveEdit}><div className="field"><label htmlFor="edit-name">Name</label><Input id="edit-name" name="name" defaultValue={editing.name} minLength={2} required /></div><div className="field"><label htmlFor="edit-role">Staff category</label><Select id="edit-role" name="role" defaultValue={staffChoice(editing)}><option value="waiter" disabled={!assignableRoles.includes('waiter') && editing.role !== 'waiter'}>Waiter</option><option value="counter:payment" disabled={!assignableRoles.includes('counter') && editing.role !== 'counter'}>Payment counter</option><option value="counter:kitchen" disabled={!assignableRoles.includes('counter') && editing.role !== 'counter'}>Kitchen counter</option><option value="counter:custom" disabled={!assignableRoles.includes('counter') && editing.role !== 'counter'}>Custom counter</option>{(assignableRoles.includes('manager') || editing.role === 'manager') && <option value="manager">Manager</option>}</Select></div><div className="field"><label htmlFor="edit-counter-label">Custom counter label <span className="muted">(only for Custom counter)</span></label><Input id="edit-counter-label" name="counterLabel" defaultValue={editing.role === 'counter' ? editing.counterLabel === 'Kitchen counter' || editing.counterLabel === 'Payment counter' ? '' : editing.counterLabel : ''} placeholder="e.g. Bar counter" /></div><div className="form-actions"><Button type="button" variant="secondary" disabled={busy} onClick={() => setEditing(null)}>Discard</Button><Button type="submit" disabled={busy}>Save changes</Button></div></form>}
    </Dialog>

    <Dialog open={Boolean(pinTarget)} onClose={() => { if (!busy) closePin() }} title="New PIN" description={pinReveal ? '' : `Issue a new PIN for ${pinTarget?.name ?? 'this staff member'}`}>
      {pinReveal
        ? <PinReveal reveal={pinReveal} onDone={closePin} />
        : <div className="form-stack">
            <p className="muted">Stored PINs are salted hashes and can never be read back, so an existing PIN cannot be copied. Generating a new one lets you share their details again — <strong>their current PIN will stop working immediately</strong>.</p>
            <div className="form-actions"><Button type="button" variant="secondary" disabled={busy} onClick={closePin}>Cancel</Button><Button type="button" disabled={busy} onClick={() => pinTarget && resetPin(pinTarget)}>Generate new PIN</Button></div>
          </div>}
    </Dialog>

    <Dialog open={Boolean(removeTarget)} onClose={() => { if (!busy) setRemoveTarget(null) }} title="Remove staff member" description="This permanently deletes the account. Past orders they handled are unaffected.">
      <p>Remove <strong>{removeTarget?.name}</strong> ({removeTarget?.role})? To temporarily suspend access instead, use Disable.</p>
      <div className="form-actions"><Button type="button" variant="secondary" disabled={busy} onClick={() => setRemoveTarget(null)}>Keep staff</Button><Button type="button" variant="danger" disabled={busy} onClick={remove}>Remove</Button></div>
    </Dialog>
  </DashboardShell>
}
