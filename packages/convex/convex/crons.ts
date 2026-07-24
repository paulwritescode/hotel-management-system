import { cronJobs, makeFunctionReference } from 'convex/server'

const crons = cronJobs()
const pruneMessages = makeFunctionReference<'mutation', { limit?: number }, number>('messages:pruneExpired')
const closeFeedback = makeFunctionReference<'mutation', Record<string, never>, number>('sessions:closeExpiredFeedback')
// Addendum 05 §6.3 — daily retention prune of operational logs and 90-day ledger trimming.
const prune = makeFunctionReference<'mutation', Record<string, never>, unknown>('retention:prune')

crons.interval('prune expired WhatsApp message claims', { hours: 1 }, pruneMessages, { limit: 500 })
crons.interval('close expired feedback sessions', { minutes: 30 }, closeFeedback, {})
crons.daily('prune logs and trim ledgers', { hourUTC: 1, minuteUTC: 30 }, prune, {})

export default crons
