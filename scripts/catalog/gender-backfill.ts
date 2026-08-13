import type {ProductGender} from '../../src/types/product.js';
import {selectFragellaMatch, type FragranceProfileQuery} from './fragella-client.js';
import {normalizeProductGender} from './gender.js';

export type GenderProfile = Pick<FragranceProfileQuery, 'brand' | 'name' | 'flanker'>;

export interface GenderBackfillRepository {
  listMissingGenderProfiles(limit: number): Promise<GenderProfile[]>;
  saveGenderAssignments(items: Array<{profile: GenderProfile; gender: Exclude<ProductGender, 'unknown'>}>): Promise<number>;
}

interface GenderBackfillProvider {
  search(query: string, profile: FragranceProfileQuery): ReturnType<{
    search: (query: string, profile: FragranceProfileQuery) => Promise<import('./fragella-client.js').FragellaFragrance[]>;
  }['search']>;
}

export async function runGenderBackfill({repo, provider, limit}: {
  repo: GenderBackfillRepository;
  provider: GenderBackfillProvider;
  limit: number;
}) {
  const profiles = await repo.listMissingGenderProfiles(limit);
  const assignments: Array<{profile: GenderProfile; gender: Exclude<ProductGender, 'unknown'>}> = [];
  for (const profile of profiles) {
    const queryProfile = {...profile, concentration: null};
    const fullName = [profile.name, profile.flanker].filter(Boolean).join(' ');
    const candidates = await provider.search(`${profile.brand} ${fullName}`, queryProfile);
    const match = selectFragellaMatch(queryProfile, candidates);
    const gender = normalizeProductGender(match?.Gender);
    if (gender !== 'unknown') assignments.push({profile, gender});
  }
  const updated = assignments.length ? await repo.saveGenderAssignments(assignments) : 0;
  return {requested: profiles.length, matched: assignments.length, updated};
}
