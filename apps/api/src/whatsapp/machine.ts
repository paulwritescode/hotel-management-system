import type { SessionState } from '@heavenly/types'

export type MachineContext = {
  state: SessionState
  hasTable: boolean
  hasCart: boolean
}

export type MachineEvent =
  | { type: 'RECEIVE' }
  | { type: 'NEED_TABLE' }
  | { type: 'TABLE_BOUND' }
  | { type: 'CATEGORY_SELECTED' }
  | { type: 'ITEM_ADDED' }
  | { type: 'BACK' }
  | { type: 'ADD_MORE' }
  | { type: 'CONFIRM_CART' }
  | { type: 'NAME_CAPTURED' }
  | { type: 'CONSENT_ANSWERED' }
  | { type: 'SERVED' }
  | { type: 'RATING_CAPTURED' }
  | { type: 'FEEDBACK_EXPIRED' }

export type GlobalCommand = 'menu' | 'cart' | 'cancel' | 'help'

const TRANSITIONS: Partial<Record<SessionState, Partial<Record<MachineEvent['type'], SessionState>>>> = {
  IDLE: { RECEIVE: 'GREETED' },
  GREETED: { NEED_TABLE: 'AWAITING_TABLE', TABLE_BOUND: 'BROWSING' },
  AWAITING_TABLE: { TABLE_BOUND: 'BROWSING' },
  BROWSING: { CATEGORY_SELECTED: 'CATEGORY', ITEM_ADDED: 'CART' },
  CATEGORY: { ITEM_ADDED: 'CART', BACK: 'BROWSING' },
  CART: { ADD_MORE: 'BROWSING', CONFIRM_CART: 'AWAITING_NAME' },
  AWAITING_NAME: { NAME_CAPTURED: 'AWAITING_CONSENT' },
  AWAITING_CONSENT: { CONSENT_ANSWERED: 'PLACED' },
  PLACED: { SERVED: 'AWAITING_FEEDBACK' },
  AWAITING_FEEDBACK: { RATING_CAPTURED: 'CLOSED', FEEDBACK_EXPIRED: 'CLOSED' },
}

export function transition(context: MachineContext, event: MachineEvent): MachineContext {
  const next = TRANSITIONS[context.state]?.[event.type]
  return next ? { ...context, state: next } : context
}

export function parseGlobalCommand(text: string): GlobalCommand | undefined {
  const normalized = text.trim().toLowerCase()
  return normalized === 'menu' || normalized === 'cart' || normalized === 'cancel' || normalized === 'help'
    ? normalized
    : undefined
}

export function applyGlobalCommand(
  context: MachineContext,
  command: GlobalCommand,
): MachineContext {
  if (command === 'help') return context

  const orderInProgress = context.state === 'PLACED' || context.state === 'AWAITING_FEEDBACK'
  if (orderInProgress) return context

  if (command === 'menu') {
    return { ...context, state: context.hasTable ? 'BROWSING' : 'AWAITING_TABLE' }
  }
  if (command === 'cart') {
    if (context.hasCart) return { ...context, state: 'CART' }
    return { ...context, state: context.hasTable ? 'BROWSING' : 'AWAITING_TABLE' }
  }

  if (context.state === 'CLOSED') return context
  return {
    state: context.hasTable ? 'BROWSING' : 'AWAITING_TABLE',
    hasTable: context.hasTable,
    hasCart: false,
  }
}

export const ALL_SESSION_STATES: SessionState[] = [
  'IDLE',
  'GREETED',
  'AWAITING_TABLE',
  'BROWSING',
  'CATEGORY',
  'CART',
  'AWAITING_NAME',
  'AWAITING_CONSENT',
  'PLACED',
  'AWAITING_FEEDBACK',
  'CLOSED',
]
