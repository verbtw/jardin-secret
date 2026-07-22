import {describe, expect, it, vi} from 'vitest';
import {
  OpenPerfumeDatasetProvider,
  buildArchiveImageUrl,
  parseCentralDirectory,
  parseOpenPerfumeCsv,
} from './open-perfume-dataset.js';

const csv = [
  'brand|name_perfume|family|subfamily|fragrances|ingredients|origin|gender|years|description|image_name',
  "Tom Ford|Oud Wood|WOODY|WOODY|Woody Spicy|['Oud', 'Sandalwood', 'Amber']|USA|Unisex|2007|An elegant woody fragrance.|oud-wood.jpg",
].join('\n');

describe('open perfume dataset', () => {
  it('maps a dataset row to structured fragrance data', () => {
    expect(parseOpenPerfumeCsv(csv)).toEqual([{
      brand: 'Tom Ford',
      name: 'Oud Wood',
      family: 'WOODY',
      accords: ['WOODY', 'Woody', 'Spicy'],
      ingredients: ['Oud', 'Sandalwood', 'Amber'],
      year: '2007',
      imageName: 'oud-wood.jpg',
    }]);
  });

  it('builds a public image URL containing the archive coordinates', () => {
    expect(buildArchiveImageUrl('https://shop.example/api/perfume-image', 'images/oud wood.jpg', {
      localHeaderOffset: 123,
      compressedSize: 456,
      uncompressedSize: 789,
      compressionMethod: 8,
    })).toBe('https://shop.example/api/perfume-image?offset=123&size=456&rawSize=789&method=8&name=images%2Foud+wood.jpg');
  });

  it('parses ZIP central-directory coordinates', () => {
    const name = Buffer.from('images/oud-wood.jpg');
    const entry = Buffer.alloc(46 + name.length);
    entry.writeUInt32LE(0x02014b50, 0);
    entry.writeUInt16LE(8, 10);
    entry.writeUInt32LE(456, 20);
    entry.writeUInt32LE(789, 24);
    entry.writeUInt16LE(name.length, 28);
    entry.writeUInt32LE(123, 42);
    name.copy(entry, 46);

    expect(parseCentralDirectory(entry).get('images/oud-wood.jpg')).toEqual({
      localHeaderOffset: 123,
      compressedSize: 456,
      uncompressedSize: 789,
      compressionMethod: 8,
    });
  });

  it('returns an exact fragrance with a range-backed image', async () => {
    const provider = new OpenPerfumeDatasetProvider({
      fetcher: vi.fn(async (input: string | URL | Request) => {
        const url = String(input);
        if (url.includes('perfumes.csv')) return new Response(csv);
        throw new Error(`Unexpected request: ${url}`);
      }) as unknown as typeof fetch,
      imageBaseUrl: 'https://shop.example/api/perfume-image',
      archiveEntries: new Map([['oud-wood.jpg', {
        localHeaderOffset: 123, compressedSize: 456, uncompressedSize: 789, compressionMethod: 8,
      }]]),
    });

    await expect(provider.search('Tom Ford Oud Wood')).resolves.toEqual([
      expect.objectContaining({
        Brand: 'Tom Ford',
        Name: 'Oud Wood',
        Year: '2007',
        'General Notes': ['Oud', 'Sandalwood', 'Amber'],
        'Image URL': expect.stringContaining('/api/perfume-image?'),
        'Source URL': 'https://huggingface.co/datasets/doevent/perfume',
      }),
    ]);
  });

  it('recognizes canonical supplier brand aliases', async () => {
    const aliasCsv = csv.replace('Tom Ford|Oud Wood', 'Christian Dior|Sauvage');
    const provider = new OpenPerfumeDatasetProvider({
      fetcher: vi.fn(async () => new Response(aliasCsv)) as unknown as typeof fetch,
      imageBaseUrl: 'https://shop.example/api/perfume-image',
      archiveEntries: new Map([['oud-wood.jpg', {
        localHeaderOffset: 1, compressedSize: 2, uncompressedSize: 3, compressionMethod: 8,
      }]]),
    });

    await expect(provider.search('Dior Sauvage', {brand: 'Dior', name: 'Sauvage'}))
      .resolves.toHaveLength(1);
  });
});
