import * as cheerio from 'cheerio';
import type { AnyNode } from 'domhandler';

export interface TelegramReview { id: string; text: string; publishedAt: string | null; sourcePostId: number; sourceUrl: string; authorLabel: string }

function linesFrom($element: cheerio.Cheerio<AnyNode>) {
  const clone = $element.clone();
  clone.find('br').replaceWith('\n');
  return clone.text().split('\n').map((line) => line.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

function looksLikeAuthor(line: string) { return line.length >= 2 && line.length <= 40 && !/https?:|t\.me|@|₽|руб|заказ/i.test(line); }

export function parseReviewChannelPage(html: string): TelegramReview[] {
  const $ = cheerio.load(html); const reviews: TelegramReview[] = [];
  $('.tgme_widget_message').each((_, node) => {
    const message = $(node); const post = message.attr('data-post') ?? ''; const match = post.match(/jardinotzivi\/(\d+)/); if (!match) return;
    const lines = linesFrom(message.find('.tgme_widget_message_text').first());
    if (!lines.length) return;
    const authorLabel = lines.length > 1 && looksLikeAuthor(lines[0]) ? lines.shift()! : 'Покупатель Jardin Secret';
    const text = lines.join('\n').trim();
    if (text.length < 20) return;
    const sourcePostId = Number(match[1]);
    reviews.push({ id: `telegram-${sourcePostId}`, text, authorLabel, sourcePostId, sourceUrl: `https://t.me/jardinotzivi/${sourcePostId}`, publishedAt: message.find('time').attr('datetime') ?? null });
  });
  return reviews;
}
