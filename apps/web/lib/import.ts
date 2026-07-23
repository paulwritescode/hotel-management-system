import Papa from 'papaparse'
import type { ItemCategory, ParsedInventoryBatch, ParsedInventoryRow } from '@heavenly/types'

export type InventoryField = 'name' | 'nameSwahili' | 'description' | 'category' | 'priceKes' | 'available' | 'quantityOnHand' | 'unit'
export type ColumnMapping = Record<string, InventoryField | ''>

const synonyms: Record<InventoryField, string[]> = {
  name: ['item', 'name', 'dish'],
  nameSwahili: ['nameswahili', 'swahiliname', 'jinakiswahili'],
  description: ['description', 'details', 'maelezo'],
  category: ['category', 'type', 'aina'],
  priceKes: ['price', 'bei', 'cost', 'pricekes'],
  available: ['available', 'availability', 'in stock', 'instock'],
  quantityOnHand: ['qty', 'quantity', 'idadi', 'quantityonhand'],
  unit: ['unit', 'kipimo'],
}

const normalize = (value: string) => value.toLowerCase().replaceAll(/\s+/gu, '')

export function inferColumnMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {}
  for (const header of headers) {
    const normalized = normalize(header)
    const match = (Object.entries(synonyms) as Array<[InventoryField, string[]]>).find(([, values]) => values.some((value) => normalize(value) === normalized))
    mapping[header] = match?.[0] ?? ''
  }
  return mapping
}

const validCategories: ItemCategory[] = ['staple', 'vegetable', 'meat', 'bread', 'drink', 'dessert', 'side']

function booleanValue(value: string): boolean {
  return !['false', 'no', '0', 'unavailable', 'hapana'].includes(value.trim().toLowerCase())
}

export function mapInventoryRows(records: Array<Record<string, unknown>>, mapping: ColumnMapping, source: 'csv' | 'xlsx'): ParsedInventoryBatch {
  const rows: ParsedInventoryRow[] = records.map((record, index) => {
    const values: Partial<Record<InventoryField, string>> = {}
    const sourceColumns: Record<string, string> = {}
    for (const [header, raw] of Object.entries(record)) {
      const value = raw == null ? '' : String(raw).trim()
      sourceColumns[header] = value
      const field = mapping[header]
      if (field) values[field] = value
    }
    const errors: string[] = []
    const name = values.name?.trim()
    const category = values.category?.trim().toLowerCase() as ItemCategory | undefined
    const priceKes = Number(values.priceKes)
    const quantity = values.quantityOnHand === undefined || values.quantityOnHand === '' ? undefined : Number(values.quantityOnHand)
    if (!name) errors.push('Name is required')
    if (!category || !validCategories.includes(category)) errors.push('Choose a valid category')
    if (!Number.isInteger(priceKes) || priceKes <= 0) errors.push('Price must be a positive whole number')
    if (quantity !== undefined && (!Number.isInteger(quantity) || quantity < 0)) errors.push('Quantity must be zero or a positive whole number')
    const row: ParsedInventoryRow = { sourceRow: index + 2, sourceColumns, errors }
    if (name) row.name = name
    if (values.nameSwahili) row.nameSwahili = values.nameSwahili
    if (values.description) row.description = values.description
    if (category) row.category = category
    if (Number.isFinite(priceKes)) row.priceKes = priceKes
    if (values.available !== undefined) row.available = booleanValue(values.available)
    if (quantity !== undefined && Number.isFinite(quantity)) row.quantityOnHand = quantity
    if (values.unit) row.unit = values.unit
    return row
  })
  const unknown = Object.entries(mapping).filter(([, field]) => !field).map(([header]) => header)
  return { source, rows, warnings: unknown.length ? [`Unmapped columns: ${unknown.join(', ')}`] : [] }
}

export function parseCsv(text: string, mappingOverride?: ColumnMapping): { batch: ParsedInventoryBatch; headers: string[]; mapping: ColumnMapping } {
  const parsed = Papa.parse<Record<string, unknown>>(text, { header: true, skipEmptyLines: true })
  const headers = parsed.meta.fields ?? []
  const mapping = mappingOverride ?? inferColumnMapping(headers)
  const batch = mapInventoryRows(parsed.data, mapping, 'csv')
  batch.warnings.push(...parsed.errors.map((error) => `Row ${error.row ?? '?'}: ${error.message}`))
  return { batch, headers, mapping }
}
