import { describe, expect, it } from 'vitest'
import { signBody, verifySignature } from './signature'

describe('verifySignature', () => {
  const secret = 'test-app-secret'
  const body = '{"object":"whatsapp_business_account","entry":[]}'

  it('accepts a valid signature', async () => {
    const signature = await signBody(body, secret)
    await expect(verifySignature(body, signature, secret)).resolves.toBe(true)
  })

  it('rejects an invalid signature', async () => {
    const signature = await signBody(body, 'different-secret')
    await expect(verifySignature(body, signature, secret)).resolves.toBe(false)
  })

  it('rejects a missing signature', async () => {
    await expect(verifySignature(body, undefined, secret)).resolves.toBe(false)
  })

  it('rejects the original signature after the raw body is mutated', async () => {
    const signature = await signBody(body, secret)
    const mutated = body.replace('[]', '[ ]')
    await expect(verifySignature(mutated, signature, secret)).resolves.toBe(false)
  })
})
