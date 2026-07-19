import { load } from 'cheerio';
import type { Product, ProductGender } from '../../src/types/product';

export interface ParsedPost {
  id: number;
  text: string;
  emphasizedTexts: string[];
  imageUrls: string[];
  publishedAt: string | null;
}

const BRANDS = [
  'Parfums de Marly', 'Louis Vuitton', 'Tiziana Terenzi', 'Clive Christian',
  'Maison Francis Kurkdjian', 'Initio Parfums Privés', 'Kilian', 'Tom Ford',
  'Creed', 'Amouage', 'Xerjoff', 'Sospiro', 'Nishane', 'Byredo', 'Chanel',
  'Dior', 'Giorgio Armani', 'Yves Saint Laurent', 'Boadicea the Victorious',
  'Ex Nihilo', 'Roja Parfums', 'Nasomatto', 'Orto Parisi', 'Gritti', 'Mancera',
  'Montale', 'Memo Paris', 'Attar Collection', 'Essential Parfums', 'Le Labo',
  'Versace', 'Guerlain', 'Maison Crivelli', 'HFC', 'BDK Parfums', 'Fragrance du Bois',
  'The House of Oud', 'Electimuss', 'Marc-Antoine Barrois', 'Stephane Humbert Lucas',
  'Dries Van Noten', 'Dolce & Gabbana', 'Carolina Herrera', 'Jean Paul Gaultier',
  'Frederic Malle', 'Maison Margiela', 'Vilhelm Parfumerie', 'Liquides Imaginaires',
  'Penhaligon’s', 'Bois 1920', 'Lorenzo Pazzaglia', 'Giardini di Toscana', 'Mind Games',
];

const BRAND_ALIASES: Record<string, string> = {
  'parfums de marly': 'Parfums de Marly',
  'parfums de marly paris': 'Parfums de Marly',
  'louis vuitton': 'Louis Vuitton',
  'tiziana terenzi': 'Tiziana Terenzi',
  'amouage': 'Amouage',
  'hfc': 'HFC',
  'kilian': 'Kilian',
  'килиан': 'Kilian',
};

function normalizeSpaces(value: string) {
  return value.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

export function parseChannelPage(html: string): ParsedPost[] {
  const $ = load(html);
  return $('.tgme_widget_message_wrap').map((_, element) => {
    const root = $(element);
    const message = root.find('.tgme_widget_message_text');
    const dataPost = root.find('.tgme_widget_message').attr('data-post') ?? '';
    const id = Number(dataPost.split('/').pop());
    const textClone = message.clone();
    textClone.find('br').replaceWith('\n');
    const text = textClone.text().split('\n').map(normalizeSpaces).filter(Boolean).join('\n');
    const emphasizedTexts = [...new Set(message.find('b, strong').map((__, emphasis) => normalizeSpaces($(emphasis).text())).get()
      .filter((value) => value.length > 2 && /[A-Za-zА-Яа-яЁё]/.test(value)))];
    const imageUrls = root.find('.tgme_widget_message_photo_wrap').map((__, photo) => {
      const style = $(photo).attr('style') ?? '';
      return style.match(/url\(['"]?([^'")]+)['"]?\)/)?.[1] ?? '';
    }).get().filter(Boolean);
    return { id, text, emphasizedTexts, imageUrls, publishedAt: root.find('time').attr('datetime') ?? null };
  }).get().filter((post) => Number.isFinite(post.id));
}

function parsePrice(text: string): number | null {
  const match = text.match(/(?:цена\s*[:—-]?\s*)?(\d{1,3}(?:[ .]\d{3})+|\d{4,6})\s*(?:₽|руб)/i);
  return match ? Number(match[1].replace(/[ .]/g, '')) : null;
}

function parseVolume(text: string): number | null {
  const match = text.match(/(?:^|\D)(30|50|75|80|90|100|125|150|200)\s*(?:мл|ml)(?:\s|[.,;:—-]|$)/i);
  return match ? Number(match[1]) : null;
}

function detectGender(text: string): ProductGender {
  if (/унисекс/i.test(text)) return 'unisex';
  if (/мужск/i.test(text)) return 'men';
  if (/женск/i.test(text)) return 'women';
  return 'unknown';
}

function normalizeName(value: string) {
  return normalizeSpaces(value.replace(/[✅🩷❤🔥🦋🔖🏷🚨]+/gu, '').replace(/[|]+/g, ' ')
    .replace(/^[\s/,:;"“”«»()\-—]+|[\s/,:;"“”«»()\-—]+$/g, ''));
}

function identityFromText(text: string): { brand: string; name: string } | null {
  const lead = normalizeSpaces(text.split(/(?:\b(?:цена|стоимость)\b|\bв наличии\b|\s[-—]\s(?:в наличии|роскошный|это)|\d[ .]?\d{3}\s*₽)/i)[0]);
  const lowerLead = lead.toLocaleLowerCase('en-US');
  const brandNames = [...Object.keys(BRAND_ALIASES), ...BRANDS.map((brand) => brand.toLocaleLowerCase('en-US'))]
    .sort((a, b) => b.length - a.length);
  const matchedBrand = brandNames.find((item) => lowerLead.includes(item));
  if (!matchedBrand) return null;
  const canonical = BRAND_ALIASES[matchedBrand] ?? BRANDS.find((brand) => brand.toLocaleLowerCase('en-US') === matchedBrand)!;
  const start = lowerLead.indexOf(matchedBrand);
  const before = lead.slice(0, start).match(/([A-Za-zÀ-ž0-9][A-Za-zÀ-ž0-9’' -]{1,45})\s+(?:by|от)\s*$/i)?.[1];
  const afterBrand = lead.slice(start + matchedBrand.length).replace(/^\s*(?:[:|—-]|by)?\s*/i, '');
  const after = afterBrand.split(/(?:\b(?:это|для|идеальн|аромат)\b|[.!?]|\s[-—]\s|\b(?:30|50|75|80|90|100|125|150|200)\s*(?:ml|мл))/i)[0];
  const rawName = normalizeName(normalizeName((before ?? after).replace(/\b(?:30|50|75|80|90|100|125|150|200)\s*(?:ml|мл).*/i, ''))
    .split(/[А-Яа-яЁё]/)[0].trim().replace(/\s+(?:UNBOXING|AVAILABLE).*$/i, '').replace(/^NEW\s*[-—]+\s*/i, ''));
  if (!rawName || !/[A-Za-zÀ-ž0-9]/.test(rawName) || rawName.split(/\s+/).length > 8) return null;
  const competingBrands = brandNames.filter((brand) => brand !== matchedBrand && rawName.toLocaleLowerCase('en-US').includes(brand));
  if (competingBrands.length) return null;
  if (/^(?:new|parfum|perfume|в наличии|у нас|если|беспроигрышный|ваниль|unboxing|парфюм|аромат)$/i.test(rawName)) return null;
  const name = rawName.replace(/^paris\s+/i, '').replace(/^althair$/i, 'Althaïr');
  return { brand: canonical, name };
}

function extractIdentity(post: ParsedPost): { brand: string; name: string } | null {
  for (const emphasized of post.emphasizedTexts) {
    const identity = identityFromText(emphasized);
    if (identity) return identity;
  }
  return identityFromText(post.text);
}

function slugify(value: string) {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('en-US')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function postToProduct(post: ParsedPost): Product | null {
  const commercial = /(?:₽|руб|цена|в наличии|заказать)/i.test(post.text);
  if (!commercial || !post.text) return null;
  const identity = extractIdentity(post);
  if (!identity) return null;
  const slug = slugify(`${identity.brand}-${identity.name}`);
  if (!slug) return null;
  const priceRub = parsePrice(post.text);
  return {
    id: `${post.id}-${slug}`,
    slug,
    brand: identity.brand,
    name: identity.name,
    volumeMl: parseVolume(post.text),
    priceRub,
    gender: detectGender(post.text),
    availability: /в наличии/i.test(post.text) ? 'in-stock' : 'ask-manager',
    description: post.text,
    notes: [],
    imageUrl: post.imageUrls[0] ?? '/products/placeholder.svg',
    sourceUrl: `https://t.me/jardinnsecret/${post.id}`,
    sourcePostId: post.id,
    publishedAt: post.publishedAt,
  };
}

function completeness(product: Product) {
  return Number(product.priceRub !== null) + Number(product.volumeMl !== null) + Number(product.imageUrl !== '/products/placeholder.svg');
}

export function dedupeProducts(products: Product[]): Product[] {
  const bySlug = new Map<string, Product>();
  for (const product of products) {
    const current = bySlug.get(product.slug);
    if (!current || product.sourcePostId > current.sourcePostId || completeness(product) > completeness(current)) {
      bySlug.set(product.slug, product);
    }
  }
  return [...bySlug.values()].sort((a, b) => b.sourcePostId - a.sourcePostId);
}
