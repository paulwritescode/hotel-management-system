import { Hono } from 'hono'
import type { WorkerEnv } from './env'
import { validateRuntimeEnv } from './env'
import { whatsappRoutes } from './routes/whatsapp'
import { dispatchFeedbackPrompts, dispatchOrderSummaries } from './whatsapp/processor'

const app = new Hono<{ Bindings: WorkerEnv }>()

app.get('/health', (c) =>
  c.json({ status: 'ok', sha: c.env.BUILD_SHA?.trim() || 'development' }),
)
app.route('/webhooks/whatsapp', whatsappRoutes)
app.notFound((c) => c.body(null, 404))

/**
 * Cron target for the every-minute trigger in wrangler.toml. Drains the two outbound queues that
 * Convex fills but cannot deliver itself, since the Graph API credentials live only in the Worker:
 * order summaries once the counter verifies an order, and rating prompts once a waiter serves it.
 *
 * The two run independently so a failure in one cannot starve the other.
 */
async function scheduled(
  _event: ScheduledController,
  env: WorkerEnv,
  ctx: ExecutionContext,
): Promise<void> {
  let runtimeEnv
  try {
    runtimeEnv = validateRuntimeEnv(env)
  } catch (error) {
    console.error(
      JSON.stringify({
        event: 'scheduled_configuration_error',
        error: error instanceof Error ? error.message : 'unknown error',
      }),
    )
    return
  }
  ctx.waitUntil(
    Promise.allSettled([
      dispatchOrderSummaries(runtimeEnv),
      dispatchFeedbackPrompts(runtimeEnv),
    ]),
  )
}

export default { fetch: app.fetch, scheduled }
