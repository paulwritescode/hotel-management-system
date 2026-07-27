import type { ItemCategory } from '@heavenly/types'
import type { InteractiveButtonMessage, InteractiveListMessage, MenuItem } from './types'

export const MAX_BODY_LENGTH = 1024
const MAX_ROWS = 10
const MAX_BUTTONS = 3
const MAX_BUTTON_TITLE = 20
const MAX_FOOTER = 60

const CART_ACTION_BUTTONS = [
  { id: 'cart:confirm', title: 'Confirm order' },
  { id: 'cart:more', title: 'Add another dish' },
]
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

export function cartTotal(
  items: MenuItem[],
  cart: Array<{ itemId: string; quantity: number }>,
): number {
  const byId = new Map(items.map((item) => [item.id, item]))
  return cart.reduce((sum, line) => {
    const item = byId.get(line.itemId)
    return sum + (item ? item.priceKes * line.quantity : 0)
  }, 0)
}

/**
 * WhatsApp renders *single asterisks* as bold — not markdown's double asterisk. Blank lines between
 * blocks are what give the bubble its structure, so the spacing here is load-bearing.
 */
export function formatCart(items: MenuItem[], cart: Array<{ itemId: string; quantity: number }>): string {
  const byId = new Map(items.map((item) => [item.id, item]))
  const lines = cart.map((line, index) => {
    const item = byId.get(line.itemId)
    if (!item) return `${index + 1}. Unavailable item × ${line.quantity}`
    return `${index + 1}. ${line.quantity} × ${item.name}\n    KES ${formatKes(item.priceKes * line.quantity)}`
  })
  return [
    '*Your cart*',
    '',
    lines.join('\n'),
    '',
    `*Subtotal:* KES ${formatKes(cartTotal(items, cart))}`,
  ].join('\n')
}

export function formatKes(amount: number): string {
  return amount.toLocaleString('en-KE')
}

export type ImageHeader = { id: string } | { link: string }

function buttonMessage(
  to: string,
  body: string,
  buttons: Array<{ id: string; title: string }>,
  options: { image?: ImageHeader; footer?: string } = {},
): InteractiveButtonMessage {
  if (body.length > MAX_BODY_LENGTH) throw new Error('Interactive body exceeds 1024 characters')
  if (buttons.length > MAX_BUTTONS) throw new Error('Interactive message exceeds 3 reply buttons')
  const overlong = buttons.find((button) => button.title.length > MAX_BUTTON_TITLE)
  if (overlong) throw new Error(`Reply button title exceeds ${MAX_BUTTON_TITLE} characters`)
  return {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      ...(options.image ? { header: { type: 'image' as const, image: options.image } } : {}),
      body: { text: body },
      ...(options.footer ? { footer: { text: clip(options.footer, MAX_FOOTER) } } : {}),
      action: {
        buttons: buttons.map((button) => ({ type: 'reply' as const, reply: button })),
      },
    },
  }
}

/**
 * Confirmation of an added item: the dish photo as the header, the cart as the caption, and the
 * next two actions as buttons so the diner never has to type `confirm`. Falls back to a
 * header-less button message when the item has no photo.
 */
export function buildItemAddedMessage(
  to: string,
  added: { item: MenuItem; quantity: number },
  items: MenuItem[],
  cart: Array<{ itemId: string; quantity: number }>,
  image?: ImageHeader,
): InteractiveButtonMessage {
  const lead = `*${added.quantity} × ${added.item.name}* added to your order.`
  const withDescription = [
    lead,
    ...(added.item.description ? ['', `_${clip(added.item.description, 160)}_`] : []),
    '',
    formatCart(items, cart),
  ].join('\n')
  // A long cart can outgrow the 1024-character body. Drop the dish description first, then clip —
  // throwing here would cost the diner the whole message, buttons included.
  const body =
    withDescription.length <= MAX_BODY_LENGTH
      ? withDescription
      : clip([lead, '', formatCart(items, cart)].join('\n'), MAX_BODY_LENGTH)
  return buttonMessage(to, body, CART_ACTION_BUTTONS, {
    ...(image ? { image } : {}),
    footer: 'Add as many dishes as you like — they arrive as one order.',
  })
}

/** Same two actions without a dish header, for `cart` and after removing a line. */
export function buildCartActions(
  to: string,
  items: MenuItem[],
  cart: Array<{ itemId: string; quantity: number }>,
): InteractiveButtonMessage {
  return buttonMessage(to, formatCart(items, cart), CART_ACTION_BUTTONS, {
    footer: 'Add as many dishes as you like — they arrive as one order.',
  })
}

export function buildConsentButtons(to: string): InteractiveButtonMessage {
  return buttonMessage(
    to,
    [
      '*One last thing*',
      '',
      'Would you like occasional offers from Heavenly Foods?',
      '',
      '_Your answer will not affect this order._',
    ].join('\n'),
    [
      { id: 'consent:granted', title: 'Yes, send offers' },
      { id: 'consent:denied', title: 'No thanks' },
    ],
  )
}

export function formatOrderPlaced(
  tableNumber: number | undefined,
  totalKes: number,
  reference?: string,
): string {
  const shortRef = reference?.split('-').at(-1)
  return [
    '*Order received* ✅',
    '',
    ...(shortRef ? [`*Order no:*  #${shortRef}`] : []),
    `*Table:*  ${tableNumber ?? '—'}`,
    `*Total:*  KES ${formatKes(totalKes)}`,
    '',
    'The counter is verifying your order now. We will send your order summary as soon as it is confirmed.',
  ].join('\n')
}

export type OrderSummary = {
  reference?: string
  tableNumber: number
  customerName: string
  totalKes: number
  placedAt: number
  lines: Array<{ nameSnapshot: string; quantity: number; priceKesSnapshot: number }>
}

export type PaymentConfig = {
  acceptedPaymentMethods?: Array<'cash' | 'mpesa' | 'card' | 'other'>
  mpesaTillNumber?: string
}

const PAYMENT_METHOD_ORDER: Array<'cash' | 'mpesa' | 'card' | 'other'> = [
  'cash',
  'mpesa',
  'card',
  'other',
]
const PAYMENT_METHOD_LABELS: Record<'cash' | 'mpesa' | 'card' | 'other', string> = {
  cash: 'Cash',
  mpesa: 'M-Pesa',
  card: 'Card',
  other: 'Other',
}

function nairobiTimestamp(at: number): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Nairobi',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(at))
}

/**
 * The WhatsApp counterpart of the printed order summary in apps/web/lib/receipt.ts. Per Addendum 04
 * §3 this is an *order summary*, never a payment receipt: it tells the diner how to pay and MUST
 * NOT state or imply that payment has happened. The bilingual disclaimer is mandatory, and the
 * order reference is the anchor because it is what the diner reads aloud at the counter.
 */
export function formatOrderSummary(order: OrderSummary, payment?: PaymentConfig): string {
  const shortRef = order.reference?.split('-').at(-1)
  const accepted = PAYMENT_METHOD_ORDER.filter((method) =>
    (payment?.acceptedPaymentMethods ?? []).includes(method),
  )
  const methodLines = accepted.map((method) =>
    method === 'mpesa' && payment?.mpesaTillNumber
      ? `• M-Pesa Till ${payment.mpesaTillNumber}`
      : `• ${PAYMENT_METHOD_LABELS[method]}`,
  )
  return [
    '*HEAVENLY FOODS*',
    '*Order Summary*',
    '',
    ...(shortRef ? [`*ORDER REFERENCE*`, `*#${shortRef}*`, ''] : []),
    `*Table:*  ${order.tableNumber}`,
    `*Name:*  ${order.customerName}`,
    `*Placed:*  ${nairobiTimestamp(order.placedAt)} EAT`,
    '',
    '━━━━━━━━━━━━━━━━',
    '',
    ...order.lines.map(
      (line) =>
        `${line.quantity} × ${line.nameSnapshot}\n    KES ${formatKes(line.priceKesSnapshot * line.quantity)}`,
    ),
    '',
    '━━━━━━━━━━━━━━━━',
    '',
    `*TOTAL:  KES ${formatKes(order.totalKes)}*`,
    '',
    ...(methodLines.length > 0
      ? ['*HOW TO PAY*', 'Please pay at the counter and show this summary.', '', 'We accept:', ...methodLines, '']
      : ['*HOW TO PAY*', 'Please pay at the counter and show this summary.', '']),
    '_This is an order summary, not a payment receipt._',
    '_Please settle at the counter._',
    '',
    '_Hii ni muhtasari wa oda, si risiti ya malipo._',
    '_Tafadhali lipa kwenye kaunta._',
  ].join('\n')
}

export function formatOrderConfirmed(reference?: string): string {
  const shortRef = reference?.split('-').at(-1)
  return [
    `*Your order${shortRef ? ` #${shortRef}` : ''} is confirmed* 👨‍🍳`,
    '',
    'The kitchen is preparing it now and it will be brought to your table shortly.',
    '',
    'To pay, head over to the counter and show the order summary below.',
  ].join('\n')
}

export function categoryFromNumber(value: string): ItemCategory | undefined {
  const index = Number(value) - 1
  return Number.isInteger(index) ? CATEGORIES[index] : undefined
}
