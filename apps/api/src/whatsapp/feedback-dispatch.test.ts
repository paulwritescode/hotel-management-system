import { describe, expect, it, vi } from 'vitest'
import type { RuntimeEnv } from '../env'
import type { FeedbackPrompt } from '../convex'
import { dispatchFeedbackPrompts } from './processor'
import type { OutboundMessage } from './types'

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

function prompt(overrides: Partial<FeedbackPrompt> = {}): FeedbackPrompt {
  return { phone: '+254700000001', orderId: 'order-1', attempt: 1, ...overrides }
}

function harness(
  pending: FeedbackPrompt[],
  overrides: { claimed?: boolean; sendFails?: boolean } = {},
) {
  const sent: OutboundMessage[] = []
  const claimFeedbackPrompt = vi.fn(async () => overrides.claimed ?? true)
  const confirmFeedbackPrompt = vi.fn(async () => true)
  return {
    sent,
    claimFeedbackPrompt,
    confirmFeedbackPrompt,
    dependencies: {
      store: {
        pendingFeedbackPrompts: vi.fn(async () => pending),
        claimFeedbackPrompt,
        confirmFeedbackPrompt,
      },
      sender: {
        async send(message: OutboundMessage) {
          if (overrides.sendFails) throw new Error('graph api down')
          sent.push(message)
        },
        async sendText() {},
        async uploadMedia() {
          return 'media-1'
        },
      },
    },
  }
}

describe('feedback prompt dispatch', () => {
  it('sends one rating list per pending session', async () => {
    const { sent, dependencies } = harness([
      prompt(),
      prompt({ phone: '+254700000002', orderId: 'order-2' }),
    ])

    expect(await dispatchFeedbackPrompts(env, dependencies)).toBe(2)
    expect(sent).toHaveLength(2)
    const first = sent[0]
    expect(first).toMatchObject({ to: '+254700000001', type: 'interactive' })
    if (first?.type !== 'interactive' || first.interactive.type !== 'list') {
      throw new Error('expected an interactive rating list')
    }
    expect(first.interactive.action.sections[0]?.rows.map((row) => row.id)).toEqual([
      'rating:order-1:1',
      'rating:order-1:2',
      'rating:order-1:3',
      'rating:order-1:4',
      'rating:order-1:5',
    ])
  })

  it('confirms delivery only after the send succeeds', async () => {
    const { confirmFeedbackPrompt, claimFeedbackPrompt, dependencies } = harness([prompt()])

    await dispatchFeedbackPrompts(env, dependencies)

    expect(claimFeedbackPrompt).toHaveBeenCalledWith('+254700000001', 'order-1')
    expect(confirmFeedbackPrompt).toHaveBeenCalledWith('+254700000001', 'order-1')
    expect(claimFeedbackPrompt.mock.invocationCallOrder[0]).toBeLessThan(
      confirmFeedbackPrompt.mock.invocationCallOrder[0] ?? 0,
    )
  })

  it('claims an attempt but does not confirm when the send fails, leaving it retryable', async () => {
    const { sent, claimFeedbackPrompt, confirmFeedbackPrompt, dependencies } = harness([prompt()], {
      sendFails: true,
    })

    expect(await dispatchFeedbackPrompts(env, dependencies)).toBe(0)
    expect(sent).toHaveLength(0)
    expect(claimFeedbackPrompt).toHaveBeenCalledWith('+254700000001', 'order-1')
    expect(confirmFeedbackPrompt).not.toHaveBeenCalled()
  })

  it('skips a session whose claim was refused, so exhausted attempts stop re-sending', async () => {
    const { sent, confirmFeedbackPrompt, dependencies } = harness([prompt({ attempt: 4 })], {
      claimed: false,
    })

    expect(await dispatchFeedbackPrompts(env, dependencies)).toBe(0)
    expect(sent).toHaveLength(0)
    expect(confirmFeedbackPrompt).not.toHaveBeenCalled()
  })

  it('keeps draining the batch after one session fails', async () => {
    const sent: OutboundMessage[] = []
    const dependencies = {
      store: {
        pendingFeedbackPrompts: vi.fn(async () => [
          prompt({ phone: '+254700000001', orderId: 'order-1' }),
          prompt({ phone: '+254700000002', orderId: 'order-2' }),
        ]),
        claimFeedbackPrompt: vi.fn(async (phone: string) => {
          if (phone === '+254700000001') throw new Error('convex hiccup')
          return true
        }),
        confirmFeedbackPrompt: vi.fn(async () => true),
      },
      sender: {
        async send(message: OutboundMessage) {
          sent.push(message)
        },
        async sendText() {},
        async uploadMedia() {
          return 'media-1'
        },
      },
    }

    expect(await dispatchFeedbackPrompts(env, dependencies)).toBe(1)
    expect(sent).toHaveLength(1)
    expect(sent[0]).toMatchObject({ to: '+254700000002' })
  })

  it('returns zero without throwing when Convex is unreachable', async () => {
    const dependencies = {
      store: {
        pendingFeedbackPrompts: vi.fn(async () => {
          throw new Error('convex unreachable')
        }),
        claimFeedbackPrompt: vi.fn(async () => true),
        confirmFeedbackPrompt: vi.fn(async () => true),
      },
      sender: { async send() {}, async sendText() {}, uploadMedia: async () => 'media-1' },
    }

    expect(await dispatchFeedbackPrompts(env, dependencies)).toBe(0)
  })

  it('does nothing when no session is awaiting a prompt', async () => {
    const { sent, dependencies } = harness([])
    expect(await dispatchFeedbackPrompts(env, dependencies)).toBe(0)
    expect(sent).toHaveLength(0)
  })
})
