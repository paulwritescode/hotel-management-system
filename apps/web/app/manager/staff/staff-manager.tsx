'use client'

import { useAction, useMutation, useQuery } from 'convex/react'
import { Check, Copy, RefreshCw } from 'lucide-react'
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

type ViewerRole = Staff['role']
type Reveal = { name: string; role: Staff['role']; pin: string }


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
    if (name.length < 2 || !assignableRoles.includes(role)) { notify('Enter a name and a permitted role', 'error'); return }
    if (!draftPin) { notify('Generate a PIN before adding the staff member', 'error'); return }
    setBusy(true)
    try {
      if (backend) await createStaff({ ...auth!, name, role, pin: draftPin })
      else setStaff((current) => [...current, { _id: `staff-${Date.now()}`, name, role, enabled: true }])
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
    ? 'Manage manager, counter and waiter access without exposing stored PINs'
    : 'Manage counter and waiter access without exposing stored PINs'

  return <DashboardShell section="Staff" role={actorRole}>
    <section className="page-section">
      <div className="section-heading">
        <div><p className="caption">Access and roles</p><h1>Staff</h1><p className="muted">{description}</p></div>
        <Button size="small" disabled={assignableRoles.length === 0} onClick={() => setAdding(true)}>Add staff</Button>
      </div>

      {rows.length === 0 ? <Card><p className="muted">No counter or waiter staff yet.</p></Card>
        : <Card className="staff-table-card"><TableWrap><Table>
          <thead><tr><Th className="staff-index-col">#</Th><Th>Name</Th><Th>Role</Th><Th>Status</Th><Th>Last active</Th><Th className="staff-actions-col">Actions</Th></tr></thead>
          <tbody>{rows.map((person, index) => {
            const actionable = canManageStaff(actorRole, actorId, person)
            const activeAt = lastActive?.[person._id]
            return <tr key={person._id} className={person.enabled ? 'staff-row staff-row-active' : 'staff-row staff-row-disabled'}>
              <Td className="staff-index-col fine-print muted">{index + 1}</Td>
              <Td><div className="staff-name-cell"><span className="staff-avatar">{person.name.trim().charAt(0).toUpperCase()}</span><span><span className="body-strong">{person.name}</span>{person._id === actorId && <span className="fine-print muted"> · you</span>}</span></div></Td>
              <Td><span className="staff-role-pill">{person.role}</span></Td>
              <Td><span className={person.enabled ? 'staff-status staff-status-active' : 'staff-status staff-status-disabled'}><span className="staff-status-dot" aria-hidden="true" />{person.enabled ? 'Active' : 'Disabled'}</span></Td>
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

    {!isOwner && <section className="page-section" style={{ paddingTop: 0 }}>
      <ActivityFeed title="Team activity" scopeNote="Counter and waiter activity — who signed in and what they changed, where and when" limit={100} />
    </section>}

    <Dialog open={adding} onClose={() => { if (!busy) closeAdd() }} title="Add staff member" description="PINs are hashed with salted PBKDF2 and shown only once here">
      {addReveal
        ? <PinReveal reveal={addReveal} onDone={closeAdd} />
        : <form className="form-stack" onSubmit={add}>
            <div className="field"><label htmlFor="staff-name">Name</label><Input id="staff-name" name="name" minLength={2} required /></div>
            <div className="field"><label htmlFor="staff-role">Role</label><Select id="staff-role" name="role" defaultValue={assignableRoles.at(-1) ?? 'waiter'}>{assignableRoles.map((role) => <option key={role} value={role}>{role}</option>)}</Select></div>
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
      {editing && <form className="form-stack" onSubmit={saveEdit}><div className="field"><label htmlFor="edit-name">Name</label><Input id="edit-name" name="name" defaultValue={editing.name} minLength={2} required /></div><div className="field"><label htmlFor="edit-role">Role</label><Select id="edit-role" name="role" defaultValue={editing.role}>{Array.from(new Set([editing.role, ...assignableRoles])).map((role) => <option key={role} value={role}>{role}</option>)}</Select></div><div className="form-actions"><Button type="button" variant="secondary" disabled={busy} onClick={() => setEditing(null)}>Discard</Button><Button type="submit" disabled={busy}>Save changes</Button></div></form>}
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
