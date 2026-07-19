import { expect, it } from 'vitest';
import { mergeReviews, type PublicReview } from './review-service';

it('merges sources newest-first and keeps Telegram attribution', () => {
  const telegram = [{ id: 't1', source: 'telegram', authorLabel: 'Анна', text: 'Текст отзыва достаточно длинный', rating: null, publishedAt: '2026-01-01', sourceUrl: 'https://t.me/jardinotzivi/1', productId: null }] as PublicReview[];
  const website = [{ id: 'w1', source: 'website', authorLabel: 'Покупатель Jardin Secret', text: 'Другой текст отзыва покупателя', rating: 5, publishedAt: '2026-02-01', sourceUrl: null, productId: null }] as PublicReview[];
  expect(mergeReviews(telegram, website).map((item) => item.source)).toEqual(['website', 'telegram']);
  expect(mergeReviews(telegram, website)[1].sourceUrl).toContain('t.me/jardinotzivi');
});
