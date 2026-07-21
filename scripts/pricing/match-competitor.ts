import type {
  CompetitorCandidate,
  CompetitorSource,
  ExactCompetitorMatch,
  ProductVariant,
} from './competitor-types';

const sourceHosts: Record<CompetitorSource, string[]> = {
  randewoo: ['randewoo.ru', 'www.randewoo.ru'],
  goldapple: ['goldapple.ru', 'www.goldapple.ru'],
};

function normalizeIdentity(value: string | null) {
  return (value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('ru-RU')
    .replace(/&|\band\b/gi, ' and ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isAllowedUrl(candidate: CompetitorCandidate) {
  try {
    const url = new URL(candidate.url);
    return url.protocol === 'https:' && sourceHosts[candidate.source].includes(url.hostname);
  } catch {
    return false;
  }
}

function isExactVariant(product: ProductVariant, candidate: CompetitorCandidate) {
  return normalizeIdentity(product.brand) === normalizeIdentity(candidate.brand)
    && normalizeIdentity(product.name) === normalizeIdentity(candidate.name)
    && normalizeIdentity(product.flanker) === normalizeIdentity(candidate.flanker)
    && product.concentration === candidate.concentration
    && product.volumeMl === candidate.volumeMl;
}

export function findExactCompetitorMatches(
  product: ProductVariant,
  candidates: CompetitorCandidate[],
): ExactCompetitorMatch[] {
  const best = new Map<CompetitorSource, CompetitorCandidate>();

  for (const candidate of candidates) {
    if ((candidate.packaging ?? 'retail') !== 'retail') continue;
    if (!Number.isFinite(candidate.priceRub) || candidate.priceRub <= 0) continue;
    if (!isAllowedUrl(candidate) || !isExactVariant(product, candidate)) continue;

    const current = best.get(candidate.source);
    if (!current || candidate.priceRub < current.priceRub) best.set(candidate.source, candidate);
  }

  return (['randewoo', 'goldapple'] as const)
    .flatMap((source) => {
      const candidate = best.get(source);
      return candidate ? [{
        source,
        url: candidate.url,
        priceRub: candidate.priceRub,
        title: candidate.title,
        confidence: 1 as const,
      }] : [];
    });
}
