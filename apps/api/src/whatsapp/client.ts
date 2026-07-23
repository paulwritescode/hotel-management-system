import type { RuntimeEnv } from '../env'
import type { OutboundMessage } from './types'
import { paginateText } from './templates'

export type WhatsAppSender = {
  send(message: OutboundMessage): Promise<void>
  sendText(to: string, text: string): Promise<void>
}

export function createWhatsAppClient(
  env: RuntimeEnv,
  fetcher: typeof fetch = fetch,
): WhatsAppSender {
  const endpoint = `https://graph.facebook.com/v21.0/${encodeURIComponent(env.phoneNumberId)}/messages`

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
  }
}
