import type { RuntimeEnv } from '../env'
import type { OutboundMessage } from './types'
import { paginateText } from './templates'

export type WhatsAppSender = {
  send(message: OutboundMessage): Promise<void>
  sendText(to: string, text: string): Promise<void>
  /** Uploads bytes to Meta and returns the media id to reference in a document/image message. */
  uploadMedia(bytes: Uint8Array, filename: string, mimeType: string): Promise<string>
}

export function createWhatsAppClient(
  env: RuntimeEnv,
  fetcher: typeof fetch = fetch,
): WhatsAppSender {
  const base = `https://graph.facebook.com/v21.0/${encodeURIComponent(env.phoneNumberId)}`
  const endpoint = `${base}/messages`

  async function send(message: OutboundMessage): Promise<void> {
    const response = await fetcher(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.whatsappToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    })
    if (!response.ok) {
      throw new Error(`WhatsApp Graph API request failed with status ${response.status}`)
    }
  }

  return {
    send,
    async sendText(to, text) {
      for (const body of paginateText(text)) {
        await send({ messaging_product: 'whatsapp', to, type: 'text', text: { body } })
      }
    },
    async uploadMedia(bytes, filename, mimeType) {
      const form = new FormData()
      form.append('messaging_product', 'whatsapp')
      form.append('type', mimeType)
      // Copy into a fresh buffer: a Uint8Array view over a larger ArrayBuffer would otherwise
      // upload the whole backing store.
      form.append('file', new Blob([bytes.slice().buffer as ArrayBuffer], { type: mimeType }), filename)

      const response = await fetcher(`${base}/media`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.whatsappToken}` },
        body: form,
      })
      if (!response.ok) {
        throw new Error(`WhatsApp media upload failed with status ${response.status}`)
      }
      const payload = (await response.json()) as { id?: string }
      if (!payload.id) throw new Error('WhatsApp media upload returned no media id')
      return payload.id
    },
  }
}
