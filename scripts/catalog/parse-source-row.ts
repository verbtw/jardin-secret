import { brandAliases } from './brand-aliases.js';
import type { FragranceConcentration, ParseResult, ReviewReason } from './catalog-types.js';

const nonFragrance = [
  /(?:^|\s)(?:диффузор|свеча|шампунь|крем|лосьон|дезодорант|антиперспирант|гель\s+для\s+душа)(?=$|\s|[,;+()/])/i,
  /\b(?:diffuser|candle|shampoo|body\s+(?:cream|lotion|wash)|deodorant)\b/i,
];

const reviewPackaging: ReadonlyArray<readonly [pattern: RegExp, reason: ReviewReason]> = [
  [/(?:^|\s)(?:tester|тестер)(?=$|\s|[,;+()/])/i, 'tester'],
  [/(?:^|\s)(?:набор|set|coffret|gift\s*set)(?=$|\s|[,;+()/])/i, 'set'],
  [/(?:^|\s)(?:пробник|sample|vial|миниатюр\w*)(?=$|\s|[,;+()/])/i, 'sample'],
  [/(?:^|\s)(?:refill|recharge|запасн(?:ой|ый)\s+блок)(?=$|\s|[,;+()/])/i, 'refill'],
];

const concentrations: ReadonlyArray<readonly [pattern: RegExp, value: FragranceConcentration]> = [
  [/(?:^|\s)(?:extrait(?:\s+de\s+parfum)?|экстракт\s+духов)(?=$|\s|[,;+()/])/i, 'Extrait'],
  [/(?:^|\s)(?:eau\s+de\s+parfum|edp|парфюмерная\s+вода)(?=$|\s|[,;+()/])/i, 'EDP'],
  [/(?:^|\s)(?:eau\s+de\s+toilette|edt|туалетная\s+вода)(?=$|\s|[,;+()/])/i, 'EDT'],
  [/(?:^|\s)(?:eau\s+de\s+cologne|edc|одеколон)(?=$|\s|[,;+()/])/i, 'EDC'],
  [/(?:^|\s)(?:parfum|perfume|духи)(?=$|\s|[,;+()/])/i, 'Parfum'],
];

function normalize(value: string) {
  return value.normalize('NFKC').replace(/[’`]/g, "'").replace(/\s+/g, ' ').trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findBrand(value: string) {
  const lower = value.toLocaleLowerCase('ru-RU');
  return brandAliases.find(([alias]) => {
    const candidate = alias.toLocaleLowerCase('ru-RU');
    return lower === candidate || lower.startsWith(`${candidate} `);
  });
}

export function parseSourceRow(sourceRow: string): ParseResult {
  const normalized = normalize(sourceRow);

  if (nonFragrance.some((pattern) => pattern.test(normalized))) {
    return {kind: 'rejected', sourceRow, reason: 'non_fragrance'};
  }

  for (const [pattern, reason] of reviewPackaging) {
    if (pattern.test(normalized)) return {kind: 'review', sourceRow, reason};
  }

  const volumeMatch = normalized.match(/(\d+(?:[.,]\d+)?)\s*(?:ml|мл)(?=$|\s|[,;+()/])/i);
  if (!volumeMatch) return {kind: 'review', sourceRow, reason: 'missing_volume'};

  const brandMatch = findBrand(normalized);
  if (!brandMatch) return {kind: 'review', sourceRow, reason: 'unknown_brand'};

  const concentration = concentrations.find(([pattern]) => pattern.test(normalized))?.[1];
  if (!concentration) return {kind: 'review', sourceRow, reason: 'missing_concentration'};
  const concentrationPatterns = concentrations.map(([pattern]) => pattern.source).join('|');
  const name = normalized
    .replace(new RegExp(`^${escapeRegExp(brandMatch[0])}\\s+`, 'i'), '')
    .replace(new RegExp(concentrationPatterns, 'ig'), ' ')
    .replace(/\d+(?:[.,]\d+)?\s*(?:ml|мл)(?=$|\s|[,;+()/])/ig, ' ')
    .replace(/\b(?:spray|спрей|natural\s+spray|vaporisateur)\b/ig, ' ')
    .replace(/(?:^|\s)(?:m|w|u|м|ж)(?=$|\s|[,;+()/])/ig, ' ')
    .replace(/[()[\]{}]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    kind: 'fragrance',
    sourceRow,
    brand: brandMatch[1],
    name,
    flanker: null,
    concentration,
    volumeMl: Number(volumeMatch[1].replace(',', '.')),
  };
}
