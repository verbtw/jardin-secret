import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { parseReviewChannelPage } from './telegram-review-parser';

const fixture = readFileSync(join(process.cwd(), 'scripts/fixtures/reviews-channel.html'), 'utf8');

it('extracts text and source metadata without media URLs', () => {
  const [review] = parseReviewChannelPage(fixture);
  expect(review.text).toContain('аромат');
  expect(review.authorLabel).toBe('Анна');
  expect(review.sourceUrl).toBe('https://t.me/jardinotzivi/42');
  expect(JSON.stringify(review)).not.toMatch(/\.jpg|\.mp4|background-image/);
});

it('drops a media-only post', () => {
  expect(parseReviewChannelPage(fixture)).toHaveLength(1);
});
