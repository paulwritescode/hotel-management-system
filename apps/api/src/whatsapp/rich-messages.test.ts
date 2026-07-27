import { describe, expect, it, vi } from 'vitest'
import type { RuntimeEnv } from '../env'
import type { PendingOrderSummary } from '../convex'
import { dispatchOrderSummaries } from './processor'
import {
  buildConsentButtons,
  buildItemAddedMessage,
  formatOrderPlaced,
  formatOrderSummary,
} from './templates'
import type { MenuItem, OutboundMessage } from './types'

const pilau: MenuItem = {
  id: 'item-1',
  name: 'Pilau',
  description: 'Fragrant coastal rice simmered with warm cardamom, cumin and cinnamon.',
  category: 'staple',
  priceKes: 300,
  available: true,
  archived: false,
  imageUrl: 'https://images.example.com/pilau.jpg',
}

const env: RuntimeEnv = {
  whatsappToken: 'token',
  phoneNumberId: '1234567890',
  verifyToken: 'verify',
  metaAppSecret: 'secret',
  convexUrl: 'https://example.convex.cloud',
  restaurantId: 'restaurant-1',
  buildSha: 'test',
  feedbackDelayMs: 600_000,
}

describe('item added message', () => {
  it('carries the dish photo, a bold cart, and both next actions', () => {
    const message = buildItemAddedMessage(
      '+254700000001',
      { item: pilau, quantity: 1 },
      [pilau],
      [{ itemId: 'item-1', quantity: 1 }],
    )
    if (message.interactive.type !== 'button') throw new Error('expected a button message')

    expect(message.interactive.header).toEqual({
      type: 'image',
      image: { link: 'https://images.example.com/pilau.jpg' },
    })
    expect(message.interactive.body.text).toContain('*1 × Pilau* added to your order.')
    expect(message.interactive.body.text).toContain('*Your cart*')
    expect(message.interactive.body.text).toContain('*Subtotal:* KES 300')
    expect(message.interactive.action.buttons.map((button) => button.reply.id)).toEqual([
      'cart:confirm',
      'cart:more',
    ])
  })

  it('omits the header when the dish has no photo rather than sending a broken image', () => {
    const { imageUrl: _ignored, ...noPhoto } = pilau
    const message = buildItemAddedMessage(
      '+254700000001',
      { item: noPhoto, quantity: 2 },
      [noPhoto],
      [{ itemId: 'item-1', quantity: 2 }],
    )
    if (message.interactive.type !== 'button') throw new Error('expected a button message')

    expect(message.interactive.header).toBeUndefined()
    expect(message.interactive.body.text).toContain('*2 × Pilau*')
  })

  it('clips a large cart instead of throwing away the whole message', () => {
    const many = Array.from({ length: 40 }, (_, index) => ({
      ...pilau,
      id: `item-${index}`,
      name: `Very long dish name number ${index}`,
    }))
    const cart = many.map((item) => ({ itemId: item.id, quantity: 2 }))

    const message = buildItemAddedMessage('+254700000001', { item: many[0]!, quantity: 2 }, many, cart)
    if (message.interactive.type !== 'button') throw new Error('expected a button message')

    expect(message.interactive.body.text.length).toBeLessThanOrEqual(1024)
    expect(message.interactive.action.buttons).toHaveLength(2)
  })

  it('keeps every reply button inside Meta 20-character title limit', () => {
    const buttons = [
      buildItemAddedMessage('+254700000001', { item: pilau, quantity: 1 }, [pilau], [
        { itemId: 'item-1', quantity: 1 },
      ]),
      buildConsentButtons('+254700000001'),
    ].flatMap((message) =>
      message.interactive.type === 'button' ? message.interactive.action.buttons : [],
    )

    expect(buttons.length).toBeGreaterThan(0)
    for (const button of buttons) expect(button.reply.title.length).toBeLessThanOrEqual(20)
  })
})

describe('order summary', () => {
  const order = {
    reference: 'HF-20260727-0042',
    tableNumber: 1,
    customerName: 'Paul kinyatti',
    totalKes: 300,
    placedAt: Date.UTC(2026, 6, 27, 9, 52),
    lines: [{ nameSnapshot: 'Pilau', quantity: 1, priceKesSnapshot: 300 }],
  }

  it('renders the reference, lines, total and configured payment methods', () => {
    const text = formatOrderSummary(order, {
      acceptedPaymentMethods: ['cash', 'mpesa'],
      mpesaTillNumber: '567123',
    })
    expect(text).toContain('*#0042*')
    expect(text).toContain('1 × Pilau')
    expect(text).toContain('*TOTAL:  KES 300*')
    expect(text).toContain('• Cash')
    expect(text).toContain('• M-Pesa Till 567123')
  })

  it('never asserts payment, and carries the bilingual disclaimer', () => {
    const text = formatOrderSummary(order, { acceptedPaymentMethods: ['cash'] })
    expect(text).toContain('_This is an order summary, not a payment receipt._')
    expect(text).toContain('_Hii ni muhtasari wa oda, si risiti ya malipo._')
    expect(text).not.toMatch(/\bpaid\b|payment received|thank you for your payment/i)
  })

  it('still explains how to pay when no methods are configured', () => {
    const text = formatOrderSummary(order)
    expect(text).toContain('*HOW TO PAY*')
    expect(text).toContain('Please pay at the counter')
  })
})

describe('order placed message', () => {
  it('leads with the order number and does not claim payment', () => {
    const text = formatOrderPlaced(1, 300, 'HF-20260727-0042')
    expect(text).toContain('*Order no:*  #0042')
    expect(text).toContain('*Total:*  KES 300')
    expect(text).not.toMatch(/\bpaid\b/i)
  })
})

describe('order summary dispatch', () => {
  function summary(overrides: Partial<PendingOrderSummary> = {}): PendingOrderSummary {
    return {
      orderId: 'order-1',
      phone: '+254700000001',
      reference: 'HF-20260727-0042',
      tableNumber: 1,
      customerName: 'Paul kinyatti',
      totalKes: 300,
      placedAt: Date.UTC(2026, 6, 27, 9, 52),
      lines: [{ nameSnapshot: 'Pilau', quantity: 1, priceKesSnapshot: 300 }],
      payment: { acceptedPaymentMethods: ['cash'] },
      ...overrides,
    }
  }

  function harness(pending: PendingOrderSummary[], overrides: { claimed?: boolean } = {}) {
    const sent: OutboundMessage[] = []
    const uploaded: Array<{ bytes: Uint8Array; filename: string; mimeType: string }> = []
    const confirmOrderSummary = vi.fn(async () => true)
    return {
      sent,
      uploaded,
      confirmOrderSummary,
      dependencies: {
        store: {
          pendingOrderSummaries: vi.fn(async () => pending),
          claimOrderSummary: vi.fn(async () => overrides.claimed ?? true),
          confirmOrderSummary,
        },
        sender: {
          async send(message: OutboundMessage) {
            sent.push(message)
          },
          async sendText() {},
          async uploadMedia(bytes: Uint8Array, filename: string, mimeType: string) {
            uploaded.push({ bytes, filename, mimeType })
            return 'media-1'
          },
        },
      },
    }
  }

  it('uploads a real PDF and sends it as a document with the confirmation as caption', async () => {
    const { sent, uploaded, dependencies } = harness([summary()])

    expect(await dispatchOrderSummaries(env, dependencies)).toBe(1)

    expect(uploaded).toHaveLength(1)
    expect(uploaded[0]?.mimeType).toBe('application/pdf')
    expect(uploaded[0]?.filename).toBe('HF-20260727-0042.pdf')
    // A real PDF, not a stub: check the magic bytes.
    expect(new TextDecoder().decode(uploaded[0]!.bytes.slice(0, 5))).toBe('%PDF-')
    expect(uploaded[0]!.bytes.byteLength).toBeGreaterThan(500)

    expect(sent).toHaveLength(1)
    const message = sent[0]
    if (message?.type !== 'document') throw new Error('expected a document message')
    expect(message.document.id).toBe('media-1')
    expect(message.document.filename).toBe('HF-20260727-0042.pdf')
    expect(message.document.caption).toContain('*Your order #0042 is confirmed*')
    expect(message.document.caption).toContain('head over to the counter')
  })

  it('stays under the 100 MB WhatsApp document ceiling for a large order', async () => {
    const lines = Array.from({ length: 60 }, (_, index) => ({
      nameSnapshot: `Dish number ${index}`,
      quantity: 3,
      priceKesSnapshot: 450,
    }))
    const { uploaded, dependencies } = harness([summary({ lines, totalKes: 81_000 })])

    await dispatchOrderSummaries(env, dependencies)
    expect(uploaded[0]!.bytes.byteLength).toBeLessThan(1_000_000)
  })

  it('skips an order whose claim was refused', async () => {
    const { sent, uploaded, confirmOrderSummary, dependencies } = harness([summary()], {
      claimed: false,
    })

    expect(await dispatchOrderSummaries(env, dependencies)).toBe(0)
    expect(sent).toHaveLength(0)
    expect(uploaded).toHaveLength(0)
    expect(confirmOrderSummary).not.toHaveBeenCalled()
  })

  it('returns zero without throwing when Convex is unreachable', async () => {
    const dependencies = {
      store: {
        pendingOrderSummaries: vi.fn(async () => {
          throw new Error('convex unreachable')
        }),
        claimOrderSummary: vi.fn(async () => true),
        confirmOrderSummary: vi.fn(async () => true),
      },
      sender: {
        async send() {},
        async sendText() {},
        uploadMedia: async () => 'media-1',
      },
    }

    expect(await dispatchOrderSummaries(env, dependencies)).toBe(0)
  })
})
