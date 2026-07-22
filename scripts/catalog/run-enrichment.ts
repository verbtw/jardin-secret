import {
  buildRussianDescription,
  selectFragellaMatch,
  translateFamily,
  translateNote,
  type FragellaFragrance,
  type FragranceProfileQuery,
} from './fragella-client.js';
import {validateDetails, type FragranceDetails} from './enrich-products.js';

export type EnrichmentProfile = FragranceProfileQuery;

export interface EnrichmentRepository {
  listMissingProfiles(limit: number): Promise<EnrichmentProfile[]>;
  saveVerifiedProfile(profile: EnrichmentProfile, details: FragranceDetails): Promise<number>;
  markProfileForReview(profile: EnrichmentProfile): Promise<void>;
}

export interface EnrichmentProvider {
  search(query: string, profile?: EnrichmentProfile): Promise<FragellaFragrance[]>;
  remainingRequests?(): Promise<number>;
}

interface EnrichmentDependencies {
  repo: EnrichmentRepository;
  provider: EnrichmentProvider;
  limit: number;
}

function parseYear(value: string | undefined) {
  const year = Number(value);
  return Number.isInteger(year) && year >= 1700 && year <= 2200 ? year : null;
}

export function mapFragellaDetails(fragrance: FragellaFragrance): FragranceDetails {
  const imageUrl = fragrance['Image URL Transparent'] || fragrance['Image URL'] || '';
  const topNotes = (fragrance.Notes?.Top ?? []).map(translateNote);
  const heartNotes = (fragrance.Notes?.Middle ?? []).map(translateNote);
  const baseNotes = (fragrance.Notes?.Base ?? []).map(translateNote);
  const keyNotes = (fragrance['General Notes'] ?? []).map(translateNote);
  return {
    description: buildRussianDescription(fragrance),
    fragranceFamily: translateFamily(fragrance['Main Accords']?.[0] ?? ''),
    topNotes,
    heartNotes,
    baseNotes,
    keyNotes,
    perfumers: [],
    launchYear: parseYear(fragrance.Year),
    imageUrl,
    sourceUrl: fragrance['Source URL'] ?? `https://app.fragella.com/fragrance/${encodeURIComponent(fragrance._id)}`,
    sourceType: 'major_catalog',
  };
}

export async function runProductEnrichment({repo, provider, limit}: EnrichmentDependencies) {
  const summary = {requested: 0, matched: 0, variantsVerified: 0, review: 0};
  const remaining = provider.remainingRequests ? await provider.remainingRequests() : limit;
  const capacity = Math.min(limit, Math.max(0, Math.floor(remaining)));
  if (capacity === 0) return summary;
  const profiles = await repo.listMissingProfiles(capacity);
  for (const profile of profiles) {
    summary.requested += 1;
    const fullName = [profile.name, profile.flanker].filter(Boolean).join(' ');
    const candidates = await provider.search(`${profile.brand} ${fullName}`, profile);
    const matched = selectFragellaMatch(profile, candidates);
    const details = matched ? mapFragellaDetails(matched) : null;
    if (!details || !validateDetails(details).valid) {
      await repo.markProfileForReview(profile);
      summary.review += 1;
      continue;
    }
    summary.matched += 1;
    summary.variantsVerified += await repo.saveVerifiedProfile(profile, details);
  }
  return summary;
}
