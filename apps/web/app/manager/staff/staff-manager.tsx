'use client'

import { useAction, useMutation, useQuery } from 'convex/react'
import { useEffect, useMemo, useState } from 'react'
import { DashboardShell } from '@/components/shell'
import { Button } from '@/components/ui/button'
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

type ViewerRole = Staff['role']
type Reveal = { name: string; pin: string }

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

export function StaffManager({ viewerRole, viewerStaffId }: { viewerRole?: ViewerRole | undefined; viewerStaffId?: string | undefined }) {
  const backend = useBackendAvailable()
  const auth = useAuthArgs()
  const identity = useStaffIdentity()
  const actorRole: ViewerRole = viewerRole ?? identity?.role ?? 'manager'
  const actorId = viewerStaffId ?? identity?.staffId
  const isOwner = actorRole === 'owner'

  const live = useQuery(api.staff.listVisible, backend ? auth! : 'skip')
  const auditLive = useQuery(api.staff.auditTrail, backend && isOwner ? auth! : 'skip')
  const createStaff = useAction(api.staff.create)
  const updateStaff = useMutation(api.staff.update)
  const setPin = useAction(api.staff.setPin)
  const notify = useToast()

  const assignableRoles = creatableRoles(actorRole)
  const [staff, setStaff] = useState<Staff[]>(backend ? [] : demoStaff.filter((person) => person._id === actorId || roleLevel[actorRole] > roleLevel[person.role]))
  useEffect(() => { if (live) setStaff(live) }, [live])

  const [adding, setAdding] = useState(false)
  const [addReveal, setAddReveal] = useState<Reveal | null>(null)
  const [editing, setEditing] = useState<Staff | null>(null)
  const [pinTarget, setPinTarget] = useState<Staff | null>(null)
  const [pinReveal, setPinReveal] = useState<Reveal | null>(null)
  const [busy, setBusy] = useState(false)

  const rows = useMemo(() => [...staff].sort((left, right) =>
    Number(right.enabled) - Number(left.enabled) ||
    roleLevel[right.role] - roleLevel[left.role] ||
    left.name.localeCompare(right.name),
  ), [staff])

  async function add(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const name = String(data.get('name') ?? '').trim()
    const role = String(data.get('role')) as Staff['role']
    const pin = String(data.get('pin') ?? '')
    if (name.length < 2 || !assignableRoles.includes(role) || !/^\d{4,6}$/u.test(pin)) { notify('Enter a name, permitted role and 4–6 digit PIN', 'error'); return }
    setBusy(true)
    try {
      if (backend) await createStaff({ ...auth!, name, role, pin })
      else setStaff((current) => [...current, { _id: `staff-${Date.now()}`, name, role, enabled: true }])
      setAddReveal({ name, pin })
      notify('Staff member added')
    } catch (reason) { notify(reason instanceof Error ? reason.message : 'Staff member could not be added', 'error') }
    finally { setBusy(false) }
  }

  function closeAdd() { setAdding(false); setAddReveal(null) }

  async function saveEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editing) return
    const data = new FormData(event.currentTarget)
    const name = String(data.get('name') ?? '').trim()
    const role = String(data.get('role')) as Staff['role']
    if (name.length < 2 || !assignableRoles.includes(role)) { notify('Enter a name and a permitted role', 'error'); return }
    const previous = staff
    setBusy(true)
    try {
      setStaff((current) => current.map((person) => person._id === editing._id ? { ...person, name, role } : person))
      if (backend) await updateStaff({ token: auth!.token, staffId: editing._id, name, role, enabled: editing.enabled })
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

  async function resetPin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!pinTarget) return
    const pin = String(new FormData(event.currentTarget).get('pin') ?? '')
    if (!/^\d{4,6}$/u.test(pin)) { notify('Enter a 4–6 digit PIN', 'error'); return }
    setBusy(true)
    try {
      if (backend) await setPin({ token: auth!.token, staffId: pinTarget._id, pin })
      setPinReveal({ name: pinTarget.name, pin })
      notify('PIN updated')
    } catch (reason) { notify(reason instanceof Error ? reason.message : 'PIN could not be updated', 'error') }
    finally { setBusy(false) }
  }

  function closePin() { setPinTarget(null); setPinReveal(null) }

  const description = isOwner
    ? 'Manage manager, counter and waiter access without exposing stored PINs'
    : 'Manage counter and waiter access without exposing stored PINs'

  return <DashboardShell section="Staff" role={actorRole} actions={<Button size="small" disabled={assignableRoles.length === 0} onClick={() => setAdding(true)}>Add staff</Button>}>
    <section className="page-section">
      <div className="section-heading"><div><p className="caption">Access and roles</p><h1>Staff</h1><p className="muted">{description}</p></div></div>

      {rows.length === 0 ? <Card><p className="muted">No counter or waiter staff yet.</p></Card>
        : <Card className="staff-table-card"><TableWrap><Table>
          <thead><tr><Th>Name</Th><Th>Role</Th><Th>Status</Th><Th>Last active</Th><Th>Actions</Th></tr></thead>
          <tbody>{rows.map((person) => {
            const actionable = canManageStaff(actorRole, actorId, person)
            return <tr key={person._id} className={person.enabled ? 'staff-row staff-row-active' : 'staff-row staff-row-disabled'}>
              <Td><span className="body-strong">{person.name}</span>{person._id === actorId && <span className="fine-print muted"> · you</span>}</Td>
              <Td className="staff-role">{person.role}</Td>
              <Td><span className="status-tag"><span className="status-bar" aria-hidden="true" />{person.enabled ? 'Active' : 'Disabled'}</span></Td>
              <Td className="fine-print muted">—</Td>
              <Td>{actionable
                ? <div className="staff-row-actions"><Button size="small" variant="ghost" onClick={() => setEditing(person)}>Edit</Button><Button size="small" variant="ghost" icon={false} onClick={() => toggle(person)}>{person.enabled ? 'Disable' : 'Enable'}</Button><Button size="small" variant="ghost" icon={false} onClick={() => setPinTarget(person)}>Reset PIN</Button></div>
                : <span className="fine-print muted">—</span>}</Td>
            </tr>
          })}</tbody>
        </Table></TableWrap></Card>}
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

    <Dialog open={adding} onClose={() => { if (!busy) closeAdd() }} title="Add staff member" description="PINs are hashed with salted PBKDF2 and shown only once here">
      {addReveal
        ? <div className="pin-reveal"><p className="muted">Share this PIN with <strong>{addReveal.name}</strong> now. It will not be shown again.</p><p className="pin-reveal-value">{addReveal.pin}</p><div className="form-actions"><Button onClick={closeAdd}>Done</Button></div></div>
        : <form className="form-stack" onSubmit={add}><div className="field"><label htmlFor="staff-name">Name</label><Input id="staff-name" name="name" minLength={2} required /></div><div className="field"><label htmlFor="staff-role">Role</label><Select id="staff-role" name="role" defaultValue={assignableRoles.at(-1) ?? 'waiter'}>{assignableRoles.map((role) => <option key={role} value={role}>{role}</option>)}</Select></div><div className="field"><label htmlFor="staff-pin">PIN</label><Input id="staff-pin" name="pin" type="password" inputMode="numeric" minLength={4} maxLength={6} pattern="[0-9]{4,6}" required /></div><div className="form-actions"><Button type="button" variant="secondary" disabled={busy} onClick={closeAdd}>Discard</Button><Button type="submit" disabled={busy}>Add staff</Button></div></form>}
    </Dialog>

    <Dialog open={Boolean(editing)} onClose={() => { if (!busy) setEditing(null) }} title="Edit staff member" description="Change the name or role. Use reset PIN to change the PIN.">
      {editing && <form className="form-stack" onSubmit={saveEdit}><div className="field"><label htmlFor="edit-name">Name</label><Input id="edit-name" name="name" defaultValue={editing.name} minLength={2} required /></div><div className="field"><label htmlFor="edit-role">Role</label><Select id="edit-role" name="role" defaultValue={editing.role}>{Array.from(new Set([editing.role, ...assignableRoles])).map((role) => <option key={role} value={role}>{role}</option>)}</Select></div><div className="form-actions"><Button type="button" variant="secondary" disabled={busy} onClick={() => setEditing(null)}>Discard</Button><Button type="submit" disabled={busy}>Save changes</Button></div></form>}
    </Dialog>

    <Dialog open={Boolean(pinTarget)} onClose={() => { if (!busy) closePin() }} title="Reset PIN" description={pinReveal ? '' : `Create a new 4–6 digit PIN for ${pinTarget?.name ?? 'this staff member'}`}>
      {pinReveal
        ? <div className="pin-reveal"><p className="muted">Share this PIN with <strong>{pinReveal.name}</strong> now. It will not be shown again.</p><p className="pin-reveal-value">{pinReveal.pin}</p><div className="form-actions"><Button onClick={closePin}>Done</Button></div></div>
        : <form className="form-stack" onSubmit={resetPin}><div className="field"><label htmlFor="new-pin">New PIN</label><Input id="new-pin" name="pin" type="password" inputMode="numeric" minLength={4} maxLength={6} pattern="[0-9]{4,6}" required autoFocus /></div><div className="form-actions"><Button type="button" variant="secondary" disabled={busy} onClick={closePin}>Discard</Button><Button type="submit" disabled={busy}>Update PIN</Button></div></form>}
    </Dialog>
  </DashboardShell>
}
