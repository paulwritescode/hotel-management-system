import { describe, expect, it } from 'vitest'
import { buildMenuLists, MAX_BODY_LENGTH, paginateText } from './templates'
import type { MenuItem } from './types'

function item(index: number): MenuItem {
  return {
    id: `item-${index}`,
    name: `Menu item ${index}`,
    description: 'Freshly prepared',
    category: 'staple',
    priceKes: 100 + index,
    available: true,
    archived: false,
  }
}

describe('WhatsApp templates', () => {
  it('paginates interactive menu lists at ten rows', () => {
    const pages = buildMenuLists('254700000000', Array.from({ length: 23 }, (_, index) => item(index)))
    expect(pages).toHaveLength(3)
    expect(pages.map((page) => page.interactive.action.sections[0]?.rows.length)).toEqual([10, 10, 3])
    expect(pages.every((page) => page.interactive.body.text.length <= MAX_BODY_LENGTH)).toBe(true)
  })

  it('paginates long text without dropping content words', () => {
    const text = Array.from({ length: 400 }, () => 'dish').join(' ')
    const pages = paginateText(text)
    expect(pages.every((page) => page.length <= MAX_BODY_LENGTH)).toBe(true)
    expect(pages.join(' ').split(/\s+/)).toHaveLength(400)
  })
})
