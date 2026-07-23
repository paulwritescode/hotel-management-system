'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useMutation, useQuery } from 'convex/react'
import { useEffect, useMemo, useState } from 'react'
import { DashboardShell } from '@/components/shell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Input, Textarea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/toast'
import { useAuthArgs, useBackendAvailable } from '@/components/providers'
import { api } from '@/lib/convex'
import { demoItems } from '@/lib/demo-data'
import { categories, type Id, type Item } from '@/lib/models'

type ItemInput = Omit<Item, '_id' | 'archived' | 'imageUrl'>

const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

function itemFromForm(form: HTMLFormElement): ItemInput | null {
  const data = new FormData(form)
  const name = String(data.get('name') ?? '').trim()
  const priceKes = Number(data.get('priceKes'))
  const category = String(data.get('category')) as Item['category']
  const quantityRaw = String(data.get('quantityOnHand') ?? '').trim()
  const quantity = quantityRaw === '' ? undefined : Number(quantityRaw)
  if (!name || !categories.includes(category) || !Number.isInteger(priceKes) || priceKes <= 0 || (quantity !== undefined && (!Number.isInteger(quantity) || quantity < 0))) return null
  const item: ItemInput = { name, category, priceKes, available: data.get('available') === 'on' }
  const nameSwahili = String(data.get('nameSwahili') ?? '').trim(); if (nameSwahili) item.nameSwahili = nameSwahili
  const description = String(data.get('description') ?? '').trim(); if (description) item.description = description
  if (quantity !== undefined) item.quantityOnHand = quantity
  const unit = String(data.get('unit') ?? '').trim(); if (unit) item.unit = unit
  const imageAlt = String(data.get('imageAlt') ?? '').trim(); if (imageAlt) item.imageAlt = imageAlt
  return item
}

function preservedImage(item: Item | undefined): Partial<ItemInput> {
  if (!item) return {}
  return {
    ...(item.imageStorageId ? { imageStorageId: item.imageStorageId } : {}),
    ...(item.externalImageUrl ? { externalImageUrl: item.externalImageUrl } : {}),
    ...(item.imageAlt ? { imageAlt: item.imageAlt } : {}),
    ...(item.imageCredit ? { imageCredit: item.imageCredit } : {}),
    ...(item.imageCreditUrl ? { imageCreditUrl: item.imageCreditUrl } : {}),
  }
}

export function InventoryManager() {
  const backend = useBackendAvailable()
  const auth = useAuthArgs()
  const live = useQuery(api.items.inventory, backend ? auth! : 'skip')
  const generateUploadUrl = useMutation(api.items.generateUploadUrl)
  const createItem = useMutation(api.items.create)
  const updateItem = useMutation(api.items.update)
  const archiveItem = useMutation(api.items.archive)
  const setAvailability = useMutation(api.items.setAvailability)
  const notify = useToast()
  const [items, setItems] = useState<Item[]>(backend ? [] : demoItems)
  const [editing, setEditing] = useState<Item | 'new' | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [archiveTarget, setArchiveTarget] = useState<Item | null>(null)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  useEffect(() => { if (live) setItems(live) }, [live])
  const visible = useMemo(() => items.filter((item) => !item.archived && (category === 'all' || item.category === category) && item.name.toLowerCase().includes(search.toLowerCase())), [category, items, search])

  function openEditor(item: Item | 'new') {
    setImageFile(null)
    setEditing(item)
  }

  function chooseImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) { setImageFile(null); return }
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      event.target.value = ''
      notify('Choose a JPEG, PNG or WebP image', 'error')
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      event.target.value = ''
      notify('Image must be 5 MB or smaller', 'error')
      return
    }
    setImageFile(file)
  }

  async function uploadImage(file: File): Promise<Id> {
    const uploadUrl = await generateUploadUrl(auth!)
    const response = await fetch(uploadUrl, { method: 'POST', headers: { 'Content-Type': file.type }, body: file })
    if (!response.ok) throw new Error('The image upload failed')
    const result = await response.json() as { storageId?: Id }
    if (!result.storageId) throw new Error('Convex did not return an image storage ID')
    return result.storageId
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const existing = editing === 'new' ? undefined : editing ?? undefined
    const value = itemFromForm(event.currentTarget)
    if (!value) { notify('Check the name, category, positive whole price and quantity', 'error'); return }
    const before = items
    setSaving(true)
    try {
      let payload: ItemInput = { ...value, ...preservedImage(existing) }
      if (imageFile) {
        if (!backend) throw new Error('Connect Convex before uploading images')
        const imageStorageId = await uploadImage(imageFile)
        payload = { ...value, imageStorageId, imageAlt: value.imageAlt ?? `${value.name} menu item` }
      }
      if (existing) {
        setItems((current) => current.map((item) => item._id === existing._id ? { ...item, ...payload } : item))
        if (backend) await updateItem({ token: auth!.token, itemId: existing._id, ...payload })
        notify(imageFile ? 'Menu item and image updated' : 'Menu item updated')
      } else {
        if (backend) await createItem({ ...auth!, ...payload })
        else setItems((current) => [{ _id: `item-${Date.now()}`, archived: false, ...payload }, ...current])
        notify(imageFile ? 'Menu item created with its image' : 'Menu item created')
      }
      setEditing(null)
      setImageFile(null)
    } catch (reason) {
      setItems(before)
      notify(reason instanceof Error ? reason.message : 'The menu item could not be saved and changes were reverted', 'error')
    } finally { setSaving(false) }
  }

  async function toggle(item: Item) {
    const available = !item.available
    setItems((current) => current.map((entry) => entry._id === item._id ? { ...entry, available } : entry))
    try { if (backend) await setAvailability({ token: auth!.token, itemId: item._id, available }) }
    catch { setItems((current) => current.map((entry) => entry._id === item._id ? item : entry)); notify('Availability update failed and was reverted', 'error') }
  }

  async function archive() {
    if (!archiveTarget) return
    try {
      if (backend) await archiveItem({ token: auth!.token, itemId: archiveTarget._id })
      setItems((current) => current.map((item) => item._id === archiveTarget._id ? { ...item, archived: true } : item))
      notify('Item archived'); setArchiveTarget(null)
    } catch { notify('Item could not be archived', 'error') }
  }

  const current = editing === 'new' ? undefined : editing ?? undefined
  return <DashboardShell section="Inventory" actions={<><Link className="button button-outline button-small" href="/manager/inventory/import">Import file</Link><Button size="small" onClick={() => openEditor('new')}>Add item</Button></>}>
    <section className="page-section">
      <div className="section-heading"><div><p className="caption">Menu and stock</p><h1>Inventory</h1><p className="muted">Create, edit, archive and change diner-facing availability</p></div></div>
      <div className="filter-bar"><Input type="search" placeholder="Search inventory" value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search inventory"/><Select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filter by category"><option value="all">All categories</option>{categories.map((entry) => <option key={entry}>{entry}</option>)}</Select></div>
      <div className="inventory-grid">{visible.map((item) => <Card className="inventory-card" key={item._id}>
        <div>
          <div className="inventory-image">
            {item.imageUrl ? <Image src={item.imageUrl} alt={item.imageAlt ?? item.name} fill sizes="(max-width: 640px) 100vw, (max-width: 1068px) 33vw, 20vw" /> : <div className="inventory-image-placeholder" aria-hidden="true"><span>{item.name.charAt(0)}</span></div>}
            {item.imageCredit && item.imageCreditUrl && <a className="inventory-image-credit" href={item.imageCreditUrl} target="_blank" rel="noreferrer">{item.imageCredit}</a>}
          </div>
          <div className="stock-card-top"><Badge>{item.available ? 'Available' : 'Unavailable'}</Badge><Switch checked={item.available} onClick={() => toggle(item)} aria-label={`Toggle ${item.name} availability`} /></div>
          <h3>{item.name}</h3>{item.nameSwahili && <p className="caption muted">{item.nameSwahili}</p>}<p className="inventory-description">{item.description ?? 'No description yet'}</p>
        </div>
        <div><div className="inventory-meta"><strong>KES {item.priceKes.toLocaleString()}</strong><span className="fine-print">{item.quantityOnHand === undefined ? 'Not tracked' : `${item.quantityOnHand} ${item.unit ?? 'units'}`}</span></div><div className="inventory-actions"><Button size="small" variant="secondary" onClick={() => openEditor(item)}>Edit</Button><Button size="small" variant="outline" onClick={() => setArchiveTarget(item)}>Archive</Button></div></div>
      </Card>)}</div>
    </section>

    <Dialog open={Boolean(editing)} onClose={() => { if (!saving) setEditing(null) }} title={current ? 'Edit menu item' : 'Add menu item'} description="Changes to price never alter historical orders">
      <form className="form-stack" onSubmit={save}>
        <div className="field"><label htmlFor="item-name">Name</label><Input id="item-name" name="name" defaultValue={current?.name} required /></div>
        <div className="field"><label htmlFor="item-swahili">Swahili name</label><Input id="item-swahili" name="nameSwahili" defaultValue={current?.nameSwahili} /></div>
        <div className="field"><label htmlFor="item-description">Description</label><Textarea id="item-description" name="description" defaultValue={current?.description} placeholder="Describe the ingredients, preparation and accompaniments" /></div>
        <div className="field">
          <span className="field-label">Food image</span>
          <label className="image-upload-control">
            <span><strong>{imageFile?.name ?? (current?.imageUrl ? 'Replace current image' : 'Choose an image')}</strong><small>JPEG, PNG or WebP · maximum 5 MB · stored in Convex</small></span>
            <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseImage} />
          </label>
        </div>
        <div className="field"><label htmlFor="item-image-alt">Image description</label><Input id="item-image-alt" name="imageAlt" defaultValue={current?.imageAlt} placeholder="Grilled chicken served with kachumbari" /></div>
        <div className="field-grid"><div className="field"><label htmlFor="item-category">Category</label><Select id="item-category" name="category" defaultValue={current?.category ?? 'staple'}>{categories.map((entry) => <option key={entry}>{entry}</option>)}</Select></div><div className="field"><label htmlFor="item-price">Price in KES</label><Input id="item-price" name="priceKes" type="number" min="1" step="1" defaultValue={current?.priceKes} required /></div><div className="field"><label htmlFor="item-quantity">Quantity on hand</label><Input id="item-quantity" name="quantityOnHand" type="number" min="0" step="1" defaultValue={current?.quantityOnHand} placeholder="Not tracked" /></div><div className="field"><label htmlFor="item-unit">Unit</label><Input id="item-unit" name="unit" defaultValue={current?.unit} placeholder="kg, pcs, plate, L" /></div></div>
        <label className="inline-controls"><input type="checkbox" name="available" defaultChecked={current?.available ?? true} /> Available to diners</label>
        <div className="form-actions"><Button type="button" variant="secondary" disabled={saving} onClick={() => setEditing(null)}>Discard</Button><Button type="submit" disabled={saving}>{saving ? (imageFile ? 'Uploading image' : 'Saving') : 'Save item'}</Button></div>
      </form>
    </Dialog>
    <Dialog open={Boolean(archiveTarget)} onClose={() => setArchiveTarget(null)} title="Archive menu item" description="Historical orders remain unchanged and the item disappears from every menu"><p>Archive <strong>{archiveTarget?.name}</strong>?</p><div className="form-actions"><Button variant="secondary" onClick={() => setArchiveTarget(null)}>Keep item</Button><Button variant="danger" onClick={archive}>Archive item</Button></div></Dialog>
  </DashboardShell>
}
