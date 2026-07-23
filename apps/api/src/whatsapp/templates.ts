import type { ItemCategory } from '@heavenly/types'
import type { InteractiveListMessage, MenuItem } from './types'

export const MAX_BODY_LENGTH = 1024
const MAX_ROWS = 10
const CATEGORIES: ItemCategory[] = [
  'staple',
  'vegetable',
  'meat',
  'bread',
  'drink',
  'dessert',
  'side',
]

function clip(value: string, length: number): string {
  if (value.length <= length) return value
  return `${value.slice(0, Math.max(0, length - 1)).trimEnd()}…`
}

export function paginateText(text: string, maxLength = MAX_BODY_LENGTH): string[] {
  const normalized = text.trim()
  if (!normalized) return ['']
  const pages: string[] = []
  let remaining = normalized
  while (remaining.length > maxLength) {
    let boundary = remaining.lastIndexOf('\n', maxLength)
    if (boundary < Math.floor(maxLength / 2)) boundary = remaining.lastIndexOf(' ', maxLength)
    if (boundary < 1) boundary = maxLength
    pages.push(remaining.slice(0, boundary).trim())
    remaining = remaining.slice(boundary).trim()
  }
  if (remaining) pages.push(remaining)
  return pages
}

function listMessage(
  to: string,
  body: string,
  button: string,
  title: string,
  rows: Array<{ id: string; title: string; description?: string }>,
): InteractiveListMessage {
  if (body.length > MAX_BODY_LENGTH) throw new Error('Interactive body exceeds 1024 characters')
  if (rows.length > MAX_ROWS) throw new Error('Interactive list exceeds 10 rows')
  return {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: { type: 'list', body: { text: body }, action: { button, sections: [{ title, rows }] } },
  }
}

export function buildCategoryList(to: string): InteractiveListMessage {
  return listMessage(
    to,
    'Choose a menu category. You can also type its number.',
    'View categories',
    'Categories',
    CATEGORIES.map((category, index) => ({
      id: `category:${category}`,
      title: `${index + 1}. ${category[0]?.toUpperCase() ?? ''}${category.slice(1)}`,
    })),
  )
}

export function buildMenuLists(
  to: string,
  items: MenuItem[],
  category?: ItemCategory,
): InteractiveListMessage[] {
  const visible = items
    .map((item, index) => ({ item, menuNumber: index + 1 }))
    .filter(({ item }) => item.available && !item.archived && (!category || item.category === category))
  if (visible.length === 0) return []
  const pageCount = Math.ceil(visible.length / MAX_ROWS)
  const messages: InteractiveListMessage[] = []
  for (let page = 0; page < pageCount; page += 1) {
    const pageItems = visible.slice(page * MAX_ROWS, (page + 1) * MAX_ROWS)
    const scope = category ? `${category} menu` : 'Live menu'
    messages.push(
      listMessage(
        to,
        `${scope} — page ${page + 1} of ${pageCount}. Choose an item or type its menu number.`,
        'Choose an item',
        clip(`${scope} ${page + 1}/${pageCount}`, 24),
        pageItems.map(({ item, menuNumber }) => ({
          id: `item:${item.id}`,
          title: clip(`${menuNumber}. ${item.name}`, 24),
          description: clip(`KES ${item.priceKes}${item.description ? ` · ${item.description}` : ''}`, 72),
        })),
      ),
    )
  }
  return messages
}

export function buildRatingList(to: string, orderId: string): InteractiveListMessage {
  return listMessage(
    to,
    'How was your meal? Choose a rating from 1 to 5.',
    'Rate your meal',
    'Rating',
    [1, 2, 3, 4, 5].map((rating) => ({
      id: `rating:${orderId}:${rating}`,
      title: `${rating} — ${rating === 1 ? 'Poor' : rating === 5 ? 'Excellent' : 'Stars'}`,
    })),
  )
}

export function formatCart(items: MenuItem[], cart: Array<{ itemId: string; quantity: number }>): string {
  const byId = new Map(items.map((item) => [item.id, item]))
  const lines = cart.map((line, index) => {
    const item = byId.get(line.itemId)
    return item
      ? `${index + 1}. ${line.quantity} × ${item.name} — KES ${item.priceKes * line.quantity}`
      : `${index + 1}. Unavailable item × ${line.quantity}`
  })
  const total = cart.reduce((sum, line) => {
    const item = byId.get(line.itemId)
    return sum + (item ? item.priceKes * line.quantity : 0)
  }, 0)
  return [
    `Your cart`,
    ...lines,
    `Available-item subtotal: KES ${total}`,
    'Reply confirm to continue, more to browse, or remove 2 to remove a line.',
  ].join('\n')
}

export function categoryFromNumber(value: string): ItemCategory | undefined {
  const index = Number(value) - 1
  return Number.isInteger(index) ? CATEGORIES[index] : undefined
}
