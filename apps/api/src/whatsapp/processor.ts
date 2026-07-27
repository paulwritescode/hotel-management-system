import type { ItemCategory, MarketingConsent } from '@heavenly/types'
import { createBotStore, type BotStore, type RecommendationConstraints } from '../convex'
import type { RuntimeEnv } from '../env'
import { phraseRecommendations } from '../llm/recommend'
import { createWhatsAppClient, describeSendFailure, type WhatsAppSender } from './client'
import { parseGlobalCommand } from './machine'
import { parseWhatsAppPayload } from './payload'
import {
  buildCartActions,
  buildCategoryList,
  buildConsentButtons,
  buildItemAddedMessage,
  buildMenuLists,
  buildRatingList,
  categoryFromNumber,
  formatOrderConfirmed,
  formatOrderPlaced,
  type ImageHeader,
} from './templates'
import {
  buildOrderSummaryPdf,
  orderSummaryFilename,
  type ReceiptPaymentConfig,
} from '@heavenly/receipt'
import type { PaymentConfig } from './templates'
import type { ConversationSession, InboundMessage, MenuItem } from './types'

const SESSION_TTL_MS = 30 * 60 * 1000
const TABLE_PATTERN = /^table\s*(\d{1,3})$/i
const CATEGORY_VALUES: ItemCategory[] = [
  'staple',
  'vegetable',
  'meat',
  'bread',
  'drink',
  'dessert',
  'side',
]

export type InboundDependencies = {
  env: RuntimeEnv
  store: BotStore
  sender: WhatsAppSender
  phrase(items: MenuItem[], apiKey: string | undefined): Promise<string>
}

export function parseTableNumber(text: string): number | undefined {
  const match = TABLE_PATTERN.exec(text.trim())
  if (!match?.[1]) return undefined
  const value = Number(match[1])
  return value >= 1 && value <= 999 ? value : undefined
}

function normalizePhone(phone: string): string {
  const trimmed = phone.trim()
  return trimmed.startsWith('+') ? trimmed : `+${trimmed}`
}

function categorySelection(
  message: InboundMessage,
  allowBareNumber: boolean,
): ItemCategory | undefined {
  if (message.selectionId?.startsWith('category:')) {
    const value = message.selectionId.slice('category:'.length) as ItemCategory
    return CATEGORY_VALUES.includes(value) ? value : undefined
  }
  const normalized = message.text.trim().toLowerCase()
  if (CATEGORY_VALUES.includes(normalized as ItemCategory)) return normalized as ItemCategory
  const numbered = /^(?:category\s+)?(\d+)$/.exec(normalized)
  if (!numbered?.[1] || (!allowBareNumber && !normalized.startsWith('category'))) {
    return undefined
  }
  return categoryFromNumber(numbered[1])
}

function recommendationRequest(text: string): RecommendationConstraints | undefined {
  const normalized = text.toLowerCase()
  if (!/\b(recommend|recommendation|suggest|suggestion|something|budget|under|below)\b/.test(normalized)) {
    return undefined
  }
  const budgetMatch = /\b(?:under|below|budget(?:\s+of)?)\s*(?:kes|ksh)?\s*(\d{1,6})\b/.exec(normalized)
  const budgetKes = budgetMatch?.[1] ? Number(budgetMatch[1]) : undefined
  const category = CATEGORY_VALUES.find((value) => new RegExp(`\\b${value}\\b`).test(normalized))
  return {
    ...(budgetKes !== undefined ? { budgetKes } : {}),
    ...(category ? { category } : {}),
  }
}

function requestedItem(
  message: InboundMessage,
  visibleItems: MenuItem[],
): { item: MenuItem; quantity: number } | undefined {
  if (message.selectionId?.startsWith('item:')) {
    const id = message.selectionId.slice('item:'.length)
    const item = visibleItems.find((candidate) => candidate.id === id)
    return item ? { item, quantity: 1 } : undefined
  }
  const match = /^(?:add\s+)?(\d{1,3})(?:\s*(?:x|×)\s*(\d{1,2}))?$/.exec(
    message.text.trim().toLowerCase(),
  )
  if (!match?.[1]) return undefined
  const item = visibleItems[Number(match[1]) - 1]
  const quantity = match[2] ? Number(match[2]) : 1
  if (!item || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 99) return undefined
  return { item, quantity }
}

/** Meta deletes uploaded media after 30 days; refresh comfortably before that. */
const WHATSAPP_MEDIA_TTL_MS = 25 * 24 * 60 * 60 * 1000

/**
 * Resolves the image header for a dish.
 *
 * Sending by `link` makes Meta re-fetch the source on every single send — around a second for the
 * seeded photos — which the diner feels as a pause after choosing an item. So the photo is uploaded
 * to Meta once and referenced by media id thereafter; only the first order of each dish pays.
 *
 * Returns undefined when the dish has no photo, or when anything about fetching or uploading it
 * fails. The caller then sends the same message without a header: a dish with a broken image still
 * gets its cart and buttons through, which matters far more than the picture.
 */
async function resolveImageHeader(
  item: MenuItem,
  store: BotStore,
  sender: WhatsAppSender,
): Promise<ImageHeader | undefined> {
  if (!item.imageUrl) return undefined

  const cachedAt = item.whatsappMediaAt ?? 0
  if (item.whatsappMediaId && Date.now() - cachedAt < WHATSAPP_MEDIA_TTL_MS) {
    return { id: item.whatsappMediaId }
  }

  try {
    const response = await fetch(item.imageUrl)
    if (!response.ok) throw new Error(`image fetch failed with status ${response.status}`)
    const contentType = response.headers.get('content-type') ?? 'image/jpeg'
    const bytes = new Uint8Array(await response.arrayBuffer())
    const mediaId = await sender.uploadMedia(bytes, `${item.id}.jpg`, contentType)
    // Best-effort cache: a failure here only costs the next diner a re-upload.
    await store.setItemWhatsappMedia(item.id, mediaId).catch(() => undefined)
    return { id: mediaId }
  } catch (error) {
    console.error(
      JSON.stringify({
        event: 'item_image_upload_failed',
        itemId: item.id,
        ...describeSendFailure(error),
      }),
    )
    return undefined
  }
}

async function renderMenu(
  phone: string,
  store: BotStore,
  sender: WhatsAppSender,
  category?: ItemCategory,
): Promise<void> {
  if (!category) {
    await sender.send(buildCategoryList(phone))
    return
  }
  const items = await store.listAvailableItems()
  const pages = buildMenuLists(phone, items, category)
  if (pages.length === 0) {
    await sender.sendText(
      phone,
      'No items are available in that category right now. Type menu to choose another category.',
    )
    return
  }
  for (const page of pages) await sender.send(page)
}

async function showCart(
  session: ConversationSession,
  store: BotStore,
  sender: WhatsAppSender,
): Promise<void> {
  if (session.cart.length === 0) {
    await sender.sendText(session.phone, 'Your cart is empty. Type menu to browse available dishes.')
    return
  }
  const items = await store.listAvailableItems()
  await sender.send(buildCartActions(session.phone, items, session.cart))
}

async function freshSession(store: BotStore, phone: string): Promise<ConversationSession> {
  const session = await store.getSession(phone)
  if (!session) throw new Error('Convex did not return the received session')
  return session
}

async function placeOrder(
  session: ConversationSession,
  dependencies: InboundDependencies,
): Promise<void> {
  const { store, sender } = dependencies
  try {
    const result = await store.placeOrder(session.phone)
    await sender.sendText(
      session.phone,
      formatOrderPlaced(session.tableNumber, result.totalKes, result.reference),
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Order placement failed'
    if (/unavailable|ran out|insufficient|stock/i.test(message)) {
      await sender.sendText(
        session.phone,
        `${message}. Reply remove 2 using the cart line number, then confirm again, or cancel to clear the cart.`,
      )
      return
    }
    console.error(JSON.stringify({ event: 'order_placement_failed', error: message }))
    await sender.sendText(
      session.phone,
      'We could not place your order just now. Your cart is safe; reply confirm to try again.',
    )
  }
}

async function handleGlobal(
  message: InboundMessage,
  session: ConversationSession,
  dependencies: InboundDependencies,
): Promise<boolean> {
  const command = parseGlobalCommand(message.text)
  if (!command) return false
  const { store, sender } = dependencies

  if (command === 'help') {
    await sender.sendText(
      session.phone,
      'Commands: menu, cart, cancel, help. You can also ask for a suggestion or say “something under 500”.',
    )
    return true
  }
  if (command === 'menu') {
    await renderMenu(session.phone, store, sender)
    return true
  }
  if (command === 'cart') {
    await showCart(session, store, sender)
    return true
  }

  const result = await store.cancelCart(session.phone)
  await sender.sendText(
    session.phone,
    result.cancelled
      ? 'Your cart has been cleared. Type menu when you are ready to order.'
      : result.reason ?? 'Your order is already placed. Please speak to your waiter to cancel it.',
  )
  return true
}

async function handleFeedback(
  message: InboundMessage,
  session: ConversationSession,
  dependencies: InboundDependencies,
): Promise<boolean> {
  if (session.state !== 'AWAITING_FEEDBACK' || !session.activeOrderId) return false
  const interactive = message.selectionId?.startsWith(`rating:${session.activeOrderId}:`)
    ? message.selectionId.split(':').at(-1)
    : undefined
  const textRating = /^[1-5]$/.test(message.text.trim()) ? message.text.trim() : undefined
  const rating = Number(interactive ?? textRating)

  if (Number.isInteger(rating) && rating >= 1 && rating <= 5) {
    try {
      await dependencies.store.submitFeedback(
        session.activeOrderId,
        session.phone,
        rating,
      )
      await dependencies.sender.sendText(
        session.phone,
        rating <= 3
          ? 'Thank you. What could we have done better? One reply is enough.'
          : 'Thank you for your feedback.',
      )
    } catch (error) {
      console.error(
        JSON.stringify({
          event: 'feedback_rating_failed',
          error: error instanceof Error ? error.message : 'unknown error',
        }),
      )
      await dependencies.sender.sendText(session.phone, 'We could not save that rating. Please try once more.')
    }
    return true
  }

  const comment = message.text.trim().slice(0, 2000)
  if (comment) {
    try {
      await dependencies.store.addFeedbackComment(
        session.activeOrderId,
        session.phone,
        comment,
      )
      await dependencies.sender.sendText(session.phone, 'Thank you. Your comment has been recorded.')
      return true
    } catch {
      // A comment is valid only after a low rating. Fall through to the rating prompt.
    }
  }
  await dependencies.sender.send(buildRatingList(session.phone, session.activeOrderId))
  return true
}

async function removeCartLine(
  message: InboundMessage,
  session: ConversationSession,
  dependencies: InboundDependencies,
): Promise<boolean> {
  const match = /^remove\s+(\d{1,3})$/i.exec(message.text.trim())
  if (!match?.[1]) return false
  const line = session.cart[Number(match[1]) - 1]
  if (!line) {
    await dependencies.sender.sendText(
      session.phone,
      'That cart line does not exist. Type cart to see the current line numbers.',
    )
    return true
  }
  await dependencies.store.removeFromCart(session.phone, line.itemId)
  let updated = await freshSession(dependencies.store, session.phone)
  if (updated.cart.length === 0) {
    await dependencies.store.cancelCart(session.phone)
    updated = await freshSession(dependencies.store, session.phone)
  }
  await dependencies.sender.sendText(session.phone, 'That line has been removed from your cart.')
  await showCart(updated, dependencies.store, dependencies.sender)
  return true
}

async function handleMessage(
  inbound: InboundMessage,
  dependencies: InboundDependencies,
): Promise<void> {
  const { store, sender, env } = dependencies
  if (!(await store.claimWamid(inbound.wamid))) return

  const phone = normalizePhone(inbound.from)
  const message: InboundMessage = { ...inbound, from: phone }
  await store.receive(phone)
  let session = await freshSession(store, phone)

  if (await handleGlobal(message, session, dependencies)) return

  const consentCommand = message.text.trim().toLowerCase()
  if (consentCommand === 'offers on' || consentCommand === 'offers off') {
    const consent: Exclude<MarketingConsent, 'unasked'> =
      consentCommand === 'offers on' ? 'granted' : 'denied'
    await store.setConsent(phone, consent, true)
    await sender.sendText(phone, consent === 'granted' ? 'Offers are on.' : 'Offers are off.')
    return
  }

  if (await handleFeedback(message, session, dependencies)) return
  if (await removeCartLine(message, session, dependencies)) return

  if (session.state === 'GREETED') {
    const entryTable = parseTableNumber(message.text)
    if (entryTable === undefined) {
      await store.transition(phone, 'AWAITING_TABLE')
      await sender.sendText(
        phone,
        'Welcome to Heavenly Foods. Please send your table number exactly like this: Table 7',
      )
    } else {
      await store.bindTable(phone, entryTable)
      await sender.sendText(
        phone,
        `Welcome to Heavenly Foods. You are ordering for table ${entryTable}.`,
      )
      await renderMenu(phone, store, sender)
    }
    return
  }

  if (session.state === 'AWAITING_TABLE') {
    const value = parseTableNumber(message.text)
    if (value === undefined) {
      await sender.sendText(phone, 'That table number was not valid. Please use the exact format Table 7.')
    } else {
      await store.bindTable(phone, value)
      await sender.sendText(phone, `Table ${value} confirmed.`)
      await renderMenu(phone, store, sender)
    }
    return
  }

  // A diner re-scanning the table QR resends "Table N" mid-conversation. Handle it wherever the
  // table still makes sense rather than falling through to "I did not understand that" — the QR is
  // the entry point, so scanning it twice is the single most likely thing a diner does.
  const rescannedTable = parseTableNumber(message.text)

  // An order is already with the kitchen. Re-scanning the QR here is the diner checking in, not
  // starting a second order — the session runs until they rate. Explain where they are instead of
  // answering "I did not understand that"; the next order begins once the rating closes this one.
  if (rescannedTable !== undefined && session.state === 'PLACED') {
    await sender.sendText(
      phone,
      [
        '*Your order is already in* 👨‍🍳',
        '',
        `It is being prepared for table ${session.tableNumber}. We will send your order summary once the counter confirms it, and ask how it was after it is served.`,
        '',
        'You can order again once this order is complete.',
      ].join('\n'),
    )
    return
  }

  // AWAITING_FEEDBACK needs no branch here: handleFeedback runs earlier and already re-sends the
  // rating prompt for anything that is not a rating or a comment.
  if (
    rescannedTable !== undefined &&
    (session.state === 'BROWSING' || session.state === 'CATEGORY' || session.state === 'CART')
  ) {
    if (rescannedTable === session.tableNumber) {
      await sender.sendText(phone, `You are still ordering for table ${rescannedTable}.`)
      if (session.cart.length > 0) {
        await showCart(session, store, sender)
      } else {
        await renderMenu(phone, store, sender)
      }
      return
    }
    await store.bindTable(phone, rescannedTable)
    await sender.sendText(phone, `Moved to table ${rescannedTable}. Your cart is unchanged.`)
    session = await freshSession(store, phone)
    if (session.cart.length > 0) {
      await showCart(session, store, sender)
    } else {
      await renderMenu(phone, store, sender)
    }
    return
  }

  const recommendation = recommendationRequest(message.text)
  if (recommendation) {
    const candidates = (await store.recommendations(recommendation)).slice(0, 3)
    const phrased = await dependencies.phrase(candidates, env.nvidiaApiKey)
    await sender.sendText(phone, phrased)
    return
  }

  const selectedCategory = categorySelection(message, session.state === 'BROWSING')
  if (selectedCategory && (session.state === 'BROWSING' || session.state === 'CATEGORY')) {
    if (session.state === 'BROWSING') await store.transition(phone, 'CATEGORY')
    await renderMenu(phone, store, sender, selectedCategory)
    return
  }

  if (session.state === 'CATEGORY' && message.text.trim().toLowerCase() === 'back') {
    await store.transition(phone, 'BROWSING')
    await renderMenu(phone, store, sender)
    return
  }

  if (session.state === 'BROWSING' || session.state === 'CATEGORY' || session.state === 'CART') {
    const allItems = await store.listAvailableItems()
    const selected = requestedItem(message, allItems)
    if (selected) {
      await store.addToCart(phone, selected.item.id, selected.quantity)
      const [refreshed, image] = await Promise.all([
        freshSession(store, phone),
        resolveImageHeader(selected.item, store, sender),
      ])
      session = refreshed
      await sender.send(buildItemAddedMessage(phone, selected, allItems, session.cart, image))
      return
    }
  }

  if (session.state === 'CART') {
    const normalized = message.text.trim().toLowerCase()
    // Button taps arrive as selectionId; the typed words stay supported so the flow still works
    // for anyone replying by text.
    const tapped = message.selectionId
    if (tapped === 'cart:more' || normalized === 'more' || normalized === 'add more') {
      await store.transition(phone, 'BROWSING')
      await renderMenu(phone, store, sender)
    } else if (tapped === 'cart:confirm' || normalized === 'confirm' || normalized === 'checkout') {
      if (session.cart.length === 0) {
        await store.cancelCart(phone)
        await sender.sendText(phone, 'Your cart is empty. Type menu to add an item first.')
        return
      }
      await store.transition(phone, 'AWAITING_NAME')
      await sender.sendText(
        phone,
        ['*Almost there*', '', 'What name should we put on the order?'].join('\n'),
      )
    } else {
      await sender.sendText(
        phone,
        'Tap *Confirm order* to place this cart or *Add another dish* to keep browsing. You can also reply remove 2 to drop a line, or cancel to clear it.',
      )
    }
    return
  }

  if (session.state === 'AWAITING_NAME') {
    const name = message.text.trim().slice(0, 80)
    if (name.length < 2) {
      await sender.sendText(phone, 'Please send a name with at least two characters.')
      return
    }
    await store.setCustomerName(phone, name)
    session = await freshSession(store, phone)
    if (session.marketingConsent === 'unasked') {
      await sender.send(buildConsentButtons(phone))
    } else {
      await placeOrder(session, dependencies)
    }
    return
  }

  if (session.state === 'AWAITING_CONSENT') {
    const normalized = message.text.trim().toLowerCase()
    const tapped = message.selectionId
    const consent: Exclude<MarketingConsent, 'unasked'> | undefined =
      tapped === 'consent:granted' || /^(yes|y|offers on)$/.test(normalized)
        ? 'granted'
        : tapped === 'consent:denied' || /^(no|n|offers off)$/.test(normalized)
          ? 'denied'
          : undefined
    if (consent) await store.setConsent(phone, consent)
    session = await freshSession(store, phone)
    await placeOrder(session, dependencies)
    return
  }

  await sender.sendText(phone, 'I did not understand that. Type help to see available commands.')
}

export async function processInboundMessages(
  messages: InboundMessage[],
  dependencies: InboundDependencies,
): Promise<void> {
  for (const message of messages) {
    try {
      await handleMessage(message, dependencies)
    } catch (error) {
      console.error(
        JSON.stringify({
          event: 'whatsapp_message_failed',
          wamid: message.wamid,
          ...describeSendFailure(error),
        }),
      )
    }
  }
}

export async function handleInboundPayload(payload: unknown, env: RuntimeEnv): Promise<void> {
  const messages = parseWhatsAppPayload(payload)
  const dependencies: InboundDependencies = {
    env,
    store: createBotStore(env.convexUrl, env.restaurantId),
    sender: createWhatsAppClient(env),
    phrase: (items, apiKey) => phraseRecommendations(items, apiKey),
  }
  await processInboundMessages(messages, dependencies)
}

export async function sendServedFeedbackPrompt(
  orderId: string,
  phone: string,
  env: RuntimeEnv,
  sender: WhatsAppSender = createWhatsAppClient(env),
): Promise<void> {
  await sender.send(buildRatingList(phone, orderId))
}

export type FeedbackDispatchDependencies = {
  store: Pick<
    BotStore,
    'pendingFeedbackPrompts' | 'claimFeedbackPrompt' | 'confirmFeedbackPrompt'
  >
  sender: WhatsAppSender
}

const FEEDBACK_BATCH_LIMIT = 50

/**
 * Drains sessions that Convex has moved to AWAITING_FEEDBACK but which have not yet been sent a
 * rating prompt. Invoked from the Worker's scheduled handler.
 *
 * Delivery is claim → send → confirm. The claim spends one of a bounded number of attempts before
 * the Graph API is called, so a transient failure is retried on a later run while a persistent one
 * gives up instead of re-prompting the diner every minute. A send that succeeds but whose confirm
 * fails is the one case that can duplicate a prompt, and the attempt cap bounds that too.
 */
export async function dispatchFeedbackPrompts(
  env: RuntimeEnv,
  dependencies?: FeedbackDispatchDependencies,
): Promise<number> {
  const { store, sender } = dependencies ?? {
    store: createBotStore(env.convexUrl, env.restaurantId),
    sender: createWhatsAppClient(env),
  }

  let pending: Awaited<ReturnType<BotStore['pendingFeedbackPrompts']>>
  try {
    pending = await store.pendingFeedbackPrompts(FEEDBACK_BATCH_LIMIT)
  } catch (error) {
    console.error(
      JSON.stringify({
        event: 'feedback_prompt_query_failed',
        error: error instanceof Error ? error.message : 'unknown error',
      }),
    )
    return 0
  }

  let sent = 0
  for (const { phone, orderId, attempt } of pending) {
    try {
      if (!(await store.claimFeedbackPrompt(phone, orderId))) continue
      await sender.send(buildRatingList(phone, orderId))
      await store.confirmFeedbackPrompt(phone, orderId)
      sent += 1
    } catch (error) {
      console.error(
        JSON.stringify({
          event: 'feedback_prompt_failed',
          orderId,
          attempt,
          ...describeSendFailure(error),
        }),
      )
    }
  }
  return sent
}

/** The shared PDF builder requires the method list; Convex omits it when nothing is configured. */
function toReceiptPaymentConfig(payment?: PaymentConfig): ReceiptPaymentConfig {
  return {
    acceptedPaymentMethods: payment?.acceptedPaymentMethods ?? [],
    ...(payment?.mpesaTillNumber ? { mpesaTillNumber: payment.mpesaTillNumber } : {}),
  }
}

export type SummaryDispatchDependencies = {
  store: Pick<BotStore, 'pendingOrderSummaries' | 'claimOrderSummary' | 'confirmOrderSummary'>
  sender: WhatsAppSender
}

/**
 * Sends the order summary once the counter has verified an order. Same claim → send → confirm
 * contract as the feedback prompt.
 *
 * Two messages go out: a short confirmation, then the summary itself as its own bubble so the
 * diner can hold up one clean message at the counter.
 */
export async function dispatchOrderSummaries(
  env: RuntimeEnv,
  dependencies?: SummaryDispatchDependencies,
): Promise<number> {
  const { store, sender } = dependencies ?? {
    store: createBotStore(env.convexUrl, env.restaurantId),
    sender: createWhatsAppClient(env),
  }

  let pending: Awaited<ReturnType<BotStore['pendingOrderSummaries']>>
  try {
    pending = await store.pendingOrderSummaries(FEEDBACK_BATCH_LIMIT)
  } catch (error) {
    console.error(
      JSON.stringify({
        event: 'order_summary_query_failed',
        error: error instanceof Error ? error.message : 'unknown error',
      }),
    )
    return 0
  }

  let sent = 0
  for (const order of pending) {
    try {
      if (!(await store.claimOrderSummary(order.orderId))) continue
      const pdf = await buildOrderSummaryPdf(order, toReceiptPaymentConfig(order.payment))
      const mediaId = await sender.uploadMedia(pdf, orderSummaryFilename(order), 'application/pdf')
      await sender.send({
        messaging_product: 'whatsapp',
        to: order.phone,
        type: 'document',
        document: {
          id: mediaId,
          filename: orderSummaryFilename(order),
          caption: formatOrderConfirmed(order.reference),
        },
      })
      await store.confirmOrderSummary(order.orderId)
      sent += 1
    } catch (error) {
      console.error(
        JSON.stringify({
          event: 'order_summary_failed',
          orderId: order.orderId,
          ...describeSendFailure(error),
        }),
      )
    }
  }
  return sent
}

export const CONVERSATION_TTL_MS = SESSION_TTL_MS
