import type { InboundMessage } from './types'

type JsonObject = Record<string, unknown>

function object(value: unknown): JsonObject | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as JsonObject)
    : undefined
}

function string(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function parseMessage(value: unknown): InboundMessage | undefined {
  const message = object(value)
  if (!message) return undefined
  const wamid = string(message.id)
  const from = string(message.from)
  if (!wamid || !from) return undefined

  const textBody = string(object(message.text)?.body)
  if (textBody !== undefined) {
    return {
      wamid,
      from,
      kind: 'text',
      text: textBody.trim(),
      ...(string(message.timestamp)
        ? { receivedAt: Number(string(message.timestamp)) * 1000 }
        : {}),
    }
  }

  const interactive = object(message.interactive)
  const reply = object(interactive?.list_reply) ?? object(interactive?.button_reply)
  const selectionId = string(reply?.id)
  const title = string(reply?.title)
  if (!selectionId || !title) return undefined
  return {
    wamid,
    from,
    kind: 'interactive',
    text: title.trim(),
    selectionId,
    ...(string(message.timestamp)
      ? { receivedAt: Number(string(message.timestamp)) * 1000 }
      : {}),
  }
}

export function parseWhatsAppPayload(payload: unknown): InboundMessage[] {
  const root = object(payload)
  const messages: InboundMessage[] = []
  for (const entryValue of array(root?.entry)) {
    const entry = object(entryValue)
    for (const changeValue of array(entry?.changes)) {
      const change = object(changeValue)
      const value = object(change?.value)
      for (const messageValue of array(value?.messages)) {
        const parsed = parseMessage(messageValue)
        if (parsed) messages.push(parsed)
      }
    }
  }
  return messages
}
