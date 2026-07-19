export interface ReviewDraft { rating: number; text: string; productId: string | null }
export interface ReviewErrors { rating?: string; text?: string }
export type ReviewStatus = 'pending' | 'published' | 'rejected';

export function validateReview(review: ReviewDraft): ReviewErrors {
  const errors: ReviewErrors = {};
  if (!Number.isInteger(review.rating) || review.rating < 1 || review.rating > 5) errors.rating = 'Выберите оценку от 1 до 5.';
  const length = review.text.trim().length;
  if (length < 20 || length > 1500) errors.text = 'Напишите отзыв длиной от 20 до 1500 символов.';
  return errors;
}
