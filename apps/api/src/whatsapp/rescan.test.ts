import { describe, expect, it } from 'vitest'
import { parseTableNumber } from './processor'

// The QR encodes `wa.me/<msisdn>?text=Table%20N`, so every scan sends exactly this text. These
// pin the parser that decides whether an inbound message is a table re-scan.
describe('table number parsing', () => {
  it('accepts the exact text the table QR prefills', () => {
    expect(parseTableNumber('Table 1')).toBe(1)
    expect(parseTableNumber('Table 12')).toBe(12)
  })

  it('is case and spacing tolerant, since diners retype it', () => {
    expect(parseTableNumber('table 3')).toBe(3)
    expect(parseTableNumber('TABLE3')).toBe(3)
    expect(parseTableNumber('  Table  7  ')).toBe(7)
  })

  it('rejects anything that is not a table reference', () => {
    expect(parseTableNumber('menu')).toBeUndefined()
    expect(parseTableNumber('3')).toBeUndefined()
    expect(parseTableNumber('Table')).toBeUndefined()
    expect(parseTableNumber('Table 0')).toBeUndefined()
    expect(parseTableNumber('Table 1000')).toBeUndefined()
  })
})
