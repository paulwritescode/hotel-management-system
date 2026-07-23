import { Hono } from 'hono'
import type { WorkerEnv } from './env'
import { whatsappRoutes } from './routes/whatsapp'

const app = new Hono<{ Bindings: WorkerEnv }>()

app.get('/health', (c) =>
  c.json({ status: 'ok', sha: c.env.BUILD_SHA?.trim() || 'development' }),
)
app.route('/webhooks/whatsapp', whatsappRoutes)
app.notFound((c) => c.body(null, 404))

export default app
