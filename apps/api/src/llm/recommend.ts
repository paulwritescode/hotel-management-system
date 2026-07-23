import type { ItemCategory } from '@heavenly/types'
import type { MenuItem } from '../whatsapp/types'

const NIM_ENDPOINT = 'https://integrate.api.nvidia.com/v1/chat/completions'
const NIM_MODEL = 'meta/llama-3.1-8b-instruct'
const SAFE_WORDS = new Set(
  'a an and with for the this that is are warm hearty fresh tasty delicious satisfying lovely great good choice pick option meal plate try enjoy perfect budget friendly'.split(' '),
)

export type RecommendationConstraints = { budgetKes?: number; category?: ItemCategory }

export function selectRecommendationCandidates(
  items: MenuItem[],
  constraints: RecommendationConstraints,
): MenuItem[] {
  return items
    .filter(
      (item) =>
        item.available &&
        !item.archived &&
        (constraints.budgetKes === undefined || item.priceKes <= constraints.budgetKes) &&
        (constraints.category === undefined || item.category === constraints.category),
    )
    .sort(
      (left, right) =>
        (right.recentOrderCount ?? 0) - (left.recentOrderCount ?? 0) ||
        left.priceKes - right.priceKes ||
        left.name.localeCompare(right.name) ||
        left.id.localeCompare(right.id),
    )
    .slice(0, 3)
}

export function recommendationTemplate(items: MenuItem[]): string {
  if (items.length === 0) return 'There are no matching available items right now. Type menu to browse everything.'
  return ['Here are my suggestions:', ...items.map((item) => `• ${item.name} — KES ${item.priceKes}${item.description ? `: ${item.description}` : ''}`)].join('\n')
}

type NimResponse = { choices?: Array<{ message?: { content?: unknown } }> }
type Phrase = { itemId: string; sentence: string }

function object(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined
}

function parsePhrases(content: string): Phrase[] | undefined {
  try {
    const parsed: unknown = JSON.parse(content)
    if (!Array.isArray(parsed)) return undefined
    const phrases: Phrase[] = []
    for (const value of parsed) {
      const row = object(value)
      if (typeof row?.itemId !== 'string' || typeof row.sentence !== 'string') return undefined
      phrases.push({ itemId: row.itemId, sentence: row.sentence.trim() })
    }
    return phrases
  } catch {
    return undefined
  }
}

function words(value: string): string[] {
  return value.toLowerCase().match(/[\p{L}']+/gu) ?? []
}

function validatePhrases(phrases: Phrase[], items: MenuItem[]): boolean {
  if (phrases.length !== items.length) return false
  const byId = new Map(items.map((item) => [item.id, item]))
  const seen = new Set<string>()
  for (const phrase of phrases) {
    const item = byId.get(phrase.itemId)
    if (!item || seen.has(phrase.itemId) || !phrase.sentence || phrase.sentence.length > 180) return false
    if (/\d|\b(?:kes|ksh|shillings?)\b/i.test(phrase.sentence)) return false
    const allowed = new Set([
      ...SAFE_WORDS,
      ...words(item.name),
      ...words(item.description ?? ''),
    ])
    if (words(phrase.sentence).some((word) => !allowed.has(word))) return false
    seen.add(phrase.itemId)
  }
  return true
}

function formatPhrases(phrases: Phrase[], items: MenuItem[]): string {
  const byId = new Map(items.map((item) => [item.id, item]))
  return phrases
    .map((phrase) => {
      const item = byId.get(phrase.itemId)
      if (!item) throw new Error('Recommendation item disappeared')
      return `• ${item.name} — KES ${item.priceKes}: ${phrase.sentence}`
    })
    .join('\n')
}

export async function phraseRecommendations(
  items: MenuItem[],
  apiKey: string | undefined,
  fetcher: typeof fetch = fetch,
): Promise<string> {
  const fallback = recommendationTemplate(items)
  if (items.length === 0 || !apiKey) return fallback

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 2_000)
  try {
    const response = await fetcher(NIM_ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: NIM_MODEL,
        temperature: 0.2,
        max_tokens: 220,
        messages: [
          {
            role: 'system',
            content:
              'Return only a JSON array of {"itemId":"...","sentence":"..."}. Write one warm sentence per supplied item. Do not add foods, names, prices, numbers, facts, or ingredients. Use only words present in that item plus simple warm connector words.',
          },
          {
            role: 'user',
            content: JSON.stringify(
              items.map(({ id, name, priceKes, description }) => ({
                itemId: id,
                name,
                priceKes,
                description: description ?? '',
              })),
            ),
          },
        ],
      }),
    })
    if (!response.ok) throw new Error(`NVIDIA NIM returned ${response.status}`)
    const body: unknown = await response.json()
    const parsedBody = object(body) as NimResponse | undefined
    const content = parsedBody?.choices?.[0]?.message?.content
    if (typeof content !== 'string') throw new Error('NVIDIA NIM returned malformed content')
    const phrases = parsePhrases(content)
    if (!phrases || !validatePhrases(phrases, items)) {
      throw new Error('NVIDIA NIM output failed allow-list validation')
    }
    return formatPhrases(phrases, items)
  } catch (error) {
    console.warn(JSON.stringify({ event: 'recommendation_fallback', error: error instanceof Error ? error.message : 'unknown' }))
    return fallback
  } finally {
    clearTimeout(timeout)
  }
}
