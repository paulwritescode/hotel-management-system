'use client'

import Link from 'next/link'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { useMutation } from 'convex/react'
import { useMemo, useState } from 'react'
import type { ParsedInventoryBatch } from '@heavenly/types'
import { DashboardShell } from '@/components/shell'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { Table, TableWrap, Td, Th } from '@/components/ui/table'
import { useToast } from '@/components/ui/toast'
import { useAuthArgs, useBackendAvailable } from '@/components/providers'
import { api } from '@/lib/convex'
import { inferColumnMapping, mapInventoryRows, type ColumnMapping, type InventoryField } from '@/lib/import'
import type { Item } from '@/lib/models'

const fields: Array<{ value: InventoryField | ''; label: string }> = [
  { value: '', label: 'Do not import' }, { value: 'name', label: 'Name' }, { value: 'nameSwahili', label: 'Swahili name' }, { value: 'description', label: 'Description' }, { value: 'category', label: 'Category' }, { value: 'priceKes', label: 'Price in KES' }, { value: 'available', label: 'Available' }, { value: 'quantityOnHand', label: 'Quantity on hand' }, { value: 'unit', label: 'Unit' },
]

export function InventoryImport() {
  const backend = useBackendAvailable()
  const auth = useAuthArgs()
  const bulkUpsert = useMutation(api.items.bulkUpsert)
  const notify = useToast()
  const [fileName, setFileName] = useState('')
  const [records, setRecords] = useState<Array<Record<string, unknown>>>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [mapping, setMapping] = useState<ColumnMapping>({})
  const [source, setSource] = useState<'csv' | 'xlsx'>('csv')
  const [saveProfile, setSaveProfile] = useState(true)
  const [busy, setBusy] = useState(false)
  const batch: ParsedInventoryBatch | null = useMemo(() => records.length ? mapInventoryRows(records, mapping, source) : null, [mapping, records, source])
  const validRows = batch?.rows.filter((row) => row.errors.length === 0) ?? []
  const invalidRows = batch?.rows.filter((row) => row.errors.length > 0) ?? []

  async function chooseFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const extension = file.name.split('.').pop()?.toLowerCase()
    if (extension !== 'csv' && extension !== 'xlsx') { notify('Choose a .csv or .xlsx file', 'error'); return }
    try {
      let rows: Array<Record<string, unknown>> = []
      let nextHeaders: string[] = []
      if (extension === 'csv') {
        const result = Papa.parse<Record<string, unknown>>(await file.text(), { header: true, skipEmptyLines: true })
        rows = result.data; nextHeaders = result.meta.fields ?? []; setSource('csv')
        if (result.errors.length) notify(`Parsed with ${result.errors.length} CSV warning${result.errors.length === 1 ? '' : 's'}`, 'error')
      } else {
        const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        if (!sheetName) throw new Error('Workbook has no sheets')
        const sheet = workbook.Sheets[sheetName]
        if (!sheet) throw new Error('First sheet is empty')
        rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
        nextHeaders = rows[0] ? Object.keys(rows[0]) : []
        setSource('xlsx')
      }
      if (!rows.length || !nextHeaders.length) throw new Error('No data rows found')
      setFileName(file.name); setRecords(rows); setHeaders(nextHeaders); setMapping(inferColumnMapping(nextHeaders))
    } catch (reason) { notify(reason instanceof Error ? reason.message : 'The file could not be parsed', 'error') }
  }

  function updateMapping(header: string, field: InventoryField | '') { setMapping((current) => ({ ...current, [header]: field })) }

  async function approve() {
    if (!validRows.length) { notify('There are no valid rows to import', 'error'); return }
    const rows: Array<Omit<Item, '_id' | 'archived'>> = validRows.map((row) => {
      const item: Omit<Item, '_id' | 'archived'> = { name: row.name!, category: row.category!, priceKes: row.priceKes!, available: row.available ?? true }
      if (row.nameSwahili) item.nameSwahili = row.nameSwahili
      if (row.description) item.description = row.description
      if (row.quantityOnHand !== undefined) item.quantityOnHand = row.quantityOnHand
      if (row.unit) item.unit = row.unit
      return item
    })
    setBusy(true)
    try {
      if (backend) {
        const result = await bulkUpsert({ ...auth!, rows, ...(saveProfile ? { columnMappingProfile: mapping } : {}) })
        notify(`Import complete: ${result.inserted} added and ${result.updated} updated`)
      } else notify(`Demo mode validated ${rows.length} row${rows.length === 1 ? '' : 's'}; no data was written`)
    } catch { notify('Nothing was imported because the atomic upsert failed', 'error') }
    finally { setBusy(false) }
  }

  return <DashboardShell section="Import inventory" actions={<Link className="button button-secondary button-small" href="/manager/inventory">Back to inventory</Link>}><section className="page-section page-section-narrow"><div className="section-heading"><div><p className="caption">CSV and Excel</p><h1>Import inventory</h1><p className="muted">Map once, validate every row, then upsert the valid subset in one transaction</p></div></div><label className="upload-zone"><span><strong>{fileName || 'Choose a spreadsheet'}</strong><br/><span className="caption muted">CSV or XLSX · parsed only in this browser</span></span><input className="sr-only" type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={chooseFile} /></label>
    {batch && <><Card style={{ marginTop: 24 }}><div className="card-header"><div><h2>Confirm column mapping</h2><p className="muted">Override any inferred field before approval</p></div></div><div className="mapping-grid">{headers.map((header) => <div className="mapping-row" key={header}><span>{header}</span><Select aria-label={`Map ${header}`} value={mapping[header] ?? ''} onChange={(event) => updateMapping(header, event.target.value as InventoryField | '')}>{fields.map((field) => <option key={field.value} value={field.value}>{field.label}</option>)}</Select></div>)}</div><label className="inline-controls" style={{ marginTop: 24 }}><input type="checkbox" checked={saveProfile} onChange={(event) => setSaveProfile(event.target.checked)} /> Save original headers as this restaurant’s mapping profile</label></Card>
    <Card style={{ marginTop: 24 }}><div className="card-header"><div><h2>Preview</h2><p className="muted">First 20 rows · {validRows.length} valid · {invalidRows.length} excluded</p></div></div><TableWrap><Table><thead><tr><Th>Row</Th><Th>Name</Th><Th>Category</Th><Th>Price</Th><Th>Quantity</Th><Th>Validation</Th></tr></thead><tbody>{batch.rows.slice(0, 20).map((row) => <tr key={row.sourceRow}><Td>{row.sourceRow}</Td><Td>{row.name || '—'}</Td><Td>{row.category || '—'}</Td><Td>{row.priceKes === undefined ? '—' : `KES ${row.priceKes}`}</Td><Td>{row.quantityOnHand ?? 'Not tracked'}</Td><Td>{row.errors.length ? <ul className="validation-list error-text">{row.errors.map((error) => <li key={error}>{error}</li>)}</ul> : 'Ready'}</Td></tr>)}</tbody></Table></TableWrap></Card>
    {invalidRows.length > 0 && <Card style={{ marginTop: 24 }}><h3>Excluded rows</h3><p className="caption muted">These rows will not be sent to Convex</p><ul className="validation-list">{invalidRows.map((row) => <li key={row.sourceRow}>Row {row.sourceRow}: {row.errors.join('; ')}</li>)}</ul></Card>}
    <div className="form-actions"><Button variant="secondary" onClick={() => { setRecords([]); setFileName('') }}>Clear file</Button><Button disabled={busy || !validRows.length} onClick={approve}>{busy ? 'Importing' : `Import ${validRows.length} valid row${validRows.length === 1 ? '' : 's'}`}</Button></div></>}
    <Card style={{ marginTop: 48 }}><p className="fine-print">Parser seam</p><h3>Ready for future OCR</h3><p className="muted">CSV and XLSX produce the shared <code>ParsedInventoryBatch</code> shape. A future OCR parser can join before this mapping, preview and commit flow without changing downstream code</p></Card></section></DashboardShell>
}
