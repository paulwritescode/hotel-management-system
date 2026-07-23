import { describe, expect, it } from 'vitest'
import type { SessionState } from '@heavenly/types'
import {
  ALL_SESSION_STATES,
  applyGlobalCommand,
  transition,
  type GlobalCommand,
  type MachineContext,
  type MachineEvent,
} from './machine'

const edgeCases: Array<[SessionState, MachineEvent, SessionState]> = [
  ['IDLE', { type: 'RECEIVE' }, 'GREETED'],
  ['GREETED', { type: 'NEED_TABLE' }, 'AWAITING_TABLE'],
  ['GREETED', { type: 'TABLE_BOUND' }, 'BROWSING'],
  ['AWAITING_TABLE', { type: 'TABLE_BOUND' }, 'BROWSING'],
  ['BROWSING', { type: 'CATEGORY_SELECTED' }, 'CATEGORY'],
  ['BROWSING', { type: 'ITEM_ADDED' }, 'CART'],
  ['CATEGORY', { type: 'ITEM_ADDED' }, 'CART'],
  ['CATEGORY', { type: 'BACK' }, 'BROWSING'],
  ['CART', { type: 'ADD_MORE' }, 'BROWSING'],
  ['CART', { type: 'CONFIRM_CART' }, 'AWAITING_NAME'],
  ['AWAITING_NAME', { type: 'NAME_CAPTURED' }, 'AWAITING_CONSENT'],
  ['AWAITING_CONSENT', { type: 'CONSENT_ANSWERED' }, 'PLACED'],
  ['PLACED', { type: 'SERVED' }, 'AWAITING_FEEDBACK'],
  ['AWAITING_FEEDBACK', { type: 'RATING_CAPTURED' }, 'CLOSED'],
  ['AWAITING_FEEDBACK', { type: 'FEEDBACK_EXPIRED' }, 'CLOSED'],
]

describe('conversation state machine', () => {
  it.each(edgeCases)('%s + $event.type -> %s', (state, event, expected) => {
    expect(transition({ state, hasTable: true, hasCart: true }, event).state).toBe(expected)
  })

  it('leaves state unchanged for an invalid edge', () => {
    const context: MachineContext = { state: 'PLACED', hasTable: true, hasCart: true }
    expect(transition(context, { type: 'BACK' })).toEqual(context)
  })
})

describe('global commands from every state', () => {
  const commands: GlobalCommand[] = ['menu', 'cart', 'cancel', 'help']

  it.each(ALL_SESSION_STATES.flatMap((state) => commands.map((command) => [state, command] as const)))(
    'handles %s + %s deterministically',
    (state, command) => {
      const context: MachineContext = { state, hasTable: true, hasCart: true }
      const result = applyGlobalCommand(context, command)
      expect(ALL_SESSION_STATES).toContain(result.state)
      if (command === 'help') expect(result).toEqual(context)
      if (command === 'menu') {
        expect(result.state).toBe(
          ['PLACED', 'AWAITING_FEEDBACK'].includes(state) ? state : 'BROWSING',
        )
      }
      if (command === 'cart') {
        expect(result.state).toBe(
          ['PLACED', 'AWAITING_FEEDBACK'].includes(state) ? state : 'CART',
        )
      }
      if (command === 'cancel' && ['PLACED', 'AWAITING_FEEDBACK', 'CLOSED'].includes(state)) {
        expect(result).toEqual(context)
      }
      if (command === 'cancel' && !['PLACED', 'AWAITING_FEEDBACK', 'CLOSED'].includes(state)) {
        expect(result).toEqual({ state: 'BROWSING', hasTable: true, hasCart: false })
      }
    },
  )

  it.each(ALL_SESSION_STATES)('routes commands safely without a bound table from %s', (state) => {
    const context: MachineContext = { state, hasTable: false, hasCart: false }
    const expected = ['PLACED', 'AWAITING_FEEDBACK'].includes(state)
      ? state
      : 'AWAITING_TABLE'
    expect(applyGlobalCommand(context, 'menu').state).toBe(expected)
    expect(applyGlobalCommand(context, 'cart').state).toBe(expected)
  })
})
