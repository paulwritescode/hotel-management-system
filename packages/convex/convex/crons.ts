import { cronJobs, makeFunctionReference } from 'convex/server'

const crons = cronJobs()
const pruneMessages = makeFunctionReference<'mutation', { limit?: number }, number>('messages:pruneExpired')
const closeFeedback = makeFunctionReference<'mutation', Record<string, never>, number>('sessions:closeExpiredFeedback')

crons.interval('prune expired WhatsApp message claims', { hours: 1 }, pruneMessages, { limit: 500 })
crons.interval('close expired feedback sessions', { minutes: 30 }, closeFeedback, {})

export default crons
