import {describe, expect, it, vi} from 'vitest';
import {
  buildRussianDescription,
  FragellaClient,
  selectFragellaMatch,
  type FragellaFragrance,
} from './fragella-client.js';

const oudWood: FragellaFragrance = {
  _id: 'oud-wood',
  Name: 'Oud Wood',
  Brand: 'Tom Ford',
  Year: '2007',
  OilType: 'Eau de Parfum',
  'Image URL': 'https://cdn.fragella.com/oud-wood.jpg',
  'General Notes': ['Oud', 'Sandalwood'],
  'Main Accords': ['woody', 'oud'],
  Notes: {Top: ['Rosewood'], Middle: ['Oud'], Base: ['Sandalwood', 'Amber']},
};

describe('selectFragellaMatch', () => {
  it('selects only an exact brand and fragrance name', () => {
    const result = selectFragellaMatch(
      {brand: 'Tom Ford', name: 'Oud Wood', concentration: 'EDP'},
      [{...oudWood, Name: 'Oud Wood Intense'}, oudWood],
    );
    expect(result).toBe(oudWood);
  });

  it('recognizes canonical brand aliases', () => {
    expect(selectFragellaMatch(
      {brand: 'Dior', name: 'Sauvage', concentration: 'EDT'},
      [{...oudWood, Brand: 'Christian Dior', Name: 'Sauvage', OilType: 'Eau de Toilette'}],
    )?.Name).toBe('Sauvage');
  });

  it('rejects a different concentration when the provider specifies one', () => {
    expect(selectFragellaMatch(
      {brand: 'Tom Ford', name: 'Oud Wood', concentration: 'EDT'},
      [oudWood],
    )).toBeNull();
  });
});

describe('buildRussianDescription', () => {
  it('builds a neutral original description from structured facts', () => {
    expect(buildRussianDescription(oudWood)).toBe(
      'Tom Ford Oud Wood — древесный аромат. В композиции раскрываются палисандр и уд, а завершение формируют сандал и амбра.',
    );
  });

  it('keeps a structured single-note description publishable', () => {
    const description = buildRussianDescription({
      ...oudWood, Brand: 'A', Name: 'B', Notes: undefined, 'General Notes': ['Iris'],
    });
    expect(description.length).toBeGreaterThanOrEqual(60);
    expect(description).toContain('ирис');
  });
});

it('reads the remaining provider quota', async () => {
  const fetcher = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({usage: {requests_remaining: 17}}),
  });
  const client = new FragellaClient('key', fetcher as unknown as typeof fetch, 'https://api.example/v1');
  await expect(client.remainingRequests()).resolves.toBe(17);
  expect(fetcher).toHaveBeenCalledWith(new URL('https://api.example/v1/usage'), {headers: {'x-api-key': 'key'}});
});
