import { describe, expect, it } from 'vitest'
import { parseWhatsAppPayload } from './payload'

describe('parseWhatsAppPayload', () => {
  it('extracts text and interactive replies and ignores status events', () => {
    const payload = {
      entry: [
        {
          changes: [
            {
              value: {
                statuses: [{ id: 'status-only' }],
                messages: [
                  { id: 'wamid.1', from: '254700000001', timestamp: '1700000000', text: { body: ' Table 7 ' } },
                  { id: 'wamid.2', from: '254700000002', interactive: { list_reply: { id: 'item:abc', title: '1. Pilau' } } },
                ],
              },
            },
          ],
        },
      ],
    }

    expect(parseWhatsAppPayload(payload)).toEqual([
      { wamid: 'wamid.1', from: '254700000001', kind: 'text', text: 'Table 7', receivedAt: 1_700_000_000_000 },
      { wamid: 'wamid.2', from: '254700000002', kind: 'interactive', text: '1. Pilau', selectionId: 'item:abc' },
    ])
  })
})
