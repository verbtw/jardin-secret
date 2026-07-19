import { expect, it } from 'vitest';
import { validateReview } from './review-types';

it('requires a 1–5 rating and 20–1500 characters', () => {
  expect(validateReview({ rating: 0, text: 'коротко', productId: null })).toEqual({ rating: 'Выберите оценку от 1 до 5.', text: 'Напишите отзыв длиной от 20 до 1500 символов.' });
  expect(validateReview({ rating: 5, text: 'Очень понравился аромат и обслуживание!', productId: null })).toEqual({});
});
