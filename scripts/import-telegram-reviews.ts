import { rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseReviewChannelPage, type TelegramReview } from './lib/telegram-review-parser';

const channelUrl = 'https://t.me/s/jardinotzivi';
const output = join(process.cwd(), 'src/data/telegram-reviews.json');
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchPage(url: string) { const response = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 JardinSecretReviews/1.0' } }); if (!response.ok) throw new Error(`Telegram returned HTTP ${response.status}`); return response.text(); }

async function main() {
  const records = new Map<number, TelegramReview>(); let before: number | null = null;
  for (let page = 0; page < 160; page += 1) {
    const batch = parseReviewChannelPage(await fetchPage(before ? `${channelUrl}?before=${before}` : channelUrl));
    if (!batch.length) break;
    batch.forEach((review) => records.set(review.sourcePostId, review));
    const oldest = Math.min(...batch.map((review) => review.sourcePostId));
    if (before !== null && oldest >= before) break;
    before = oldest;
    await pause(250);
  }
  const reviews = [...records.values()].sort((a, b) => b.sourcePostId - a.sourcePostId);
  const temporary = `${output}.tmp`;
  await writeFile(temporary, `${JSON.stringify(reviews, null, 2)}\n`, 'utf8');
  await rename(temporary, output);
  console.log(`Imported ${reviews.length} text reviews`);
}

await main();
