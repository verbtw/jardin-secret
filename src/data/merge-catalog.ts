import type {Product} from '../types/product';

function normalize(value: string) {
  let result = value.normalize('NFKD');
  result = result.replace(/[\u0300-\u036f]/g, '');
  result = result.toLowerCase();
  result = result.replace(/&/g, ' and ');
  result = result.replace(/[^a-z0-9а-яё]+/gi, ' ');
  return result.trim();
}

const brandAliases: Record<string, string> = {
  'by kilian': 'kilian',
  'kilian paris': 'kilian',
};

function brandKey(value: string) {
  const normalized = normalize(value);
  return brandAliases[normalized] ?? normalized;
}

const ignoredNameTokens = new Set([
  'eau', 'de', 'parfum', 'toilette', 'edp', 'edt', 'edc', 'extrait', 'spray',
  'original', 'оригинал', 'unbox', 'unboxed',
]);

const genderTokens: Record<string, 'men' | 'women' | 'unisex'> = {
  man: 'men', men: 'men', male: 'men',
  woman: 'women', women: 'women', female: 'women',
  unisex: 'unisex',
};

function cleanNameTokens(value: string) {
  const tokens = normalize(value).split(' ').filter(Boolean);
  return tokens.filter((token, index) => {
    if (ignoredNameTokens.has(token) || token === 'ml' || token === 'мл') return false;
    if (/^\d+(?:ml|мл)$/.test(token)) return false;
    return !/^\d+$/.test(token) || !['ml', 'мл'].includes(tokens[index + 1] ?? '');
  });
}

function nameProfile(value: string) {
  const tokens = cleanNameTokens(value);
  const genders = [...new Set(tokens.map((token) => genderTokens[token]).filter(Boolean))];
  return {
    full: tokens.join(' '),
    generic: tokens.filter((token) => !genderTokens[token]).join(' '),
    gender: genders.length === 1 ? genders[0] : null,
  };
}

function sameConcentration(local: Product, remote: Product) {
  if (!local.concentration || !remote.concentration) return true;
  return normalize(local.concentration) === normalize(remote.concentration);
}

function sameFragranceName(local: Product, remote: Product) {
  const left = nameProfile(local.name);
  const right = nameProfile(remote.name);
  if (left.gender && right.gender && left.gender !== right.gender) return false;
  return left.full === right.full || left.generic === right.generic;
}

function matchingRemoteProduct(local: Product, remote: Product[]) {
  return remote.find((candidate) => brandKey(candidate.brand) === brandKey(local.brand)
    && sameConcentration(local, candidate)
    && sameFragranceName(local, candidate));
}

function enrichLocalProduct(local: Product, remote: Product[]) {
  const match = matchingRemoteProduct(local, remote);
  if (!match) return local;
  return {
    ...local,
    description: match.description,
    notes: match.notes,
    fragranceFamily: match.fragranceFamily,
    topNotes: match.topNotes,
    heartNotes: match.heartNotes,
    baseNotes: match.baseNotes,
    keyNotes: match.keyNotes,
    accords: match.accords,
    perfumers: match.perfumers,
    launchYear: match.launchYear,
    imageUrl: match.imageUrl,
    sourceUrl: match.sourceUrl,
  };
}

export function mergeCatalogProducts(local: Product[], remote: Product[]) {
  const remoteSlugs = new Set(remote.map((product) => product.slug));
  return [
    ...remote,
    ...local.filter((product) => !remoteSlugs.has(product.slug))
      .map((product) => enrichLocalProduct(product, remote)),
  ];
}
