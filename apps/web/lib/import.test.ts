import { describe, expect, it } from 'vitest'
import { inferColumnMapping, parseCsv } from './import'

describe('CSV column inference', () => {
  it('maps every required synonym regardless of spacing and case', () => {
    expect(inferColumnMapping([' Dish ', 'BEI', 'Idadi'])).toEqual({ ' Dish ': 'name', BEI: 'priceKes', Idadi: 'quantityOnHand' })
    expect(inferColumnMapping(['item', 'cost', 'qty'])).toEqual({ item: 'name', cost: 'priceKes', qty: 'quantityOnHand' })
  })

  it('keeps unknown headers unmapped and reports them', () => {
    const result = parseCsv('Mystery,Name,Price,Category\nvalue,Ugali,150,staple')
    expect(result.mapping.Mystery).toBe('')
    expect(result.batch.warnings).toContain('Unmapped columns: Mystery')
    expect(result.batch.rows[0]?.errors).toEqual([])
  })
})
