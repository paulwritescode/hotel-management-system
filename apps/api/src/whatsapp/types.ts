import type { ItemCategory, MarketingConsent, SessionState } from '@heavenly/types'

export type MenuItem = {
  id: string
  name: string
  nameSwahili?: string
  description?: string
  category: ItemCategory
  priceKes: number
  available: boolean
  archived: boolean
  quantityOnHand?: number
  recentOrderCount?: number
  /** Resolved by Convex from imageStorageId, falling back to externalImageUrl. */
  imageUrl?: string
}

export type CartLine = {
  itemId: string
  quantity: number
}

export type ConversationSession = {
  phone: string
  state: SessionState
  tableNumber?: number
  customerName?: string
  language: 'en' | 'sw'
  cart: CartLine[]
  activeOrderId?: string
  marketingConsent: MarketingConsent
  marketingConsentPrompted?: boolean
  currentCategory?: ItemCategory
  menuPage?: number
  feedbackId?: string
  awaitingFeedbackComment?: boolean
  lastMessageAt: number
  expiresAt: number
}

export type InboundMessage = {
  wamid: string
  from: string
  kind: 'text' | 'interactive'
  text: string
  selectionId?: string
  receivedAt?: number
}

export type TextMessage = {
  messaging_product: 'whatsapp'
  to: string
  type: 'text'
  text: { body: string }
}

export type InteractiveListMessage = {
  messaging_product: 'whatsapp'
  to: string
  type: 'interactive'
  interactive: {
    type: 'list'
    body: { text: string }
    action: {
      button: string
      sections: Array<{
        title: string
        rows: Array<{ id: string; title: string; description?: string }>
      }>
    }
  }
}

/**
 * Interactive reply buttons. Meta caps these at three buttons of 20 characters each; an optional
 * image header lets one message carry a dish photo, its formatted caption, and the next actions
 * together, which a plain image message cannot do.
 */
export type InteractiveButtonMessage = {
  messaging_product: 'whatsapp'
  to: string
  type: 'interactive'
  interactive: {
    type: 'button'
    header?: { type: 'image'; image: { link: string } }
    body: { text: string }
    footer?: { text: string }
    action: {
      buttons: Array<{ type: 'reply'; reply: { id: string; title: string } }>
    }
  }
}

export type ImageMessage = {
  messaging_product: 'whatsapp'
  to: string
  type: 'image'
  image: { link: string; caption?: string }
}

/**
 * Sent by media `id` rather than a public `link`: the summary carries a diner's name and order, so
 * uploading the bytes straight to Meta avoids ever exposing it at a fetchable URL.
 */
export type DocumentMessage = {
  messaging_product: 'whatsapp'
  to: string
  type: 'document'
  document: { id: string; filename: string; caption?: string }
}

export type OutboundMessage =
  | TextMessage
  | InteractiveListMessage
  | InteractiveButtonMessage
  | ImageMessage
  | DocumentMessage
