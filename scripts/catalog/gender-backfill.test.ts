import {expect, it, vi} from 'vitest';
import {runGenderBackfill} from './gender-backfill.js';

it('persists only exact profiles with a known normalized gender', async () => {
  const profiles = [
    {brand: 'Tom Ford', name: 'Oud Wood', flanker: null},
    {brand: 'Unknown', name: 'Mystery', flanker: null},
  ];
  const repo = {
    listMissingGenderProfiles: vi.fn().mockResolvedValue(profiles),
    saveGenderAssignments: vi.fn().mockResolvedValue(12),
  };
  const provider = {search: vi.fn()
    .mockResolvedValueOnce([{_id: '1', Brand: 'Tom Ford', Name: 'Oud Wood', Gender: 'Unisex'}])
    .mockResolvedValueOnce([{_id: '2', Brand: 'Unknown', Name: 'Other', Gender: 'Female'}])};

  await expect(runGenderBackfill({repo, provider, limit: 100})).resolves.toEqual({
    requested: 2, matched: 1, updated: 12,
  });
  expect(repo.saveGenderAssignments).toHaveBeenCalledWith([
    {profile: profiles[0], gender: 'unisex'},
  ]);
});
