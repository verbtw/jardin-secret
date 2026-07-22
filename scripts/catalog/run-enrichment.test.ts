import {expect, it, vi} from 'vitest';
import type {FragranceDetails} from './enrich-products.js';
import type {FragellaFragrance} from './fragella-client.js';
import {runProductEnrichment, type EnrichmentProfile, type EnrichmentRepository} from './run-enrichment.js';

class MemoryRepository implements EnrichmentRepository {
  saved: Array<{profile: EnrichmentProfile; details: FragranceDetails}> = [];
  reviewed: EnrichmentProfile[] = [];

  constructor(private readonly profiles: EnrichmentProfile[]) {}
  async listMissingProfiles(limit: number) { return this.profiles.slice(0, limit); }
  async saveVerifiedProfile(profile: EnrichmentProfile, details: FragranceDetails) {
    this.saved.push({profile, details});
    return 2;
  }
  async markProfileForReview(profile: EnrichmentProfile) { this.reviewed.push(profile); }
}

const record: FragellaFragrance = {
  _id: 'oud-wood', Brand: 'Tom Ford', Name: 'Oud Wood', Year: '2007',
  OilType: 'Eau de Parfum', 'Image URL': 'https://cdn.fragella.com/oud-wood.jpg',
  'Main Accords': ['woody'], 'General Notes': ['Oud'],
  Notes: {Top: ['Rosewood'], Middle: ['Oud'], Base: ['Sandalwood']},
};

it('enriches every volume variant of an exact fragrance profile', async () => {
  const profile = {brand: 'Tom Ford', name: 'Oud Wood', concentration: 'EDP'};
  const repo = new MemoryRepository([profile]);
  const provider = {search: vi.fn().mockResolvedValue([record])};

  await expect(runProductEnrichment({repo, provider, limit: 10})).resolves.toEqual({
    requested: 1, matched: 1, variantsVerified: 2, review: 0,
  });
  expect(provider.search).toHaveBeenCalledWith('Tom Ford Oud Wood');
  expect(repo.saved[0].details).toMatchObject({
    fragranceFamily: 'Древесные',
    topNotes: ['Палисандр'],
    heartNotes: ['Уд'],
    baseNotes: ['Сандал'],
    launchYear: 2007,
    imageUrl: 'https://cdn.fragella.com/oud-wood.jpg',
    sourceType: 'major_catalog',
  });
});

it('sends profiles without an exact complete match to review', async () => {
  const profile = {brand: 'Tom Ford', name: 'Oud Wood', concentration: 'EDT'};
  const repo = new MemoryRepository([profile]);
  const provider = {search: vi.fn().mockResolvedValue([record])};

  await expect(runProductEnrichment({repo, provider, limit: 10})).resolves.toEqual({
    requested: 1, matched: 0, variantsVerified: 0, review: 1,
  });
  expect(repo.reviewed).toEqual([profile]);
});

it('does not request profiles after the provider quota is exhausted', async () => {
  const repo = new MemoryRepository([{brand: 'Tom Ford', name: 'Oud Wood', concentration: 'EDP'}]);
  const list = vi.spyOn(repo, 'listMissingProfiles');
  const provider = {
    search: vi.fn(),
    remainingRequests: vi.fn().mockResolvedValue(0),
  };

  await expect(runProductEnrichment({repo, provider, limit: 20})).resolves.toEqual({
    requested: 0, matched: 0, variantsVerified: 0, review: 0,
  });
  expect(list).not.toHaveBeenCalled();
  expect(provider.search).not.toHaveBeenCalled();
});
