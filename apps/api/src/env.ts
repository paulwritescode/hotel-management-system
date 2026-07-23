export interface WorkerEnv {
  WHATSAPP_TOKEN?: string
  PHONE_NUMBER_ID?: string
  VERIFY_TOKEN?: string
  META_APP_SECRET?: string
  CONVEX_URL?: string
  NVIDIA_API_KEY?: string
  RESTAURANT_ID?: string
  BUILD_SHA?: string
  FEEDBACK_DELAY_MS?: string
}

export interface RuntimeEnv {
  whatsappToken: string
  phoneNumberId: string
  verifyToken: string
  metaAppSecret: string
  convexUrl: string
  restaurantId: string
  buildSha: string
  feedbackDelayMs: number
  nvidiaApiKey?: string
}

const REQUIRED_KEYS = [
  'WHATSAPP_TOKEN',
  'PHONE_NUMBER_ID',
  'VERIFY_TOKEN',
  'META_APP_SECRET',
  'CONVEX_URL',
  'RESTAURANT_ID',
] as const

function required(env: WorkerEnv, key: (typeof REQUIRED_KEYS)[number]): string {
  const value = env[key]?.trim()
  if (!value) throw new Error(`Missing required environment variable: ${key}`)
  return value
}

export function validateRuntimeEnv(env: WorkerEnv): RuntimeEnv {
  for (const key of REQUIRED_KEYS) required(env, key)

  const convexUrl = required(env, 'CONVEX_URL')
  let parsedUrl: URL
  try {
    parsedUrl = new URL(convexUrl)
  } catch {
    throw new Error('CONVEX_URL must be an absolute URL')
  }
  if (parsedUrl.protocol !== 'https:' && parsedUrl.hostname !== 'localhost') {
    throw new Error('CONVEX_URL must use HTTPS')
  }

  const configuredDelay = env.FEEDBACK_DELAY_MS?.trim()
  const feedbackDelayMs = configuredDelay ? Number(configuredDelay) : 600_000
  if (!Number.isSafeInteger(feedbackDelayMs) || feedbackDelayMs < 0) {
    throw new Error('FEEDBACK_DELAY_MS must be a non-negative integer')
  }

  const nvidiaApiKey = env.NVIDIA_API_KEY?.trim()
  return {
    whatsappToken: required(env, 'WHATSAPP_TOKEN'),
    phoneNumberId: required(env, 'PHONE_NUMBER_ID'),
    verifyToken: required(env, 'VERIFY_TOKEN'),
    metaAppSecret: required(env, 'META_APP_SECRET'),
    convexUrl,
    restaurantId: required(env, 'RESTAURANT_ID'),
    buildSha: env.BUILD_SHA?.trim() || 'development',
    feedbackDelayMs,
    ...(nvidiaApiKey ? { nvidiaApiKey } : {}),
  }
}

export function requireVerifyToken(env: WorkerEnv): string {
  return required(env, 'VERIFY_TOKEN')
}

export function requireMetaAppSecret(env: WorkerEnv): string {
  return required(env, 'META_APP_SECRET')
}
