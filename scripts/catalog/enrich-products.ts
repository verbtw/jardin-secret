export type DetailsSourceType =
  | 'official_brand'
  | 'official_distributor'
  | 'major_catalog'
  | 'image_fallback';

export interface FragranceDetails {
  description: string;
  fragranceFamily: string;
  topNotes: string[];
  heartNotes: string[];
  baseNotes: string[];
  keyNotes: string[];
  perfumers: string[];
  launchYear: number | null;
  imageUrl: string;
  sourceUrl: string;
  sourceType: DetailsSourceType;
}

export type InvalidDetailsReason =
  | 'missing_description'
  | 'missing_family'
  | 'missing_notes'
  | 'missing_image'
  | 'invalid_image'
  | 'invalid_source';

export type DetailsValidation =
  | {valid: true}
  | {valid: false; reason: InvalidDetailsReason};

const sourcePriority: Record<DetailsSourceType, number> = {
  official_brand: 4,
  official_distributor: 3,
  major_catalog: 2,
  image_fallback: 1,
};

function isHttpsUrl(value: string) {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

function isAllowedDetailsSource(value: string) {
  if (!isHttpsUrl(value)) return false;
  const hostname = new URL(value).hostname.toLowerCase();
  return hostname !== 't.me'
    && !hostname.endsWith('.t.me')
    && hostname !== 'telegram.me'
    && !hostname.endsWith('.telegram.me');
}

export function validateDetails(details: FragranceDetails): DetailsValidation {
  if (details.description.trim().length < 60) return {valid: false, reason: 'missing_description'};
  if (!details.fragranceFamily.trim()) return {valid: false, reason: 'missing_family'};
  if (![...details.topNotes, ...details.heartNotes, ...details.baseNotes, ...details.keyNotes].some((note) => note.trim())) {
    return {valid: false, reason: 'missing_notes'};
  }
  if (!details.imageUrl.trim()) return {valid: false, reason: 'missing_image'};
  if (!isHttpsUrl(details.imageUrl)) return {valid: false, reason: 'invalid_image'};
  if (details.sourceType === 'image_fallback') return {valid: false, reason: 'invalid_source'};
  if (!isAllowedDetailsSource(details.sourceUrl)) return {valid: false, reason: 'invalid_source'};
  return {valid: true};
}

export function choosePreferredDetails(candidates: FragranceDetails[]) {
  return candidates
    .filter((candidate) => validateDetails(candidate).valid)
    .sort((left, right) => sourcePriority[right.sourceType] - sourcePriority[left.sourceType])[0] ?? null;
}
