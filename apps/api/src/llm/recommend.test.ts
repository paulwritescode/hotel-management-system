import { describe, expect, it, vi } from 'vitest'
import {
  phraseRecommendations,
  recommendationTemplate,
  selectRecommendationCandidates,
} from './recommend'
import type { MenuItem } from '../whatsapp/types'

const items: MenuItem[] = [
  { id: 'expensive', name: 'Steak', category: 'meat', priceKes: 900, available: true, archived: false, recentOrderCount: 50 },
  { id: 'popular', name: 'Pilau', description: 'spiced rice', category: 'staple', priceKes: 450, available: true, archived: false, recentOrderCount: 20 },
  { id: 'cheap', name: 'Ugali', description: 'hearty staple', category: 'staple', priceKes: 150, available: true, archived: false, recentOrderCount: 20 },
  { id: 'hidden', name: 'Soup', category: 'side', priceKes: 100, available: false, archived: false, recentOrderCount: 100 },
]

describe('recommendations', () => {
  it('selects deterministically by availability, budget, recent count, then price', () => {
    expect(selectRecommendationCandidates(items, { budgetKes: 500 }).map((item) => item.id)).toEqual([
      'cheap',
      'popular',
    ])
  })

  it('uses the template without calling NVIDIA when the key is absent', async () => {
    const fetcher = vi.fn<typeof fetch>()
    const selected = selectRecommendationCandidates(items, { budgetKes: 500 })
    await expect(phraseRecommendations(selected, undefined, fetcher)).resolves.toBe(
      recommendationTemplate(selected),
    )
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('falls back after one failed NVIDIA request without retrying', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response('', { status: 503 }))
    const selected = selectRecommendationCandidates(items, { category: 'staple' })
    await expect(phraseRecommendations(selected, 'test-key', fetcher)).resolves.toBe(
      recommendationTemplate(selected),
    )
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('rejects output containing an unapproved price', async () => {
    const selected = [items[1]!]
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        choices: [{ message: { content: JSON.stringify([{ itemId: 'popular', sentence: 'Great for KES 999' }]) } }],
      }),
    )
    await expect(phraseRecommendations(selected, 'test-key', fetcher)).resolves.toBe(
      recommendationTemplate(selected),
    )
  })
})
