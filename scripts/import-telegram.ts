import { mkdir, rename, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { dedupeProducts, parseChannelPage, postToProduct, type ParsedPost } from './lib/telegram-parser';
import type { Product } from '../src/types/product';

const CHANNEL_URL = 'https://t.me/s/jardinnsecret';
const OUTPUT_DIR = join(process.cwd(), 'public/products');
const OUTPUT_JSON = join(process.cwd(), 'src/data/products.json');
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithRetry(url: string, attempts = 3): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 JardinSecretCatalog/1.0' } });
      if (response.ok) return response;
      if (response.status !== 429 && response.status < 500) throw new Error(`HTTP ${response.status} for ${url}`);
      lastError = new Error(`HTTP ${response.status} for ${url}`);
    } catch (error) {
      lastError = error;
    }
    await delay(500 * attempt);
  }
  throw lastError;
}

async function crawlChannel(): Promise<ParsedPost[]> {
  const posts = new Map<number, ParsedPost>();
  let before: number | null = null;
  for (let page = 1; page <= 160; page += 1) {
    const url = before ? `${CHANNEL_URL}?before=${before}` : CHANNEL_URL;
    const response = await fetchWithRetry(url);
    const batch = parseChannelPage(await response.text());
    if (!batch.length) break;
    batch.forEach((post) => posts.set(post.id, post));
    const oldest = Math.min(...batch.map((post) => post.id));
    console.log(`page ${page}: ${batch.length} posts, oldest ${oldest}`);
    if (oldest <= 1) break;
    if (before !== null && oldest >= before) break;
    before = oldest;
    await delay(350);
  }
  return [...posts.values()].sort((a, b) => b.id - a.id);
}

function extensionFor(contentType: string, url: string) {
  if (contentType.includes('png')) return '.png';
  if (contentType.includes('webp')) return '.webp';
  if (contentType.includes('gif')) return '.gif';
  return ['.jpg', '.jpeg', '.png', '.webp'].includes(extname(new URL(url).pathname))
    ? extname(new URL(url).pathname)
    : '.jpg';
}

async function localizeImage(product: Product): Promise<Product> {
  if (!product.imageUrl.startsWith('http')) return product;
  try {
    const response = await fetchWithRetry(product.imageUrl);
    const extension = extensionFor(response.headers.get('content-type') ?? '', product.imageUrl);
    const filename = `${product.sourcePostId}${extension}`;
    await writeFile(join(OUTPUT_DIR, filename), Buffer.from(await response.arrayBuffer()));
    return { ...product, imageUrl: `/products/${filename}` };
  } catch (error) {
    console.warn(`image ${product.sourcePostId}: ${error instanceof Error ? error.message : String(error)}`);
    return { ...product, imageUrl: '/products/placeholder.svg' };
  }
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  const posts = await crawlChannel();
  const accepted = posts.map(postToProduct).filter((product): product is Product => product !== null);
  const products = dedupeProducts(accepted);
  const localized: Product[] = [];
  for (const [index, product] of products.entries()) {
    localized.push(await localizeImage(product));
    if ((index + 1) % 20 === 0) console.log(`images: ${index + 1}/${products.length}`);
  }
  const temporary = `${OUTPUT_JSON}.tmp`;
  await writeFile(temporary, `${JSON.stringify(localized, null, 2)}\n`, 'utf8');
  await rename(temporary, OUTPUT_JSON);
  console.log(JSON.stringify({
    posts: posts.length,
    accepted: accepted.length,
    products: localized.length,
    duplicates: accepted.length - products.length,
    missingPrice: localized.filter((product) => product.priceRub === null).length,
    placeholderImages: localized.filter((product) => product.imageUrl.endsWith('placeholder.svg')).length,
  }, null, 2));
}

await main();
