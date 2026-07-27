import type { RuntimeEnv } from '../env'
import type { OutboundMessage } from './types'
import { paginateText } from './templates'

/**
 * A non-2xx response from the Graph API, carrying Meta's own error body.
 *
 * The status code alone cannot tell an expired access token apart from a wrong phone number id or a
 * closed customer service window, and those three have completely different fixes. Meta puts the
 * distinguishing detail in the response body, so it is parsed here rather than discarded.
 */
export class WhatsAppApiError extends Error {
  readonly status: number
  readonly code?: number
  readonly subcode?: number
  readonly detail?: string

  constructor(
    operation: string,
    status: number,
    graph?: { code?: number; subcode?: number; message?: string },
  ) {
    const suffix = graph?.message ? `: ${graph.message}` : ''
    super(`WhatsApp ${operation} failed with status ${status}${suffix}`)
    this.name = 'WhatsAppApiError'
    this.status = status
    if (graph?.code !== undefined) this.code = graph.code
    if (graph?.subcode !== undefined) this.subcode = graph.subcode
    if (graph?.message !== undefined) this.detail = graph.message
  }

  /**
   * Meta returns code 190 for an access token that is expired, revoked, or issued for another app,
   * and code 100 / subcode 33 when the phone number id does not resolve for this token. Both mean
   * every outbound send will keep failing until the credentials are replaced, so they are worth
   * separating from a transient per-message failure.
   */
  get isCredentialFailure(): boolean {
    return (
      this.code === 190 ||
      this.status === 401 ||
      (this.code === 100 && this.subcode === 33) ||
      this.code === 200
    )
  }
}

async function graphError(operation: string, response: Response): Promise<WhatsAppApiError> {
  let body: { error?: { code?: number; error_subcode?: number; message?: string } } | undefined
  try {
    body = (await response.json()) as typeof body
  } catch {
    // A non-JSON error body (a gateway page, for instance) still leaves the status usable.
  }
  const error = body?.error
  return new WhatsAppApiError(operation, response.status, {
    ...(error?.code !== undefined ? { code: error.code } : {}),
    ...(error?.error_subcode !== undefined ? { subcode: error.error_subcode } : {}),
    ...(error?.message !== undefined ? { message: error.message } : {}),
  })
}

/**
 * Flattens any thrown value into log fields. `credentialsRejected` is the field to alert on: it
 * means no diner will get a reply until the token or phone number id is replaced, which is not
 * something the retry paths can recover from on their own.
 */
export function describeSendFailure(error: unknown): Record<string, unknown> {
  if (error instanceof WhatsAppApiError) {
    return {
      error: error.detail ?? error.message,
      status: error.status,
      ...(error.code !== undefined ? { graphCode: error.code } : {}),
      ...(error.subcode !== undefined ? { graphSubcode: error.subcode } : {}),
      ...(error.isCredentialFailure ? { credentialsRejected: true } : {}),
    }
  }
  return { error: error instanceof Error ? error.message : 'unknown error' }
}

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
    if (!response.ok) throw await graphError(`send (${message.type})`, response)
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
      if (!response.ok) throw await graphError('media upload', response)
      const payload = (await response.json()) as { id?: string }
      if (!payload.id) throw new Error('WhatsApp media upload returned no media id')
      return payload.id
    },
  }
}
