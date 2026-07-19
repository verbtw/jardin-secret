import telegramData from '../data/telegram-reviews.json';
import { supabase } from '../lib/supabase';

export interface PublicReview { id: string; source: 'telegram' | 'website'; authorLabel: string; text: string; rating: number | null; publishedAt: string | null; sourceUrl: string | null; productId: string | null }

export function getTelegramReviews(): PublicReview[] { return telegramData.map((review) => ({ id: review.id, source: 'telegram', authorLabel: review.authorLabel, text: review.text, rating: null, publishedAt: review.publishedAt, sourceUrl: review.sourceUrl, productId: null } as const)); }
export function mergeReviews(...groups: PublicReview[][]): PublicReview[] { return groups.flat().sort((a, b) => Date.parse(b.publishedAt ?? '1970-01-01') - Date.parse(a.publishedAt ?? '1970-01-01')); }
export async function loadPublicReviews(): Promise<PublicReview[]> {
  const telegram = getTelegramReviews(); if (!supabase) return telegram;
  const { data, error } = await supabase.from('reviews').select('id, product_id, rating, body, created_at').eq('status', 'published').order('created_at', { ascending: false });
  if (error) return telegram;
  const website: PublicReview[] = (data ?? []).map((row) => ({ id: row.id, source: 'website', authorLabel: 'Покупатель Jardin Secret', text: row.body, rating: row.rating, publishedAt: row.created_at, sourceUrl: null, productId: row.product_id }));
  return mergeReviews(telegram, website);
}
