import type { ItemCategory, MarketingConsent, SessionState } from '@heavenly/types'
import { ConvexHttpClient } from 'convex/browser'
import { makeFunctionReference } from 'convex/server'
import type { CartLine, ConversationSession, MenuItem } from './whatsapp/types'
import type { OrderSummary, PaymentConfig } from './whatsapp/templates'

const claimRef = makeFunctionReference<
  'mutation',
  { wamid: string },
  { claimed: boolean; expiresAt: number }
>('messages:claim')
const getSessionRef = makeFunctionReference<
  'query',
  { restaurantId: string; phone: string },
  ConversationSession | null
>('sessions:get')
const receiveRef = makeFunctionReference<
  'mutation',
  { restaurantId: string; phone: string; language?: 'en' | 'sw' },
  string
>('sessions:receive')
const bindTableRef = makeFunctionReference<
  'mutation',
  { restaurantId: string; phone: string; tableNumber: number },
  null
>('sessions:bindTable')
const transitionRef = makeFunctionReference<
  'mutation',
  { restaurantId: string; phone: string; state: SessionState },
  null
>('sessions:transition')
const setCustomerNameRef = makeFunctionReference<
  'mutation',
  { restaurantId: string; phone: string; customerName: string },
  null
>('sessions:setCustomerName')
const setConsentRef = makeFunctionReference<
  'mutation',
  {
    restaurantId: string
    phone: string
    consent: MarketingConsent
    explicitOverride?: boolean
  },
  null
>('sessions:setConsent')
const addToCartRef = makeFunctionReference<
  'mutation',
  { restaurantId: string; phone: string; itemId: string; quantity: number },
  null
>('sessions:addToCart')
const removeFromCartRef = makeFunctionReference<
  'mutation',
  { restaurantId: string; phone: string; itemId: string },
  null
>('sessions:removeFromCart')
const cancelCartRef = makeFunctionReference<
  'mutation',
  { restaurantId: string; phone: string },
  { cancelled: boolean; reason?: string }
>('sessions:cancelCart')
const availableItemsRef = makeFunctionReference<
  'query',
  { restaurantId: string; category?: ItemCategory },
  ConvexMenuItem[]
>('items:available')
const placeOrderRef = makeFunctionReference<
  'mutation',
  { restaurantId: string; phone: string },
  { orderId: string; totalKes: number; reference?: string }
>('orders:placeFromSession')
const recommendationRef = makeFunctionReference<
  'query',
  { restaurantId: string; budgetKes?: number; category?: string },
  ConvexMenuItem[]
>('orders:recommendations')
const submitFeedbackRef = makeFunctionReference<
  'mutation',
  { restaurantId: string; orderId: string; phone: string; rating: number },
  string
>('feedback:submit')
const addFeedbackCommentRef = makeFunctionReference<
  'mutation',
  { restaurantId: string; orderId: string; phone: string; comment: string },
  null
>('feedback:addComment')
const pendingFeedbackPromptsRef = makeFunctionReference<
  'query',
  { restaurantId: string; limit?: number },
  FeedbackPrompt[]
>('sessions:pendingFeedbackPrompts')
const claimFeedbackPromptRef = makeFunctionReference<
  'mutation',
  { restaurantId: string; phone: string; orderId: string },
  boolean
>('sessions:claimFeedbackPrompt')
const confirmFeedbackPromptRef = makeFunctionReference<
  'mutation',
  { restaurantId: string; phone: string; orderId: string },
  boolean
>('sessions:confirmFeedbackPrompt')

export type FeedbackPrompt = {
  phone: string
  orderId: string
  /** 1-based delivery attempt this row represents, for logging. */
  attempt: number
}

export type PendingOrderSummary = OrderSummary & {
  orderId: string
  phone: string
  payment: PaymentConfig
}

const pendingOrderSummariesRef = makeFunctionReference<
  'query',
  { restaurantId: string; limit?: number },
  PendingOrderSummary[]
>('orders:pendingOrderSummaries')
const claimOrderSummaryRef = makeFunctionReference<
  'mutation',
  { restaurantId: string; orderId: string },
  boolean
>('orders:claimOrderSummary')
const confirmOrderSummaryRef = makeFunctionReference<
  'mutation',
  { restaurantId: string; orderId: string },
  boolean
>('orders:confirmOrderSummary')

type ConvexMenuItem = Omit<MenuItem, 'id' | 'recentOrderCount'> & {
  _id: string
  recentOrderCount?: number
  imageUrl?: string | null
}

export type RecommendationConstraints = {
  budgetKes?: number
  category?: ItemCategory
}

export type PlaceOrderInput = {
  restaurantId: string
  phone: string
}

export function toPlaceOrderInput(input: PlaceOrderInput): PlaceOrderInput {
  return { restaurantId: input.restaurantId, phone: input.phone }
}

export interface BotStore {
  claimWamid(wamid: string): Promise<boolean>
  receive(phone: string, language?: 'en' | 'sw'): Promise<void>
  getSession(phone: string): Promise<ConversationSession | null>
  bindTable(phone: string, tableNumber: number): Promise<void>
  transition(phone: string, state: SessionState): Promise<void>
  setCustomerName(phone: string, customerName: string): Promise<void>
  setConsent(phone: string, consent: Exclude<MarketingConsent, 'unasked'>, explicitOverride?: boolean): Promise<void>
  addToCart(phone: string, itemId: string, quantity: number): Promise<void>
  removeFromCart(phone: string, itemId: string): Promise<void>
  cancelCart(phone: string): Promise<{ cancelled: boolean; reason?: string }>
  listAvailableItems(category?: ItemCategory): Promise<MenuItem[]>
  placeOrder(phone: string): Promise<{ orderId: string; totalKes: number; reference?: string }>
  recommendations(constraints: RecommendationConstraints): Promise<MenuItem[]>
  submitFeedback(orderId: string, phone: string, rating: number): Promise<string>
  addFeedbackComment(orderId: string, phone: string, comment: string): Promise<void>
  pendingFeedbackPrompts(limit?: number): Promise<FeedbackPrompt[]>
  claimFeedbackPrompt(phone: string, orderId: string): Promise<boolean>
  confirmFeedbackPrompt(phone: string, orderId: string): Promise<boolean>
  pendingOrderSummaries(limit?: number): Promise<PendingOrderSummary[]>
  claimOrderSummary(orderId: string): Promise<boolean>
  confirmOrderSummary(orderId: string): Promise<boolean>
}

function mapItem(item: ConvexMenuItem): MenuItem {
  return {
    id: String(item._id),
    name: item.name,
    ...(item.nameSwahili ? { nameSwahili: item.nameSwahili } : {}),
    ...(item.description ? { description: item.description } : {}),
    category: item.category,
    priceKes: item.priceKes,
    available: item.available,
    archived: item.archived,
    ...(item.quantityOnHand !== undefined ? { quantityOnHand: item.quantityOnHand } : {}),
    ...(item.recentOrderCount !== undefined ? { recentOrderCount: item.recentOrderCount } : {}),
    // Meta fetches header images by URL, so only absolute https links are usable.
    ...(item.imageUrl?.startsWith('https://') ? { imageUrl: item.imageUrl } : {}),
  }
}

export function createBotStore(convexUrl: string, restaurantId: string): BotStore {
  const client = new ConvexHttpClient(convexUrl, { logger: false, fetch })
  return {
    async claimWamid(wamid) {
      const result = await client.mutation(claimRef, { wamid })
      return result.claimed
    },
    async receive(phone, language) {
      await client.mutation(receiveRef, {
        restaurantId,
        phone,
        ...(language ? { language } : {}),
      })
    },
    async getSession(phone) {
      return await client.query(getSessionRef, { restaurantId, phone })
    },
    async bindTable(phone, tableNumber) {
      await client.mutation(bindTableRef, { restaurantId, phone, tableNumber })
    },
    async transition(phone, state) {
      await client.mutation(transitionRef, { restaurantId, phone, state })
    },
    async setCustomerName(phone, customerName) {
      await client.mutation(setCustomerNameRef, { restaurantId, phone, customerName })
    },
    async setConsent(phone, consent, explicitOverride) {
      await client.mutation(setConsentRef, {
        restaurantId,
        phone,
        consent,
        ...(explicitOverride !== undefined ? { explicitOverride } : {}),
      })
    },
    async addToCart(phone, itemId, quantity) {
      await client.mutation(addToCartRef, { restaurantId, phone, itemId, quantity })
    },
    async removeFromCart(phone, itemId) {
      await client.mutation(removeFromCartRef, { restaurantId, phone, itemId })
    },
    async cancelCart(phone) {
      return await client.mutation(cancelCartRef, { restaurantId, phone })
    },
    async listAvailableItems(category) {
      const items = await client.query(availableItemsRef, {
        restaurantId,
        ...(category ? { category } : {}),
      })
      return items.map(mapItem)
    },
    async placeOrder(phone) {
      return await client.mutation(placeOrderRef, toPlaceOrderInput({ restaurantId, phone }))
    },
    async recommendations(constraints) {
      const items = await client.query(recommendationRef, {
        restaurantId,
        ...(constraints.budgetKes !== undefined ? { budgetKes: constraints.budgetKes } : {}),
        ...(constraints.category ? { category: constraints.category } : {}),
      })
      return items.map(mapItem)
    },
    async submitFeedback(orderId, phone, rating) {
      return await client.mutation(submitFeedbackRef, {
        restaurantId,
        orderId,
        phone,
        rating,
      })
    },
    async addFeedbackComment(orderId, phone, comment) {
      await client.mutation(addFeedbackCommentRef, {
        restaurantId,
        orderId,
        phone,
        comment,
      })
    },
    async pendingFeedbackPrompts(limit) {
      return await client.query(pendingFeedbackPromptsRef, {
        restaurantId,
        ...(limit !== undefined ? { limit } : {}),
      })
    },
    async claimFeedbackPrompt(phone, orderId) {
      return await client.mutation(claimFeedbackPromptRef, { restaurantId, phone, orderId })
    },
    async confirmFeedbackPrompt(phone, orderId) {
      return await client.mutation(confirmFeedbackPromptRef, { restaurantId, phone, orderId })
    },
    async pendingOrderSummaries(limit) {
      return await client.query(pendingOrderSummariesRef, {
        restaurantId,
        ...(limit !== undefined ? { limit } : {}),
      })
    },
    async claimOrderSummary(orderId) {
      return await client.mutation(claimOrderSummaryRef, { restaurantId, orderId })
    },
    async confirmOrderSummary(orderId) {
      return await client.mutation(confirmOrderSummaryRef, { restaurantId, orderId })
    },
  }
}
