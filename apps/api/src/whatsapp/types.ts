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

export type OutboundMessage = TextMessage | InteractiveListMessage
