import { Hono } from 'hono'
import type { WorkerEnv } from '../env'
import {
  requireMetaAppSecret,
  requireVerifyToken,
  validateRuntimeEnv,
} from '../env'
import { constantTimeEqual, verifySignature } from '../whatsapp/signature'
import { handleInboundPayload } from '../whatsapp/processor'

export const whatsappRoutes = new Hono<{ Bindings: WorkerEnv }>()

whatsappRoutes.get('/', (c) => {
  const mode = c.req.query('hub.mode')
  const receivedToken = c.req.query('hub.verify_token')
  const challenge = c.req.query('hub.challenge')
  try {
    const configuredToken = requireVerifyToken(c.env)
    if (
      mode === 'subscribe' &&
      challenge !== undefined &&
      receivedToken !== undefined &&
      constantTimeEqual(receivedToken, configuredToken)
    ) {
      return c.text(challenge, 200, { 'Content-Type': 'text/plain; charset=UTF-8' })
    }
    return c.body(null, 403)
  } catch (error) {
    console.error(
      JSON.stringify({
        event: 'webhook_verification_configuration_error',
        error: error instanceof Error ? error.message : 'unknown error',
      }),
    )
    return c.body(null, 500)
  }
})

whatsappRoutes.post('/', async (c) => {
  const rawBody = await c.req.text()
  let appSecret: string
  try {
    appSecret = requireMetaAppSecret(c.env)
  } catch (error) {
    console.error(
      JSON.stringify({
        event: 'webhook_signature_configuration_error',
        error: error instanceof Error ? error.message : 'unknown error',
      }),
    )
    return c.body(null, 500)
  }

  const signature = c.req.header('x-hub-signature-256')
  if (!(await verifySignature(rawBody, signature, appSecret))) return c.body(null, 401)

  let payload: unknown
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return c.body(null, 400)
  }

  let runtimeEnv
  try {
    runtimeEnv = validateRuntimeEnv(c.env)
  } catch (error) {
    console.error(
      JSON.stringify({
        event: 'webhook_runtime_configuration_error',
        error: error instanceof Error ? error.message : 'unknown error',
      }),
    )
    return c.body(null, 500)
  }

  c.executionCtx.waitUntil(handleInboundPayload(payload, runtimeEnv))
  return c.body(null, 200)
})
