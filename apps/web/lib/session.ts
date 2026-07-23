export const SESSION_COOKIE = 'hf_session'
export const SESSION_DURATION_SECONDS = 12 * 60 * 60

export type StaffSession = {
  staffId: string
  restaurantId: string
  convexToken: string
  name: string
  role: 'owner' | 'manager' | 'counter' | 'waiter'
  exp: number
}

const encoder = new TextEncoder()

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '')
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - (value.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes
}

async function key(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
}

export async function signSession(session: StaffSession, secret: string): Promise<string> {
  const payload = toBase64Url(encoder.encode(JSON.stringify(session)))
  const signature = await crypto.subtle.sign('HMAC', await key(secret), encoder.encode(payload))
  return `${payload}.${toBase64Url(new Uint8Array(signature))}`
}

export async function verifySession(token: string | undefined, secret: string | undefined): Promise<StaffSession | null> {
  if (!token || !secret) return null
  const [payload, signature, extra] = token.split('.')
  if (!payload || !signature || extra) return null
  try {
    const valid = await crypto.subtle.verify('HMAC', await key(secret), fromBase64Url(signature), encoder.encode(payload))
    if (!valid) return null
    const parsed = JSON.parse(new TextDecoder().decode(fromBase64Url(payload))) as StaffSession
    if (!parsed.staffId || !parsed.restaurantId || !parsed.convexToken || !parsed.name || !['owner', 'manager', 'counter', 'waiter'].includes(parsed.role) || parsed.exp <= Math.floor(Date.now() / 1000)) return null
    return parsed
  } catch {
    return null
  }
}
