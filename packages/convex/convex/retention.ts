import { internalMutationGeneric } from 'convex/server'
import { v } from 'convex/values'

// Addendum 05 §6 — retention and lifecycle.
//
// Two classes of data, two policies (§6.1). Operational logs are ephemeral; the accountability
// ledgers are kept 90 days so the daily reconciliation, settlement summary, and the §5 signals —
// which need weeks of history to mean anything — can be reconstructed. Windows live here as
// constants, never as scattered literals (§6.3).

const DAY_MS = 24 * 60 * 60 * 1000

export const RETENTION_MS = {
  // Idempotency only needs to outlive Meta's 24h retry window.
  processedMessages: 3 * DAY_MS,
  // Operational only; never analysed.
  sessions: 3 * DAY_MS,
  // Feed reconciliation and the fraud signals.
  stockLedger: 90 * DAY_MS,
  settlementLedger: 90 * DAY_MS,
} as const

// Convex mutations have write limits, so each table is drained at most this many rows per run.
// A backlog simply drains over several days, which is acceptable for pruning.
const BATCH = 500

async function deleteOlderThan(ctx: any, table: string, field: string, cutoff: number): Promise<number> {
  const rows = await ctx.db.query(table).filter((query: any) => query.lt(query.field(field), cutoff)).take(BATCH)
  for (const row of rows) await ctx.db.delete(row._id)
  return rows.length
}

// A single scheduled function, run daily. It MUST NOT delete staffAudit, inventoryDays,
// inventoryDayLines, orders, items, or staff — those are accountability or business records, not
// logs (§6.3). (orderAudit is listed in the addendum but does not exist in this build; order
// transitions are reconstructed from the order document, so there is nothing to prune there.)
export const prune = internalMutationGeneric({
  args: {},
  handler: async (ctx) => {
    const now = Date.now()
    const counts = {
      processedMessages: await deleteOlderThan(ctx, 'processedMessages', 'expiresAt', now),
      sessions: await deleteOlderThan(ctx, 'sessions', 'expiresAt', now - RETENTION_MS.sessions),
      stockLedger: await deleteOlderThan(ctx, 'stockLedger', 'at', now - RETENTION_MS.stockLedger),
      settlementLedger: await deleteOlderThan(ctx, 'settlementLedger', 'at', now - RETENTION_MS.settlementLedger),
    }
    // §6.3 — the function logs per-table counts. Workers/Convex console output is ephemeral.
    console.log(JSON.stringify({ event: 'prune.completed', counts, at: now }))
    return counts
  },
})
